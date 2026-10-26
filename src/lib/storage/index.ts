import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { randomToken } from "@/lib/crypto";
import { env, services } from "@/lib/env";

/**
 * Stockage des fichiers.
 * - local    : dossier `.data/uploads` (développement / démo). Public servi par /media/…,
 *              privé servi uniquement par les routes d'administration authentifiées.
 * - supabase : Supabase Storage (bucket public pour les médias, bucket privé pour les dossiers).
 */
export type Visibility = "public" | "private";

const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

export const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_DOCS = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_DOC_BYTES = 5 * 1024 * 1024;

/** Détection du type réel par signature binaire (on ne fait pas confiance au type annoncé). */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

function safeKey(folder: string, ext: string) {
  const clean = folder.replace(/[^a-z0-9/-]/gi, "").replace(/\.\./g, "");
  return `${clean}/${new Date().toISOString().slice(0, 7)}/${randomToken(12)}.${ext}`;
}

async function supabase() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, { auth: { persistSession: false } });
}

export async function putFile(visibility: Visibility, folder: string, data: Buffer, contentType: string, ext: string): Promise<{ key: string; url: string | null }> {
  const key = safeKey(folder, ext);
  if (services.storage === "supabase") {
    const client = await supabase();
    const bucket = visibility === "public" ? env.supabaseBucketPublic : env.supabaseBucketPrivate;
    const { error } = await client.storage.from(bucket).upload(key, data, { contentType, upsert: false, cacheControl: "31536000" });
    if (error) throw new Error(`Envoi du fichier impossible : ${error.message}`);
    const url = visibility === "public" ? client.storage.from(bucket).getPublicUrl(key).data.publicUrl : null;
    return { key, url };
  }
  const file = path.join(LOCAL_ROOT, visibility, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
  return { key, url: visibility === "public" ? `/media/${key}` : null };
}

export async function readFile(visibility: Visibility, key: string): Promise<Buffer | null> {
  if (key.includes("..")) return null;
  if (services.storage === "supabase") {
    const client = await supabase();
    const bucket = visibility === "public" ? env.supabaseBucketPublic : env.supabaseBucketPrivate;
    const { data, error } = await client.storage.from(bucket).download(key);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  const file = path.join(LOCAL_ROOT, visibility, key);
  if (!file.startsWith(path.join(LOCAL_ROOT, visibility))) return null;
  return fs.readFile(file).catch(() => null);
}

export async function removeFile(visibility: Visibility, key: string) {
  if (services.storage === "supabase") {
    const client = await supabase();
    await client.storage.from(visibility === "public" ? env.supabaseBucketPublic : env.supabaseBucketPrivate).remove([key]);
    return;
  }
  await fs.rm(path.join(LOCAL_ROOT, visibility, key), { force: true });
}

/**
 * Image publique optimisée : WebP, 2000 px max, métadonnées EXIF supprimées
 * (dont la géolocalisation), plus une miniature de 640 px.
 */
export async function putPublicImage(folder: string, file: File) {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image trop lourde (8 Mo maximum).");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !ALLOWED_IMAGE.includes(mime as never)) throw new Error("Format non accepté : JPEG, PNG ou WebP uniquement.");
  const sharp = (await import("sharp")).default;
  const img = sharp(buf, { failOn: "error" }).rotate();
  const meta = await img.metadata();
  const full = await img.clone().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const thumb = await img.clone().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  const main = await putFile("public", folder, full.data, "image/webp", "webp");
  const small = await putFile("public", `${folder}/miniatures`, thumb, "image/webp", "webp");
  return { url: main.url!, thumbUrl: small.url!, width: full.info.width ?? meta.width ?? null, height: full.info.height ?? meta.height ?? null };
}

export async function putPrivateDocument(folder: string, file: File) {
  if (file.size > MAX_DOC_BYTES) throw new Error("Document trop lourd (5 Mo maximum).");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !ALLOWED_DOCS.includes(mime as never)) throw new Error("Document non accepté : PDF, JPEG ou PNG uniquement.");
  const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : "jpg";
  const { key } = await putFile("private", folder, buf, mime, ext);
  return { key, mime, size: buf.length };
}

/* ------------------------------------------------------------------ */
/* Vidéos : fichiers volumineux, stockés en privé, servis par l'API    */
/* ------------------------------------------------------------------ */

export const ALLOWED_VIDEO: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
export const MAX_VIDEO_BYTES = Number(process.env.VIDEO_MAX_MB ?? 500) * 1024 * 1024;
const VIDEO_BUCKET = process.env.SUPABASE_BUCKET_VIDEOS ?? "videos";
const LOCAL_VIDEOS = path.join(LOCAL_ROOT, "videos");

export function sniffVideo(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") return buf.subarray(8, 12).toString("ascii").startsWith("qt") ? "video/quicktime" : "video/mp4";
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return "video/webm";
  return null;
}

export function newVideoKey(ext: string) {
  return `${new Date().toISOString().slice(0, 7)}/${randomToken(16)}.${ext}`;
}

function localVideoPath(key: string) {
  if (!/^[0-9]{4}-[0-9]{2}\/[A-Za-z0-9_-]+\.(mp4|webm|mov)$/.test(key)) throw new Error("Clé de fichier invalide.");
  return path.join(LOCAL_VIDEOS, key);
}

/** URL de téléversement direct (Supabase) — le fichier ne transite pas par le serveur. */
export async function supabaseVideoUploadUrl(key: string) {
  const client = await supabase();
  const { data, error } = await client.storage.from(VIDEO_BUCKET).createSignedUploadUrl(key);
  if (error || !data) throw new Error(`Préparation de l'envoi impossible : ${error?.message ?? "inconnue"}`);
  return data.signedUrl;
}

/** Écriture en flux d'une vidéo envoyée au serveur (stockage local). */
export async function writeLocalVideo(key: string, body: ReadableStream<Uint8Array>, maxBytes: number) {
  const file = localVideoPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const { createWriteStream } = await import("node:fs");
  const out = createWriteStream(file, { flags: "wx" });
  let total = 0;
  try {
    const reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("Fichier plus lourd que la taille annoncée.");
      if (!out.write(value)) await new Promise((r) => out.once("drain", r));
    }
    await new Promise<void>((res, rej) => out.end((e?: Error | null) => (e ? rej(e) : res())));
  } catch (e) {
    out.destroy();
    await fs.rm(file, { force: true });
    throw e;
  }
  return total;
}

/** Premiers octets et taille réelle d'une vidéo stockée (vérification du format). */
export async function inspectVideo(key: string): Promise<{ head: Buffer; size: number } | null> {
  if (services.storage === "supabase") {
    const client = await supabase();
    const { data } = await client.storage.from(VIDEO_BUCKET).createSignedUrl(key, 60);
    if (!data) return null;
    const res = await fetch(data.signedUrl, { headers: { Range: "bytes=0-31" } });
    if (!res.ok) return null;
    const total = Number(res.headers.get("content-range")?.split("/")[1] ?? 0);
    return { head: Buffer.from(await res.arrayBuffer()), size: total };
  }
  try {
    const file = localVideoPath(key);
    const stat = await fs.stat(file);
    const fh = await fs.open(file, "r");
    const head = Buffer.alloc(32);
    await fh.read(head, 0, 32, 0);
    await fh.close();
    return { head, size: stat.size };
  } catch {
    return null;
  }
}

export async function removeVideo(key: string) {
  if (services.storage === "supabase") {
    const client = await supabase();
    await client.storage.from(VIDEO_BUCKET).remove([key]);
    return;
  }
  await fs.rm(localVideoPath(key), { force: true }).catch(() => null);
}

/** Lecture (avec requêtes partielles pour la navigation dans la vidéo) ou téléchargement. */
export async function videoResponse(key: string, opts: { range: string | null; download: boolean; filename: string; mime: string }) {
  if (services.storage === "supabase") {
    const client = await supabase();
    const { data, error } = await client.storage.from(VIDEO_BUCKET).createSignedUrl(key, 3600, opts.download ? { download: opts.filename } : undefined);
    if (error || !data) return new Response("Fichier indisponible", { status: 404 });
    return Response.redirect(data.signedUrl, 302);
  }
  const file = localVideoPath(key);
  const stat = await fs.stat(file).catch(() => null);
  if (!stat) return new Response("Fichier indisponible", { status: 404 });
  const { createReadStream } = await import("node:fs");
  const { Readable } = await import("node:stream");
  const headers: Record<string, string> = {
    "Content-Type": opts.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  if (opts.download) headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(opts.filename)}`;
  const m = opts.range?.match(/^bytes=(\d*)-(\d*)$/);
  if (m && !opts.download) {
    const start = m[1] ? Number(m[1]) : Math.max(0, stat.size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
    if (start >= stat.size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) } });
  }
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { status: 200, headers: { ...headers, "Content-Length": String(stat.size) } });
}

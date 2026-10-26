import "server-only";
import { asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { putPublicImage } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";
import { tables, type FieldDef, type ResourceDef } from "./resources";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export const PAGE_SIZE = 25;

function col(def: ResourceDef, name: string): PgColumn {
  return (tables[def.table] as any)[name] as PgColumn;
}

export async function listRows(def: ResourceDef, opts: { q?: string; page?: number }) {
  const db = await getDb();
  const table = tables[def.table] as unknown as PgTable;
  const where: SQL | undefined = opts.q ? or(...def.search.map((f) => ilike(col(def, f), `%${opts.q!.slice(0, 80)}%`))) : undefined;
  const page = Math.max(1, opts.page ?? 1);
  const order = def.orderBy.desc ? desc(col(def, def.orderBy.column)) : asc(col(def, def.orderBy.column));
  const rows = (await db.select().from(table).where(where).orderBy(order).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE)) as Row[];
  const [{ n }] = await db.select({ n: count() }).from(table).where(where);
  return { rows, total: n, page, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)) };
}

export async function getRow(def: ResourceDef, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const [row] = (await db.select().from(tables[def.table] as unknown as PgTable).where(eq(col(def, "id"), id))) as Row[];
  return row ?? null;
}

export async function relationOptions(relation: NonNullable<FieldDef["relation"]>) {
  const db = await getDb();
  switch (relation) {
    case "editions":
      return (await db.select({ id: s.editions.id, l: s.editions.title }).from(s.editions).orderBy(desc(s.editions.number))).map((r) => ({ value: r.id, label: r.l }));
    case "categories":
      return (await db.select({ id: s.categories.id, l: s.categories.name }).from(s.categories).orderBy(asc(s.categories.sortOrder))).map((r) => ({ value: r.id, label: r.l }));
    case "schools":
      return (await db.select({ id: s.schools.id, l: s.schools.name, c: s.schools.city }).from(s.schools).orderBy(asc(s.schools.name))).map((r) => ({ value: r.id, label: `${r.l}${r.c ? ` (${r.c})` : ""}` }));
    case "candidates":
      return (
        await db
          .select({ id: s.candidates.id, f: s.candidates.firstName, n: s.candidates.lastName, t: s.candidates.teamName, y: s.editions.title })
          .from(s.candidates)
          .innerJoin(s.editions, eq(s.editions.id, s.candidates.editionId))
          .orderBy(desc(s.editions.number), asc(s.candidates.lastName))
      ).map((r) => ({ value: r.id, label: `${r.t ? `${r.t} — ` : ""}${r.f} ${r.n} (${r.y})` }));
    case "albums":
      return (await db.select({ id: s.albums.id, l: s.albums.title }).from(s.albums).orderBy(desc(s.albums.eventDate))).map((r) => ({ value: r.id, label: r.l }));
    case "partnerTiers":
      return (await db.select({ id: s.partnerTiers.id, l: s.partnerTiers.name }).from(s.partnerTiers).orderBy(asc(s.partnerTiers.rank))).map((r) => ({ value: r.id, label: r.l }));
  }
}

export async function allRelationOptions(def: ResourceDef) {
  const out: Record<string, { value: string; label: string }[]> = {};
  for (const f of def.fields) if (f.relation && !out[f.relation]) out[f.relation] = await relationOptions(f.relation);
  return out;
}

export function extractYoutubeId(input: string): string | null {
  const v = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  const m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* Sérialisation des champs structurés pour les formulaires ---------- */

export function toFormValue(field: FieldDef, value: unknown): string {
  if (value === null || value === undefined) return "";
  switch (field.type) {
    case "datetime":
      return value instanceof Date ? value.toISOString().slice(0, 16) : String(value).slice(0, 16);
    case "date":
      return String(value).slice(0, 10);
    case "steps":
      return (value as s.EditionStep[]).map((st) => [st.date ?? "", st.label, st.description ?? ""].join(" | ")).join("\n");
    case "criteria":
      return (value as s.EvaluationCriterion[]).map((c) => [c.label, c.weight ?? "", c.description ?? ""].join(" | ")).join("\n");
    case "lines":
      return (value as string[]).join("\n");
    default:
      return String(value);
  }
}

/* Lecture et validation d'un formulaire ------------------------------ */

export async function parseForm(def: ResourceDef, fd: FormData, user: SessionUser, existing: Row | null) {
  const values: Row = {};
  const errors: Record<string, string> = {};
  const relationIds = new Map<string, Set<string>>();

  for (const f of def.fields) {
    if (f.superOnly && user.role !== "super_admin") continue;
    const raw = fd.get(f.name);
    const str = typeof raw === "string" ? raw.trim() : "";
    switch (f.type) {
      case "boolean":
        values[f.name] = raw === "on";
        break;
      case "number":
        if (str === "") values[f.name] = null;
        else if (!/^-?\d+$/.test(str)) errors[f.name] = "Nombre entier attendu";
        else values[f.name] = Number(str);
        break;
      case "date":
        if (str && !/^\d{4}-\d{2}-\d{2}$/.test(str)) errors[f.name] = "Date invalide";
        values[f.name] = str || null;
        break;
      case "datetime": {
        if (!str) values[f.name] = null;
        else {
          // L'heure de Lomé correspond à l'UTC (GMT+0, sans heure d'été).
          const d = new Date(`${str.length === 16 ? `${str}:00` : str}Z`);
          if (Number.isNaN(d.getTime())) errors[f.name] = "Date et heure invalides";
          else values[f.name] = d;
        }
        break;
      }
      case "select":
        if (str && f.options && !f.options.some((o) => o.value === str)) errors[f.name] = "Valeur non autorisée";
        values[f.name] = str || null;
        break;
      case "relation": {
        if (str) {
          if (!relationIds.has(f.relation!)) relationIds.set(f.relation!, new Set((await relationOptions(f.relation!)).map((o) => o.value)));
          if (!relationIds.get(f.relation!)!.has(str)) errors[f.name] = "Élément introuvable";
        }
        values[f.name] = str || null;
        break;
      }
      case "url":
        if (str && !/^https?:\/\/[^\s]+$/i.test(str)) errors[f.name] = "Adresse web invalide (https://…)";
        values[f.name] = str || null;
        break;
      case "image": {
        const file = fd.get(`${f.name}__file`);
        const remove = fd.get(`${f.name}__remove`) === "on";
        if (file instanceof File && file.size > 0) {
          try {
            const img = await putPublicImage(def.key, file);
            values[f.name] = img.url;
            if (def.key === "media") Object.assign(values, { thumbUrl: img.thumbUrl, width: img.width, height: img.height });
          } catch (e) {
            errors[f.name] = (e as Error).message;
          }
        } else if (remove) values[f.name] = null;
        else if (str) {
          if (!/^(https?:\/\/|\/)/.test(str)) errors[f.name] = "Adresse d'image invalide";
          values[f.name] = str;
        } else values[f.name] = existing?.[f.name] ?? null;
        break;
      }
      case "steps":
        values[f.name] = str
          ? str.split("\n").map((line) => {
              const [date, label, description] = line.split("|").map((x) => x.trim());
              if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors[f.name] = `Date invalide dans « ${line.slice(0, 40)} » (format AAAA-MM-JJ)`;
              if (!label) errors[f.name] = "Chaque étape a besoin d'un libellé";
              return { date: date || undefined, label, description: description || undefined };
            })
          : [];
        break;
      case "criteria":
        values[f.name] = str
          ? str.split("\n").map((line) => {
              const [label, weight, description] = line.split("|").map((x) => x.trim());
              if (weight && !/^\d+$/.test(weight)) errors[f.name] = "Pondération : nombre entier attendu";
              return { label, weight: weight ? Number(weight) : undefined, description: description || undefined };
            })
          : [];
        break;
      case "lines":
        values[f.name] = str ? str.split("\n").map((l) => l.trim()).filter(Boolean) : [];
        break;
      default:
        if (f.max && str.length > f.max) errors[f.name] = `${f.max} caractères maximum`;
        values[f.name] = str || null;
    }
    if (f.required && (values[f.name] === null || values[f.name] === "" || values[f.name] === undefined) && !errors[f.name]) errors[f.name] = "Champ obligatoire";
  }

  // Champs particuliers
  if (def.key === "videos" || def.key === "testimonials") {
    if (values.youtubeId) {
      const id = extractYoutubeId(values.youtubeId);
      if (!id) errors.youtubeId = "Lien YouTube non reconnu";
      else values.youtubeId = id;
    }
    if (def.key === "videos" && values.provider === "youtube" && !values.youtubeId) errors.youtubeId = "Indiquez la vidéo YouTube";
    if (def.key === "videos" && values.provider === "fichier" && !values.fileUrl && !existing?.fileKey) errors.fileUrl = "Mettez le fichier en ligne ou indiquez son adresse";
  }
  if (def.key === "candidates" && !values.slug && values.firstName && values.lastName) {
    const db = await getDb();
    const [ed] = values.editionId ? await db.select({ y: s.editions.number }).from(s.editions).where(eq(s.editions.id, values.editionId)) : [];
    values.slug = slugify(`${values.firstName}-${values.lastName}-${ed?.y ?? ""}`);
  }
  if (def.key === "candidates" && values.slug) values.slug = slugify(values.slug);
  if (def.slugFrom && "slug" in values) {
    values.slug = slugify(values.slug || values[def.slugFrom] || "") || null;
    if (!values.slug) errors.slug = "Adresse invalide";
  }
  if (def.key === "results" && user.role === "super_admin") {
    if (values.published && !existing?.published) Object.assign(values, { validatedBy: user.id, validatedAt: new Date() });
    if (!values.published) Object.assign(values, { validatedBy: null, validatedAt: null });
  }
  if (def.key === "articles" && values.status === "publie" && !values.publishedAt) values.publishedAt = new Date();
  return { values, errors };
}

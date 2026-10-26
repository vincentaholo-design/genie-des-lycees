import { readFile } from "@/lib/storage";

/** Fichiers publics du stockage local (en production Supabase, les URL pointent directement vers le CDN). */
export async function GET(_: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.join("/");
  if (!/^[a-z0-9/_-]+\.(webp|jpg|jpeg|png)$/i.test(key)) return new Response("Introuvable", { status: 404 });
  const data = await readFile("public", key);
  if (!data) return new Response("Introuvable", { status: 404 });
  const ext = key.split(".").pop()!.toLowerCase();
  const type = ext === "webp" ? "image/webp" : ext === "png" ? "image/png" : "image/jpeg";
  return new Response(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}

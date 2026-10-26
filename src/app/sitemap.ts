import type { MetadataRoute } from "next";
import { listArticles, listCandidates, listEditions, listSchools, listAlbums, listVideos } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const statics = ["", "/a-propos", "/concours", "/concours/lycees", "/concours/universites", "/edition-en-cours", "/editions", "/etablissements", "/candidats", "/candidats/par-etablissement", "/vote", "/resultats", "/galerie", "/videos", "/temoignages", "/actualites", "/partenaires", "/faq", "/contact", "/inscription", "/confidentialite"];
  const [editions, candidates, schools, articles, albums, videos] = await Promise.all([listEditions(), listCandidates(), listSchools(), listArticles(), listAlbums(), listVideos()]);
  return [
    ...statics.map((p) => ({ url: `${site}${p}` })),
    ...editions.map((e) => ({ url: `${site}/editions/${e.slug}`, lastModified: e.updatedAt })),
    ...candidates.map((c) => ({ url: `${site}/candidats/${c.slug}` })),
    ...schools.map((s) => ({ url: `${site}/etablissements/${s.slug}`, lastModified: s.updatedAt })),
    ...articles.map((a) => ({ url: `${site}/actualites/${a.slug}`, lastModified: a.updatedAt })),
    ...albums.map((a) => ({ url: `${site}/galerie/${a.slug}` })),
    ...videos.map((v) => ({ url: `${site}/videos/${v.slug}` })),
  ];
}

import "server-only";
import { cache } from "react";
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";

/* Paramètres -------------------------------------------------------- */

export type HeroSettings = { imageUrl?: string; imageAlt?: string; imageCredit?: string; headline?: string; intro?: string };
export type AboutSettings = { mission?: string; motto?: string; vision?: string; objectives?: string[]; history?: string };
export type ContactSettings = { email?: string; phone?: string; address?: string; whatsapp?: string };
type SettingsMap = { hero: HeroSettings; about: AboutSettings; contact: ContactSettings };

export const getSetting = cache(async <K extends keyof SettingsMap>(key: K): Promise<SettingsMap[K]> => {
  const db = await getDb();
  const [row] = await db.select().from(s.siteSettings).where(eq(s.siteSettings.key, key));
  return (row?.value ?? {}) as SettingsMap[K];
});

/* Éditions ----------------------------------------------------------- */

export const getCurrentEdition = cache(async () => {
  const db = await getDb();
  const [row] = await db.select().from(s.editions).where(eq(s.editions.status, "en_cours")).limit(1);
  return row ?? null;
});

export const getEditionBySlug = cache(async (slug: string) => {
  const db = await getDb();
  const [row] = await db.select().from(s.editions).where(and(eq(s.editions.slug, slug), ne(s.editions.status, "brouillon")));
  return row ?? null;
});

export async function listEditions() {
  const db = await getDb();
  return db.select().from(s.editions).where(ne(s.editions.status, "brouillon")).orderBy(sql`${s.editions.number} desc nulls last`, sql`${s.editions.year} desc nulls last`);
}

export async function getAnnouncements(editionId: string) {
  const db = await getDb();
  return db
    .select()
    .from(s.announcements)
    .where(and(eq(s.announcements.editionId, editionId), eq(s.announcements.status, "publie")))
    .orderBy(desc(s.announcements.publishedAt));
}

export async function getEditionCounts(editionId: string) {
  const db = await getDb();
  const [c] = await db.select({ n: count() }).from(s.candidates).where(and(eq(s.candidates.editionId, editionId), eq(s.candidates.published, true)));
  const [sc] = await db.select({ n: count() }).from(s.editionSchools).where(eq(s.editionSchools.editionId, editionId));
  return { candidates: c.n, schools: sc.n };
}

/* Catégories -------------------------------------------------------- */

export const listCategories = cache(async () => {
  const db = await getDb();
  return db.select().from(s.categories).orderBy(asc(s.categories.sortOrder));
});

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  const [row] = await db.select().from(s.categories).where(eq(s.categories.slug, slug));
  return row ?? null;
}

/* Candidats ---------------------------------------------------------- */

const candidateColumns = {
  id: s.candidates.id,
  slug: s.candidates.slug,
  firstName: s.candidates.firstName,
  lastName: s.candidates.lastName,
  teamName: s.candidates.teamName,
  portraitUrl: s.candidates.portraitUrl,
  portraitFocus: s.candidates.portraitFocus,
  imageConsent: s.candidates.imageConsent,
  level: s.candidates.level,
  shortBio: s.candidates.shortBio,
  quote: s.candidates.quote,
  status: s.candidates.status,
  voteEnabled: s.candidates.voteEnabled,
  isDemo: s.candidates.isDemo,
  editionId: s.candidates.editionId,
  editionYear: s.editions.year,
  editionTitle: s.editions.title,
  editionSlug: s.editions.slug,
  categoryName: s.categories.name,
  categorySlug: s.categories.slug,
  schoolName: s.schools.name,
  schoolSlug: s.schools.slug,
  schoolCity: s.schools.city,
  schoolRegion: s.schools.region,
};

export type CandidateCard = Awaited<ReturnType<typeof listCandidates>>[number];

export async function listCandidates(filters: { editionId?: string; editionSlug?: string; category?: string; schoolId?: string; city?: string; q?: string; voteOnly?: boolean } = {}) {
  const db = await getDb();
  const where = [eq(s.candidates.published, true)];
  if (filters.editionId) where.push(eq(s.candidates.editionId, filters.editionId));
  if (filters.editionSlug) where.push(eq(s.editions.slug, filters.editionSlug));
  if (filters.category) where.push(eq(s.categories.slug, filters.category));
  if (filters.schoolId) where.push(eq(s.candidates.schoolId, filters.schoolId));
  if (filters.city) where.push(eq(s.schools.city, filters.city));
  if (filters.voteOnly) where.push(eq(s.candidates.voteEnabled, true), ne(s.candidates.status, "elimine"));
  if (filters.q) {
    const q = `%${filters.q.trim().slice(0, 60)}%`;
    where.push(
      or(
        ilike(s.candidates.firstName, q),
        ilike(s.candidates.lastName, q),
        ilike(s.candidates.teamName, q),
        ilike(s.schools.name, q),
        ilike(s.schools.city, q),
        sql`(${s.candidates.firstName} || ' ' || ${s.candidates.lastName}) ilike ${q}`,
      )!,
    );
  }
  return db
    .select(candidateColumns)
    .from(s.candidates)
    .innerJoin(s.editions, eq(s.editions.id, s.candidates.editionId))
    .innerJoin(s.categories, eq(s.categories.id, s.candidates.categoryId))
    .leftJoin(s.schools, eq(s.schools.id, s.candidates.schoolId))
    .where(and(...where))
    .orderBy(sql`${s.editions.number} desc nulls last`, asc(s.categories.sortOrder), asc(s.schools.name), asc(s.candidates.lastName));
}

export async function getCandidateBySlug(slug: string) {
  const db = await getDb();
  const [row] = await db
    .select({ ...candidateColumns, presentation: s.candidates.presentation, journey: s.candidates.journey, schoolId: s.candidates.schoolId })
    .from(s.candidates)
    .innerJoin(s.editions, eq(s.editions.id, s.candidates.editionId))
    .innerJoin(s.categories, eq(s.categories.id, s.candidates.categoryId))
    .leftJoin(s.schools, eq(s.schools.id, s.candidates.schoolId))
    .where(and(eq(s.candidates.slug, slug), eq(s.candidates.published, true)));
  if (!row) return null;
  const photos = await db.select().from(s.media).where(eq(s.media.candidateId, row.id)).orderBy(asc(s.media.sortOrder));
  const vids = await db.select().from(s.videos).where(and(eq(s.videos.candidateId, row.id), eq(s.videos.status, "publie")));
  return { ...row, photos, videos: vids };
}

/* Établissements ----------------------------------------------------- */

export async function listSchools(filters: { q?: string; region?: string; city?: string; editionId?: string; kind?: string } = {}) {
  const db = await getDb();
  const where = [eq(s.schools.published, true)];
  if (filters.region) where.push(eq(s.schools.region, filters.region));
  if (filters.city) where.push(eq(s.schools.city, filters.city));
  if (filters.kind) where.push(eq(s.schools.kind, filters.kind));
  if (filters.q) {
    const q = `%${filters.q.trim().slice(0, 60)}%`;
    where.push(or(ilike(s.schools.name, q), ilike(s.schools.city, q))!);
  }
  if (filters.editionId) {
    const ids = db.select({ id: s.editionSchools.schoolId }).from(s.editionSchools).where(eq(s.editionSchools.editionId, filters.editionId));
    where.push(inArray(s.schools.id, ids));
  }
  const rows = await db.select().from(s.schools).where(and(...where)).orderBy(asc(s.schools.region), asc(s.schools.name));
  const counts = await db
    .select({ schoolId: s.candidates.schoolId, n: count() })
    .from(s.candidates)
    .where(and(eq(s.candidates.published, true), isNotNull(s.candidates.schoolId), filters.editionId ? eq(s.candidates.editionId, filters.editionId) : sql`true`))
    .groupBy(s.candidates.schoolId);
  return rows.map((r) => ({ ...r, candidateCount: counts.find((c) => c.schoolId === r.id)?.n ?? 0 }));
}

export async function listSchoolFacets() {
  const db = await getDb();
  const rows = await db.selectDistinct({ city: s.schools.city, region: s.schools.region }).from(s.schools).where(eq(s.schools.published, true));
  return {
    cities: [...new Set(rows.map((r) => r.city).filter(Boolean) as string[])].sort(),
    regions: [...new Set(rows.map((r) => r.region).filter(Boolean) as string[])].sort(),
  };
}

export async function getSchoolBySlug(slug: string) {
  const db = await getDb();
  const [row] = await db.select().from(s.schools).where(and(eq(s.schools.slug, slug), eq(s.schools.published, true)));
  if (!row) return null;
  const cands = await listCandidates({ schoolId: row.id });
  const editionsJoined = await db
    .select({ year: s.editions.year, number: s.editions.number, slug: s.editions.slug, title: s.editions.title })
    .from(s.editionSchools)
    .innerJoin(s.editions, eq(s.editions.id, s.editionSchools.editionId))
    .where(and(eq(s.editionSchools.schoolId, row.id), ne(s.editions.status, "brouillon")))
    .orderBy(sql`${s.editions.number} desc nulls last`);
  return { ...row, candidates: cands, editions: editionsJoined };
}

/* Médias --------------------------------------------------------------- */

export async function listAlbums(filters: { editionId?: string; type?: string } = {}) {
  const db = await getDb();
  const where = [eq(s.albums.status, "publie")];
  if (filters.editionId) where.push(eq(s.albums.editionId, filters.editionId));
  if (filters.type) where.push(eq(s.albums.type, filters.type as never));
  const rows = await db
    .select({ album: s.albums, editionYear: s.editions.year, editionTitle: s.editions.title })
    .from(s.albums)
    .leftJoin(s.editions, eq(s.editions.id, s.albums.editionId))
    .where(and(...where))
    .orderBy(desc(s.albums.eventDate), asc(s.albums.sortOrder));
  const counts = await db.select({ albumId: s.media.albumId, n: count() }).from(s.media).groupBy(s.media.albumId);
  return rows.map((r) => ({ ...r.album, editionYear: r.editionYear, editionTitle: r.editionTitle, photoCount: counts.find((c) => c.albumId === r.album.id)?.n ?? 0 }));
}

export async function getAlbumBySlug(slug: string) {
  const db = await getDb();
  const [row] = await db
    .select({ album: s.albums, editionYear: s.editions.year, editionTitle: s.editions.title, editionSlug: s.editions.slug })
    .from(s.albums)
    .leftJoin(s.editions, eq(s.editions.id, s.albums.editionId))
    .where(and(eq(s.albums.slug, slug), eq(s.albums.status, "publie")));
  if (!row) return null;
  const photos = await db.select().from(s.media).where(eq(s.media.albumId, row.album.id)).orderBy(asc(s.media.sortOrder));
  return { ...row.album, editionYear: row.editionYear, editionTitle: row.editionTitle, editionSlug: row.editionSlug, photos };
}

export async function listRecentPhotos(limit = 8) {
  const db = await getDb();
  return db
    .select({ id: s.media.id, url: s.media.url, thumbUrl: s.media.thumbUrl, alt: s.media.alt, credit: s.media.credit, isDemo: s.media.isDemo, albumSlug: s.albums.slug, albumTitle: s.albums.title })
    .from(s.media)
    .innerJoin(s.albums, eq(s.albums.id, s.media.albumId))
    .where(eq(s.albums.status, "publie"))
    .orderBy(desc(s.albums.eventDate), asc(s.media.sortOrder), asc(s.albums.sortOrder))
    .limit(limit);
}

export async function listVideos(filters: { type?: string; editionId?: string; limit?: number } = {}) {
  const db = await getDb();
  const where = [eq(s.videos.status, "publie")];
  if (filters.type) where.push(eq(s.videos.type, filters.type as never));
  if (filters.editionId) where.push(eq(s.videos.editionId, filters.editionId));
  const q = db
    .select({ video: s.videos, editionYear: s.editions.year, editionTitle: s.editions.title, candidateFirst: s.candidates.firstName, candidateLast: s.candidates.lastName, candidateSlug: s.candidates.slug, schoolName: s.schools.name })
    .from(s.videos)
    .leftJoin(s.editions, eq(s.editions.id, s.videos.editionId))
    .leftJoin(s.candidates, eq(s.candidates.id, s.videos.candidateId))
    .leftJoin(s.schools, eq(s.schools.id, s.videos.schoolId))
    .where(and(...where))
    .orderBy(sql`${s.videos.publishedAt} desc nulls last`, desc(s.videos.createdAt));
  const rows = filters.limit ? await q.limit(filters.limit) : await q;
  return rows.map((r) => ({ ...r.video, editionYear: r.editionYear, editionTitle: r.editionTitle, candidateName: r.candidateFirst ? `${r.candidateFirst} ${r.candidateLast}` : null, candidateSlug: r.candidateSlug, schoolName: r.schoolName }));
}

export async function getVideoBySlug(slug: string) {
  const all = await listVideos();
  const video = all.find((v) => v.slug === slug);
  if (!video) return null;
  const similar = all
    .filter((v) => v.id !== video.id)
    .sort((a, b) => Number(b.type === video.type) - Number(a.type === video.type) || Number(b.editionId === video.editionId) - Number(a.editionId === video.editionId))
    .slice(0, 6);
  return { video, similar };
}

/* Contenus ------------------------------------------------------------ */

export async function listTestimonials(limit?: number) {
  const db = await getDb();
  const q = db.select().from(s.testimonials).where(eq(s.testimonials.status, "publie")).orderBy(asc(s.testimonials.sortOrder));
  return limit ? q.limit(limit) : q;
}

export async function listArticles(limit?: number) {
  const db = await getDb();
  const q = db
    .select()
    .from(s.articles)
    .where(and(eq(s.articles.status, "publie"), sql`${s.articles.publishedAt} <= now()`))
    .orderBy(desc(s.articles.publishedAt));
  return limit ? q.limit(limit) : q;
}

export async function getArticleBySlug(slug: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(s.articles)
    .where(and(eq(s.articles.slug, slug), eq(s.articles.status, "publie"), sql`${s.articles.publishedAt} <= now()`));
  return row ?? null;
}

export async function listPartners() {
  const db = await getDb();
  const tiers = await db.select().from(s.partnerTiers).orderBy(asc(s.partnerTiers.rank));
  const rows = await db.select().from(s.partners).where(eq(s.partners.published, true)).orderBy(asc(s.partners.sortOrder));
  return {
    tiers: tiers.map((t) => ({ ...t, partners: rows.filter((p) => p.tierId === t.id) })).filter((t) => t.partners.length),
    untiered: rows.filter((p) => !p.tierId),
    total: rows.length,
    tierNames: tiers.map((t) => t.name),
  };
}

export async function listFaqs() {
  const db = await getDb();
  return db.select().from(s.faqs).where(eq(s.faqs.published, true)).orderBy(asc(s.faqs.sortOrder));
}

export async function listPublishedResults(filters: { editionSlug?: string; category?: string; q?: string } = {}) {
  const db = await getDb();
  const where = [eq(s.results.published, true)];
  if (filters.editionSlug) where.push(eq(s.editions.slug, filters.editionSlug));
  if (filters.category) where.push(eq(s.categories.slug, filters.category));
  if (filters.q) {
    const q = `%${filters.q.trim().slice(0, 60)}%`;
    where.push(or(ilike(s.candidates.firstName, q), ilike(s.candidates.lastName, q), ilike(s.schools.name, q), ilike(s.candidates.teamName, q))!);
  }
  return db
    .select({
      id: s.results.id,
      rank: s.results.rank,
      distinction: s.results.distinction,
      note: s.results.note,
      isDemo: s.results.isDemo,
      editionYear: s.editions.year,
      editionTitle: s.editions.title,
      editionSlug: s.editions.slug,
      categoryName: s.categories.name,
      categorySlug: s.categories.slug,
      candidateFirst: s.candidates.firstName,
      candidateLast: s.candidates.lastName,
      candidateSlug: s.candidates.slug,
      teamName: s.candidates.teamName,
      portraitUrl: s.candidates.portraitUrl,
      imageConsent: s.candidates.imageConsent,
      schoolName: s.schools.name,
      schoolSlug: s.schools.slug,
    })
    .from(s.results)
    .innerJoin(s.editions, eq(s.editions.id, s.results.editionId))
    .leftJoin(s.categories, eq(s.categories.id, s.results.categoryId))
    .leftJoin(s.candidates, eq(s.candidates.id, s.results.candidateId))
    .leftJoin(s.schools, eq(s.schools.id, s.results.schoolId))
    .where(and(...where))
    .orderBy(sql`${s.editions.number} desc nulls last`, asc(s.categories.sortOrder), sql`${s.results.rank} asc nulls last`);
}

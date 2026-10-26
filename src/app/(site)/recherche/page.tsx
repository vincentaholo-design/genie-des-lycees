import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { CandidateCard } from "@/components/ui/CandidateCard";
import { VideoCard } from "@/components/ui/VideoCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { fullNav } from "@/config/nav";
import { listArticles, listCandidates, listSchools, listVideos } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Recherche", description: "Rechercher un candidat, un établissement, une vidéo, une actualité ou une page du site." };

type SP = { searchParams: Promise<Record<string, string | undefined>> };

/** Comparaison sans accents ni majuscules. */
const norm = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default async function SearchPage({ searchParams }: SP) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const nq = norm(q);

  const [candidates, schools, videos, articles] = q.length >= 2
    ? await Promise.all([listCandidates({ q }), listSchools({ q }), listVideos(), listArticles()])
    : [[], [], [], []];

  const matchedVideos = videos.filter((v) => norm(`${v.title} ${v.description ?? ""} ${v.editionTitle ?? ""}`).includes(nq)).slice(0, 6);
  const matchedArticles = articles.filter((a) => norm(`${a.title} ${a.excerpt ?? ""}`).includes(nq)).slice(0, 6);
  const pages = q.length >= 2
    ? [...new Map(fullNav.flatMap((g) => g.links).filter((l) => norm(l.label).includes(nq)).map((l) => [l.href, l])).values()]
    : [];
  const total = candidates.length + schools.length + matchedVideos.length + matchedArticles.length + pages.length;

  return (
    <>
      <PageHeader title="Rechercher" intro="Un candidat, un établissement, une vidéo, une actualité ou une page du site.">
        <form action="/recherche" role="search" className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
          <label htmlFor="q" className="sr-only">Votre recherche</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            autoFocus
            minLength={2}
            placeholder="Ex. : Kara, Lycée du Plateau, finale 2024…"
            className="min-h-14 flex-1 rounded-full bg-white px-6 text-encre placeholder:text-gris/80 focus:outline-none focus:ring-4 focus:ring-or/60"
          />
          <button type="submit" className="btn btn-or !min-h-14 !px-8">Rechercher</button>
        </form>
      </PageHeader>

      <div className="conteneur py-14 sm:py-20">
        {q.length < 2 ? (
          <p className="text-gris">Saisissez au moins deux caractères.</p>
        ) : total === 0 ? (
          <EmptyState title={`Aucun résultat pour « ${q} »`} action={{ href: "/candidats", label: "Voir tous les candidats" }}>
            Vérifiez l'orthographe ou essayez un nom d'école, une ville ou une année.
          </EmptyState>
        ) : (
          <div className="space-y-16">
            <p className="text-gris" aria-live="polite">
              {total} résultat{total > 1 ? "s" : ""} pour « <strong className="text-encre">{q}</strong> »
            </p>

            {pages.length > 0 && (
              <section>
                <h2 className="t-titre mb-5 text-2xl">Pages</h2>
                <ul className="flex flex-wrap gap-2">
                  {pages.map((l) => (
                    <li key={l.href}><Link href={l.href} className="pastille bg-ivoire-2 !px-4 !py-2 text-tribune hover:bg-ivoire-3">{l.label}</Link></li>
                  ))}
                </ul>
              </section>
            )}

            {candidates.length > 0 && (
              <section>
                <h2 className="t-titre mb-6 text-2xl">Candidats <span className="text-gris">({candidates.length})</span></h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {candidates.slice(0, 12).map((c) => <CandidateCard key={c.id} c={c} showEdition />)}
                </div>
                {candidates.length > 12 && (
                  <Link href={`/candidats?edition=toutes&q=${encodeURIComponent(q)}`} className="lien mt-6 inline-block font-semibold text-tribune">Voir les {candidates.length} candidats</Link>
                )}
              </section>
            )}

            {schools.length > 0 && (
              <section>
                <h2 className="t-titre mb-5 text-2xl">Établissements <span className="text-gris">({schools.length})</span></h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {schools.map((s) => (
                    <li key={s.id}>
                      <Link href={`/etablissements/${s.slug}`} className="carte block p-5 hover:ring-tribune/40">
                        <span className="t-sous-titre block text-lg">{s.name}</span>
                        <span className="text-sm text-gris">{[s.city, s.region].filter(Boolean).join(" · ")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {matchedVideos.length > 0 && (
              <section>
                <h2 className="t-titre mb-6 text-2xl">Vidéos <span className="text-gris">({matchedVideos.length})</span></h2>
                <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {matchedVideos.map((v) => <VideoCard key={v.id} v={v} />)}
                </div>
              </section>
            )}

            {matchedArticles.length > 0 && (
              <section>
                <h2 className="t-titre mb-5 text-2xl">Actualités <span className="text-gris">({matchedArticles.length})</span></h2>
                <ul className="divide-y divide-ivoire-3">
                  {matchedArticles.map((a) => (
                    <li key={a.id} className="py-4">
                      <Link href={`/actualites/${a.slug}`} className="group block">
                        <span className="text-sm text-gris">{formatDate(a.publishedAt)}</span>
                        <span className="t-sous-titre block text-lg group-hover:text-tribune">{a.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { CandidateCard } from "@/components/ui/CandidateCard";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Markdown } from "@/components/ui/Markdown";
import { PageHeader } from "@/components/ui/PageHeader";
import { Timeline } from "@/components/ui/Timeline";
import { Countdown } from "@/components/ui/Countdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { getAnnouncements, listCandidates, listCategories, listPublishedResults, listSchools } from "@/lib/queries";
import type { editions } from "@/lib/db/schema";
import { voteState, VOTE_STATE_LABELS } from "@/lib/vote/service";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ResultsTable } from "@/components/edition/ResultsTable";

type Edition = typeof editions.$inferSelect;

export async function EditionView({ edition, isCurrent }: { edition: Edition; isCurrent: boolean }) {
  const now = new Date();
  const [announcements, candidates, schools, categories, results] = await Promise.all([
    getAnnouncements(edition.id),
    listCandidates({ editionId: edition.id }),
    listSchools({ editionId: edition.id }),
    listCategories(),
    listPublishedResults({ editionSlug: edition.slug }),
  ]);
  const vstate = voteState(edition, now);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <>
      <PageHeader
        title={edition.title}
        intro={
          <>
            {edition.theme && <p className="t-citation text-2xl text-white sm:text-3xl">« {edition.theme} »</p>}
            {edition.summary && <p className="mt-4">{edition.summary}</p>}
          </>
        }
        aside={
          <div className="space-y-4 lg:w-80">
            <p className="flex flex-wrap items-center gap-2 text-sm text-white/80">
              {isCurrent ? "Édition en cours" : edition.status === "archivee" ? "Édition archivée" : ""}
              {edition.isDemo && <DemoBadge />}
            </p>
            {isCurrent && edition.countdownAt && edition.countdownAt > now && (
              <div>
                <p className="mb-2 text-sm text-white/80">{edition.countdownLabel ?? "Prochain rendez-vous"} dans</p>
                <div className="carte inline-block p-4 text-tribune"><Countdown target={edition.countdownAt.toISOString()} serverNow={now.toISOString()} compact /></div>
              </div>
            )}
          </div>
        }
      >
        <div className="mt-8 flex flex-wrap gap-3">
          {isCurrent && edition.registrationOpen && (
            <Link href="/inscription" className="btn btn-or btn-fleche">
              S'inscrire
            </Link>
          )}
          {isCurrent && vstate === "ouvert" && (
            <Link href="/vote" className="btn btn-blanc">
              <span className="point-direct" aria-hidden /> Voter
            </Link>
          )}
          <a href="#candidats" className="btn btn-contour">
            Candidats retenus
          </a>
        </div>
      </PageHeader>

      <nav aria-label="Sommaire de l'édition" className="conteneur mt-6">
        <ul className="flex gap-2 overflow-x-auto pb-1 text-sm font-semibold">
          {[
            ["#calendrier", "Calendrier"],
            ["#reglement", "Règlement"],
            ["#inscription", "Inscription"],
            ["#etablissements", "Établissements"],
            ["#candidats", "Candidats"],
            ["#annonces", "Annonces"],
            ["#resultats", "Résultats"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="pastille whitespace-nowrap bg-ivoire-2 !py-2 !text-sm text-encre hover:bg-ivoire-3">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="papier">
        <section id="calendrier" className="conteneur py-14 sm:py-20">
          <h2 className="t-titre mb-8 text-[clamp(2.2rem,5vw,3.8rem)]">Calendrier</h2>
          {edition.steps.length ? <Timeline steps={edition.steps} now={now} /> : <p className="text-gris">Le calendrier sera publié prochainement.</p>}
        </section>

        <section id="reglement" className="border-t border-ivoire-3">
          <div className="conteneur grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="t-titre mb-6 text-[clamp(2.2rem,5vw,3.8rem)]">Règlement</h2>
              {edition.rules ? <Markdown>{edition.rules}</Markdown> : <p className="text-gris">Le règlement de cette édition n'est pas encore publié.</p>}
            </div>
            <div>
              <h2 className="t-sous-titre mb-4 text-2xl">Critères du jury</h2>
              {edition.criteria.length ? (
                <ul className="divide-y divide-ivoire-3 border-y border-ivoire-3">
                  {edition.criteria.map((c) => (
                    <li key={c.label} className="py-4">
                      <p className="flex items-baseline justify-between gap-4 font-semibold">
                        {c.label}
                        {c.weight ? <span className="t-chiffre text-2xl text-tribune">{c.weight} %</span> : null}
                      </p>
                      {c.description && <p className="mt-1 text-[0.95rem] text-gris">{c.description}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gris">Les critères seront publiés avec le règlement.</p>
              )}
            </div>
          </div>
        </section>

        <section id="inscription" className="border-t border-ivoire-3">
          <div className="conteneur grid gap-8 py-14 sm:py-20 lg:grid-cols-[1fr_1.4fr]">
            <h2 className="t-titre text-[clamp(2.2rem,5vw,3.8rem)]">Modalités d'inscription</h2>
            <div>
              {edition.registrationInfo ? <Markdown>{edition.registrationInfo}</Markdown> : <p className="text-gris">Les modalités seront publiées à l'ouverture des inscriptions.</p>}
              <p className="mt-6 font-semibold">
                {edition.registrationOpen
                  ? `Inscriptions ouvertes${edition.registrationClosesAt ? ` jusqu'au ${formatDateTime(edition.registrationClosesAt)}` : ""}.`
                  : "Inscriptions fermées."}
              </p>
              {isCurrent && edition.registrationOpen && (
                <Link href="/inscription" className="btn btn-tribune mt-5">
                  Remplir le formulaire
                </Link>
              )}
            </div>
          </div>
        </section>

        <section id="etablissements" className="border-t border-ivoire-3">
          <div className="conteneur py-14 sm:py-20">
            <h2 className="t-titre mb-8 text-[clamp(2.2rem,5vw,3.8rem)]">Établissements inscrits</h2>
            {schools.length ? (
              <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
                {schools.map((sc) => (
                  <li key={sc.id} className="border-b border-ivoire-3">
                    <Link href={`/etablissements/${sc.slug}`} className="flex items-baseline justify-between gap-3 py-3 hover:text-tribune">
                      <span className="font-semibold">{sc.name}</span>
                      <span className="shrink-0 text-sm text-gris">{sc.city}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gris">La liste des établissements sera publiée après la clôture des inscriptions.</p>
            )}
          </div>
        </section>

        <section id="candidats" className="border-t border-ivoire-3">
          <div className="conteneur py-14 sm:py-20">
            <h2 className="t-titre mb-8 text-[clamp(2.2rem,5vw,3.8rem)]">Candidats retenus</h2>
            {categories.map((cat) => {
              const list = candidates.filter((c) => c.categorySlug === cat.slug);
              if (!list.length) return null;
              return (
                <div key={cat.id} className="mb-14 last:mb-0">
                  <h3 className="t-sous-titre mb-5 text-2xl">
                    {cat.name} <span className="text-gris">({list.length})</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
                    {list.map((c) => (
                      <CandidateCard key={c.id} c={c} />
                    ))}
                  </div>
                </div>
              );
            })}
            {!candidates.length && <EmptyState title="Pas encore de candidats retenus">La liste sera publiée après le casting de sélection.</EmptyState>}
          </div>
        </section>

        <section id="annonces" className="border-t border-ivoire-3">
          <div className="conteneur py-14 sm:py-20">
            <h2 className="t-titre mb-8 text-[clamp(2.2rem,5vw,3.8rem)]">Annonces</h2>
            {announcements.length ? (
              <ul className="max-w-3xl divide-y divide-ivoire-3 border-y border-ivoire-3">
                {announcements.map((a) => (
                  <li key={a.id} className="py-5">
                    <p className="flex items-center gap-2 text-sm text-gris">
                      {formatDate(a.publishedAt)} {a.isDemo && <DemoBadge />}
                    </p>
                    <p className="t-sous-titre mt-1 text-xl">{a.title}</p>
                    {a.body && <p className="mt-1 text-[0.98rem]">{a.body}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gris">Aucune annonce pour le moment.</p>
            )}
          </div>
        </section>

        <section id="resultats" className="border-t border-ivoire-3">
          <div className="conteneur py-14 sm:py-20">
            <h2 className="t-titre mb-8 text-[clamp(2.2rem,5vw,3.8rem)]">Résultats</h2>
            {results.length ? (
              <ResultsTable results={results} />
            ) : (
              <p className="text-gris">Les résultats officiels seront publiés ici après validation par l'organisation.</p>
            )}
            {isCurrent && (
              <p className="mt-6 text-sm text-gris">
                Vote du public : {VOTE_STATE_LABELS[vstate].toLowerCase()}
                {edition.voteClosesAt ? `, clôture le ${formatDateTime(edition.voteClosesAt)}` : ""}.
              </p>
            )}
          </div>
        </section>

        <div className="conteneur border-t border-ivoire-3 py-8">
          <ShareLinks url={`${siteUrl}/editions/${edition.slug}`} text={`Génie des Lycées ORATHON — ${edition.title}`} />
        </div>
      </div>
    </>
  );
}

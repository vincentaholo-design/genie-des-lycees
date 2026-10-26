import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { photos } from "@/config/media";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { VoteBoard } from "@/components/vote/VoteBoard";
import { getCurrentEdition, listCandidates } from "@/lib/queries";
import { publicResultsVisible, voteState, VOTE_STATE_LABELS } from "@/lib/vote/service";
import { voteService } from "@/lib/vote/server";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Vote du public", description: "Votez pour votre orateur préféré de l'édition en cours." };

const METHOD_TEXT = {
  code_email: "Vous recevez un code à 6 chiffres par e-mail pour confirmer. Une adresse ne vote qu'une fois par période : cela limite les abus, sans garantir qu'une même personne n'utilise pas plusieurs adresses.",
  code_sms: "Vous recevez un code à 6 chiffres par SMS pour confirmer. Un numéro ne vote qu'une fois par période : cela limite les abus, sans garantir qu'une même personne n'utilise pas plusieurs numéros.",
  leger: "Vote rapide sans inscription, avec une vérification anti-robot. Un vote par appareil et par période. Ce mode ne vérifie pas l'identité des votants.",
};

export default async function VotePage({ searchParams }: { searchParams: Promise<{ candidat?: string }> }) {
  const sp = await searchParams;
  const edition = await getCurrentEdition();
  if (!edition)
    return (
      <div className="conteneur py-24">
        <EmptyState title="Aucun vote en cours">Le vote du public ouvrira avec la prochaine édition.</EmptyState>
      </div>
    );
  const now = new Date();
  const state = voteState(edition, now);
  const candidates = await listCandidates({ editionId: edition.id, voteOnly: true });
  const showResults = publicResultsVisible(edition, now);
  const tally = showResults ? await (await voteService()).tally(edition.id) : [];
  const totalVotes = tally.reduce((a, t) => a + t.total, 0);

  return (
    <>
      <PageHeader
        title="Vote du public"
        image={photos.publicEnthousiaste}
        intro={
          <>
            <p className="flex flex-wrap items-center gap-3">
              {state === "ouvert" && <span className="point-direct" aria-hidden />}
              <strong className="font-semibold text-white">{VOTE_STATE_LABELS[state]}</strong>
              {edition.isDemo && <DemoBadge />}
            </p>
            <p className="mt-2">
              {edition.voteOpensAt && `Ouverture : ${formatDateTime(edition.voteOpensAt)}. `}
              {edition.voteClosesAt && `Clôture automatique : ${formatDateTime(edition.voteClosesAt)}.`}
            </p>
          </>
        }
      />
      <div className="papier">
        <section className="conteneur grid gap-8 border-b border-ivoire-3 py-10 lg:grid-cols-3">
          <div>
            <h2 className="mb-2 font-semibold">Comment voter</h2>
            <p className="text-gris">{edition.voteInstructions ?? "Choisissez un candidat puis confirmez votre vote."}</p>
          </div>
          <div>
            <h2 className="mb-2 font-semibold">Vérification</h2>
            <p className="text-gris">{METHOD_TEXT[edition.voteMethod]}</p>
          </div>
          <div>
            <h2 className="mb-2 font-semibold">Fréquence et résultats</h2>
            <p className="text-gris">
              {edition.voteScope === "une_fois_par_jour" ? "Un vote par jour pendant toute la période." : "Un seul vote pour toute l'édition."}{" "}
              {edition.resultsVisibility === "en_direct"
                ? "Les résultats s'affichent en direct."
                : edition.resultsVisibility === "apres_cloture"
                  ? "Les résultats du vote sont publiés après la clôture, pas avant."
                  : "Les résultats du vote ne sont pas publiés séparément."}{" "}
              Le poids du vote du public est fixé par le <Link href="/edition-en-cours#reglement" className="lien">règlement</Link>.
            </p>
          </div>
        </section>

        {showResults && tally.length > 0 && (
          <section className="conteneur border-b border-ivoire-3 py-12">
            <h2 className="t-titre mb-6 text-4xl">Résultats du vote du public</h2>
            <ol className="max-w-3xl space-y-3">
              {tally.map((t, i) => {
                const c = candidates.find((x) => x.id === t.candidateId);
                if (!c) return null;
                const pct = totalVotes ? Math.round((t.total / totalVotes) * 1000) / 10 : 0;
                return (
                  <li key={t.candidateId} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3">
                    <span className="t-chiffre text-3xl">{i + 1}</span>
                    <div>
                      <p className="font-semibold">{c.teamName ?? `${c.firstName} ${c.lastName}`}</p>
                      <div className="mt-1 h-2 rounded-full bg-ivoire-2">
                        <div className="h-2 rounded-full bg-tribune" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-sm tabular-nums text-gris">{pct} %</span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <section className="conteneur py-12">
          <h2 className="t-titre mb-8 text-[clamp(2.2rem,5vw,3.8rem)]">Les candidats</h2>
          {candidates.length ? (
            <VoteBoard
              editionId={edition.id}
              method={edition.voteMethod}
              open={state === "ouvert"}
              candidates={candidates.map((c) => ({ id: c.id, slug: c.slug, firstName: c.firstName, lastName: c.lastName, teamName: c.teamName, portraitUrl: c.portraitUrl, portraitFocus: c.portraitFocus, imageConsent: c.imageConsent, schoolName: c.schoolName, schoolSlug: c.schoolSlug, categoryName: c.categoryName }))}
              initialSlug={sp.candidat}
              turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            />
          ) : (
            <EmptyState title="Pas encore de candidats soumis au vote" />
          )}
        </section>
      </div>
    </>
  );
}

import Link from "next/link";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Portrait } from "@/components/ui/Portrait";
import type { listPublishedResults } from "@/lib/queries";

type R = Awaited<ReturnType<typeof listPublishedResults>>[number];

/** Palmarès : le lauréat en grand, les autres distinctions en liste. */
export function ResultsTable({ results, showEdition }: { results: R[]; showEdition?: boolean }) {
  const groups = new Map<string, R[]>();
  for (const r of results) {
    const key = `${r.editionTitle} · ${r.categoryName ?? "Toutes catégories"}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return (
    <div className="space-y-16">
      {[...groups.entries()].map(([key, rows]) => {
        const [winner, ...rest] = rows[0]?.rank === 1 ? rows : [undefined, ...rows];
        return (
          <section key={key}>
            <h3 className="mb-6 text-sm font-semibold text-gris">{showEdition ? key : key.split(" · ")[1]}</h3>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr]">
              {winner && (
                <div className="relative">
                  <Portrait firstName={winner.candidateFirst ?? "?"} lastName={winner.candidateLast ?? ""} portraitUrl={winner.portraitUrl} imageConsent={winner.imageConsent ?? false} className="rounded-lg" sizes="22rem" />
                  <p className="t-chiffre mt-4 text-6xl text-tribune">1</p>
                  <p className="t-sous-titre text-3xl">{winner.teamName ?? `${winner.candidateFirst} ${winner.candidateLast}`}</p>
                  <p className="mt-1 text-gris">{winner.distinction}</p>
                  <p className="text-sm text-gris">{winner.schoolName}</p>
                  {winner.candidateSlug && (
                    <Link href={`/candidats/${winner.candidateSlug}`} className="lien mt-3 inline-block text-sm font-semibold text-tribune">
                      Voir le profil
                    </Link>
                  )}
                </div>
              )}
              <ol className="divide-y divide-ivoire-3 self-start border-y border-ivoire-3">
                {rest.filter(Boolean).map((r) => (
                  <li key={r!.id} className="grid grid-cols-[3.5rem_1fr] items-baseline gap-4 py-4">
                    <span className="t-chiffre text-4xl text-encre/40">{r!.rank ?? "—"}</span>
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {r!.distinction} {r!.isDemo && <DemoBadge />}
                      </p>
                      <p className="text-gris">
                        {r!.candidateSlug ? (
                          <Link href={`/candidats/${r!.candidateSlug}`} className="hover:text-tribune">
                            {r!.teamName ?? `${r!.candidateFirst} ${r!.candidateLast}`}
                          </Link>
                        ) : null}
                        {r!.candidateSlug && r!.schoolName ? ", " : ""}
                        {r!.schoolSlug ? <Link href={`/etablissements/${r!.schoolSlug}`} className="hover:text-tribune">{r!.schoolName}</Link> : r!.schoolName}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        );
      })}
    </div>
  );
}

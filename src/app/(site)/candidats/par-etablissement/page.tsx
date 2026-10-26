import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Portrait } from "@/components/ui/Portrait";
import { getCurrentEdition, listCandidates, listEditions } from "@/lib/queries";

export const metadata: Metadata = { title: "Trombinoscope par établissement" };

type SP = { searchParams: Promise<{ edition?: string }> };

export default async function BySchoolPage({ searchParams }: SP) {
  const sp = await searchParams;
  const current = await getCurrentEdition();
  const editions = await listEditions();
  const slug = sp.edition ?? current?.slug ?? editions[0]?.slug;
  const list = await listCandidates({ editionSlug: slug });
  const groups = new Map<string, typeof list>();
  for (const c of list) {
    const key = c.schoolSlug ?? "_";
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const ordered = [...groups.values()].sort((a, b) => (a[0].schoolName ?? "").localeCompare(b[0].schoolName ?? "", "fr"));

  return (
    <>
      <PageHeader title="Par établissement" intro="Les visages de chaque école, réunis sur une même page." />
      <div className="papier">
        <div className="conteneur py-10">
          <nav aria-label="Choisir l'édition" className="flex flex-wrap gap-2">
            {editions.map((e) => (
              <Link key={e.id} href={`/candidats/par-etablissement?edition=${e.slug}`} aria-current={e.slug === slug ? "page" : undefined} className={`btn !min-h-10 !py-2 ${e.slug === slug ? "btn-tribune" : "btn-contour"}`}>
                {e.title}
              </Link>
            ))}
          </nav>
          <nav aria-label="Aller à un établissement" className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {ordered.map((g) => (
              <a key={g[0].schoolSlug} href={`#${g[0].schoolSlug}`} className="lien text-gris hover:text-encre">
                {g[0].schoolName}
              </a>
            ))}
          </nav>
        </div>
        {ordered.map((g) => (
          <section key={g[0].schoolSlug} id={g[0].schoolSlug ?? undefined} className="border-t border-ivoire-3">
            <div className="conteneur grid gap-6 py-10 lg:grid-cols-[18rem_1fr]">
              <div>
                <h2 className="t-sous-titre text-2xl">
                  <Link href={`/etablissements/${g[0].schoolSlug}`} className="hover:text-tribune">
                    {g[0].schoolName}
                  </Link>
                </h2>
                <p className="text-gris">
                  {g[0].schoolCity} · {g.length} {g.length > 1 ? "candidats" : "candidat"}
                </p>
              </div>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {g.map((c) => (
                  <li key={c.id}>
                    <Link href={`/candidats/${c.slug}`} className="group block">
                      <Portrait {...c} sizes="(min-width:1024px) 12vw, 30vw" className="rounded-md" />
                      <p className="mt-2 text-sm font-semibold leading-tight group-hover:text-tribune">{c.teamName ?? `${c.firstName} ${c.lastName}`}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

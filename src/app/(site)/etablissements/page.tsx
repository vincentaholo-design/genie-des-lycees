import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { photos } from "@/config/media";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { FilterField, Filters } from "@/components/ui/Filters";
import { listEditions, listSchoolFacets, listSchools } from "@/lib/queries";

export const metadata: Metadata = { title: "Établissements participants" };

type SP = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SchoolsPage({ searchParams }: SP) {
  const sp = await searchParams;
  const [facets, editions] = await Promise.all([listSchoolFacets(), listEditions()]);
  const edition = editions.find((e) => e.slug === sp.edition);
  const schools = await listSchools({ q: sp.q, region: sp.region || undefined, city: sp.ville || undefined, kind: sp.type || undefined, editionId: edition?.id });
  const byRegion = new Map<string, typeof schools>();
  for (const s of schools) byRegion.set(s.region ?? "Autre", [...(byRegion.get(s.region ?? "Autre") ?? []), s]);
  const active = Boolean(sp.q || sp.region || sp.ville || sp.type || sp.edition);

  return (
    <>
      <PageHeader title="Les établissements" intro="Lycées, universités et grandes écoles qui ont envoyé des orateurs au concours." image={photos.publicApplaudit} />
      <div className="papier">
        <div className="conteneur py-10 sm:py-14">
          <Filters action="/etablissements" resetHref="/etablissements" active={active}>
            <FilterField label="Nom ou ville" name="q" grow>
              <input id="f-q" name="q" type="search" defaultValue={sp.q} className="champ" />
            </FilterField>
            <FilterField label="Région" name="region">
              <select id="f-region" name="region" defaultValue={sp.region ?? ""} className="champ">
                <option value="">Toutes</option>
                {facets.regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </FilterField>
            <FilterField label="Ville" name="ville">
              <select id="f-ville" name="ville" defaultValue={sp.ville ?? ""} className="champ">
                <option value="">Toutes</option>
                {facets.cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </FilterField>
            <FilterField label="Type" name="type">
              <select id="f-type" name="type" defaultValue={sp.type ?? ""} className="champ">
                <option value="">Tous</option>
                <option value="lycee">Lycées</option>
                <option value="universite">Enseignement supérieur</option>
              </select>
            </FilterField>
            <FilterField label="Édition" name="edition">
              <select id="f-edition" name="edition" defaultValue={sp.edition ?? ""} className="champ">
                <option value="">Toutes</option>
                {editions.map((e) => <option key={e.id} value={e.slug}>{e.title}</option>)}
              </select>
            </FilterField>
          </Filters>

          {schools.length === 0 ? (
            <EmptyState className="mt-10" title="Aucun établissement trouvé" action={{ href: "/etablissements", label: "Voir tous les établissements" }} />
          ) : (
            [...byRegion.entries()].map(([region, list]) => (
              <section key={region} className="mt-12">
                <h2 className="t-titre mb-4 text-4xl">{region}</h2>
                <ul className="grid border-t border-ivoire-3 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
                  {list.map((s) => (
                    <li key={s.id} className="border-b border-ivoire-3">
                      <Link href={`/etablissements/${s.slug}`} className="group flex items-start justify-between gap-3 py-4">
                        <span>
                          <span className="t-sous-titre block text-xl group-hover:text-tribune">{s.name}</span>
                          <span className="text-sm text-gris">{s.city} {s.isDemo && <DemoBadge className="ml-1" />}</span>
                        </span>
                        <span className="t-chiffre text-3xl text-encre/30" aria-label={`${s.candidateCount} candidats`}>{s.candidateCount}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}

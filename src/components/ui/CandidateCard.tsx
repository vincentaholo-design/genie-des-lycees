import Link from "next/link";
import { Portrait } from "./Portrait";
import { DemoBadge } from "./DemoBadge";
import type { CandidateCard as C } from "@/lib/queries";

export const STATUS_LABELS: Record<string, string> = {
  inscrit: "Inscrit",
  retenu: "Retenu",
  demi_finaliste: "Demi-finaliste",
  finaliste: "Finaliste",
  laureat: "Lauréat",
  elimine: "Parcours terminé",
};

/** Carte candidat : portrait 4:5 arrondi, nom, établissement. Toute la carte est cliquable. */
export function CandidateCard({ c, showEdition, priority }: { c: C; showEdition?: boolean; priority?: boolean }) {
  const name = c.teamName ?? `${c.firstName} ${c.lastName}`;
  return (
    <article className="group relative">
      <Portrait {...c} priority={priority} className="rounded-[1.25rem] transition-transform duration-300 group-hover:-translate-y-1" />
      <div className="mt-3 space-y-0.5 px-1">
        <h3 className="t-sous-titre text-[1.05rem] sm:text-lg">
          <Link href={`/candidats/${c.slug}`} className="after:absolute after:inset-0 group-hover:text-tribune">
            {name}
          </Link>
        </h3>
        {c.teamName && <p className="text-sm text-gris">Menée par {c.firstName} {c.lastName}</p>}
        <p className="text-sm text-gris">
          {c.schoolName ?? "Établissement non renseigné"}
          {c.schoolCity ? `, ${c.schoolCity}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gris">
          <span className="rounded-full bg-ivoire-2 px-2 py-0.5 font-semibold text-tribune">{c.categoryName}</span>
          {showEdition && <span>{c.editionTitle}</span>}
          {c.status !== "retenu" && <span>{STATUS_LABELS[c.status]}</span>}
          {c.isDemo && <DemoBadge />}
        </div>
      </div>
    </article>
  );
}

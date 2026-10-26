import type { Metadata } from "next";
import { EditionView } from "@/components/edition/EditionView";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentEdition } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const e = await getCurrentEdition();
  return { title: e ? `${e.title}${e.theme ? ` — ${e.theme}` : ""}` : "Édition en cours" };
}

export default async function CurrentEditionPage() {
  const edition = await getCurrentEdition();
  if (!edition)
    return (
      <div className="conteneur py-24">
        <EmptyState title="Aucune édition en cours" action={{ href: "/editions", label: "Voir les éditions passées" }}>
          La prochaine édition sera annoncée ici dès son lancement.
        </EmptyState>
      </div>
    );
  return <EditionView edition={edition} isCurrent />;
}

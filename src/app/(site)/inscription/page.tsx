import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { photos } from "@/config/media";
import { EmptyState } from "@/components/ui/EmptyState";
import { InscriptionForm } from "@/components/forms/InscriptionForm";
import { getCurrentEdition, listCategories, listSchools } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Inscription", description: "Inscrivez-vous au concours Génie des Lycées ORATHON, catégorie Lycées ou Universités." };

export default async function InscriptionPage({ searchParams }: { searchParams: Promise<{ categorie?: string }> }) {
  const sp = await searchParams;
  const [edition, categories, schools] = await Promise.all([getCurrentEdition(), listCategories(), listSchools()]);
  const open = edition?.registrationOpen && (!edition.registrationClosesAt || edition.registrationClosesAt > new Date());
  return (
    <>
      <PageHeader
        title="Inscription"
        image={photos.orateurMicro}
        intro={
          open && edition ? (
            <>
              {edition.title}
              {edition.registrationClosesAt ? `, jusqu'au ${formatDateTime(edition.registrationClosesAt)}` : ""}. Comptez dix minutes. Seules les informations demandées par le règlement sont collectées.
            </>
          ) : (
            "Les inscriptions ne sont pas ouvertes pour le moment."
          )
        }
        aside={
          <Link href="/suivi" className="btn btn-contour">
            J'ai déjà un numéro de dossier
          </Link>
        }
      />
      <div className="papier">
        <div className="conteneur grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_18rem]">
          {open ? (
            <InscriptionForm
              categories={categories.map((c) => ({ slug: c.slug, name: c.name, shortDescription: c.shortDescription, teamMode: c.teamMode, teamSizeMin: c.teamSizeMin, teamSizeMax: c.teamSizeMax }))}
              schools={schools.map((s) => ({ id: s.id, name: s.name, city: s.city, kind: s.kind }))}
              initialCategory={sp.categorie}
            />
          ) : (
            <EmptyState title="Inscriptions fermées" action={{ href: "/actualites", label: "Suivre les annonces" }}>
              L'ouverture de la prochaine session sera annoncée sur le site et sur nos réseaux.
            </EmptyState>
          )}
          <aside className="space-y-6 text-[0.95rem] lg:sticky lg:top-28 lg:self-start">
            <div>
              <h2 className="mb-2 font-semibold">À préparer</h2>
              <ul className="list-disc space-y-1 pl-5 text-gris">
                <li>Coordonnées du candidat</li>
                <li>Établissement et classe</li>
                <li>Pour un mineur : nom et téléphone d'un parent ou tuteur</li>
                <li>Si possible : justificatif de scolarité</li>
              </ul>
            </div>
            <div>
              <h2 className="mb-2 font-semibold">Ensuite</h2>
              <p className="text-gris">L'équipe vérifie le dossier. Son statut se consulte à tout moment sur la page de suivi.</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

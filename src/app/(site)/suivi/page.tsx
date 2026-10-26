import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { TrackForm } from "@/components/forms/TrackForm";

export const metadata: Metadata = { title: "Suivre mon dossier", robots: { index: false } };

export default function SuiviPage() {
  return (
    <>
      <PageHeader title="Suivre mon dossier" intro="Le numéro de dossier s'affiche à la fin de l'inscription et figure dans l'e-mail de confirmation." />
      <div className="papier">
        <div className="conteneur py-14">
          <TrackForm />
        </div>
      </div>
    </>
  );
}

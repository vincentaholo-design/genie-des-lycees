import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Inscription envoyée", robots: { index: false } };

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ dossier?: string }> }) {
  const { dossier } = await searchParams;
  const clean = dossier && /^GDL\d{2}-[A-Z0-9]{5,6}$/.test(dossier) ? dossier : null;
  return (
    <section className="px-3 sm:px-4">
      <div className="scene rounded-[2rem]">
      <div className="conteneur pb-20 pt-32 sm:pb-28 sm:pt-36">
        <p className="t-voix text-[clamp(3rem,10vw,7rem)]">C'est envoyé.</p>
        {clean && (
          <div className="mt-10 inline-block rounded-[1.5rem] bg-white p-6 text-encre">
            <p className="text-sm text-gris">Votre numéro de dossier</p>
            <p className="t-chiffre mt-1 text-5xl tracking-wide text-tribune sm:text-6xl">{clean}</p>
            <p className="mt-2 text-sm text-gris">Notez-le ou faites une capture d'écran : il sert à suivre la candidature.</p>
          </div>
        )}
        <p className="mt-8 max-w-xl text-lg text-white/85">
          L'équipe des candidatures va vérifier le dossier. Si l'envoi d'e-mails est configuré, une confirmation vous parvient aussi par e-mail.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/suivi" className="btn btn-or btn-fleche">Suivre mon dossier</Link>
          <Link href="/concours" className="btn btn-blanc">Relire les règles</Link>
        </div>
      </div>
      </div>
    </section>
  );
}

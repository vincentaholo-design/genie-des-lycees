"use client";

import Link from "next/link";

export default function ErrorPage({ reset, error }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="projecteur flex min-h-[70dvh] items-center">
      <div className="conteneur py-20">
        <h1 className="t-voix text-[clamp(2.4rem,7vw,5rem)]">Micro coupé.</h1>
        <p className="mt-5 max-w-lg text-lg text-ivoire/80">
          Le serveur n'a pas pu afficher cette page. Réessayez ; si le problème continue, signalez-le avec la référence ci-dessous.
        </p>
        {error.digest && <p className="mt-3 text-sm text-fumee">Référence : {error.digest}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn btn-or">Réessayer</button>
          <Link href="/" className="btn btn-contour">Accueil</Link>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="projecteur flex min-h-dvh items-center">
      <div className="conteneur py-20">
        <p className="t-chiffre text-8xl text-or">404</p>
        <h1 className="t-voix mt-4 text-[clamp(2.6rem,8vw,6rem)]">Silence dans la salle.</h1>
        <p className="mt-5 max-w-lg text-lg text-ivoire/80">Cette page n'existe pas ou a été déplacée. Le lien est peut-être incomplet.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-or">Revenir à l'accueil</Link>
          <Link href="/candidats" className="btn btn-contour">Voir les candidats</Link>
        </div>
      </div>
    </main>
  );
}

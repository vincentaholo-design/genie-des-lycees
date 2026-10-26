import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { brand } from "@/config/media";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/admin");
  const { next } = await searchParams;
  const showDemo = env.demoMode && !process.env.DATABASE_URL;
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="projecteur hidden flex-col justify-between p-12 text-ivoire lg:flex">
        <Image src={brand.logoIvory} alt="Génie des Lycées" width={200} height={70} className="h-14 w-auto" />
        <p className="t-voix text-6xl">Les coulisses.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="t-titre text-5xl">Administration</h1>
          <p className="mt-2 text-gris">Accès réservé à l'équipe d'organisation.</p>
          <LoginForm next={next} />
          {showDemo && (
            <p className="mt-8 rounded-lg border border-dashed border-ivoire-3 p-4 text-sm text-gris">
              Base de démonstration locale : <strong>admin@demo.local</strong> / <strong>Demo-Orathon-2026</strong>. Ce compte n'existe pas sur une base de production.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

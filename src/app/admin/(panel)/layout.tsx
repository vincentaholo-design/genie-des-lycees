import Image from "next/image";
import Link from "next/link";
import { and, count, eq, isNull, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { can, ROLE_LABELS } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { logoutAction } from "@/lib/actions/admin";
import { AdminNav, type NavGroup } from "@/components/admin/AdminNav";
import { RESOURCES } from "@/lib/admin/resources";
import { brand } from "@/config/media";
import { env, services } from "@/lib/env";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const db = await getDb();
  const [{ n: pending }] = await db.select({ n: count() }).from(s.inscriptions).where(eq(s.inscriptions.status, "soumis"));
  const [{ n: unread }] = await db.select({ n: count() }).from(s.messages).where(eq(s.messages.handled, false));
  const [{ n: notif }] = await db
    .select({ n: count() })
    .from(s.notifications)
    .where(and(isNull(s.notifications.readAt), user.role === "super_admin" ? undefined : or(eq(s.notifications.role, user.role), eq(s.notifications.userId, user.id))));

  const res = (key: string) => RESOURCES.find((r) => r.key === key)!;
  const item = (key: string) => ({ href: `/admin/${key}`, label: res(key).label, perm: res(key).permission });
  type Item = NavGroup["items"][number] & { perm: Parameters<typeof can>[1] };
  const groups: { title: string; items: Item[] }[] = [
    { title: "Pilotage", items: [{ href: "/admin", label: "Tableau de bord", perm: "dashboard", badge: notif }] },
    { title: "Concours", items: [item("editions"), item("announcements"), item("categories"), { href: "/admin/inscriptions", label: "Inscriptions", perm: "inscriptions", badge: pending }, item("candidates"), item("schools")] },
    { title: "Vote et palmarès", items: [{ href: "/admin/vote", label: "Vote du public", perm: "vote" }, item("results")] },
    { title: "Contenus", items: [item("articles"), item("albums"), item("media"), item("videos"), { href: "/admin/televerser-video", label: "Mettre en ligne une vidéo", perm: "videos" }, item("testimonials"), item("partners"), item("partnerTiers"), item("faqs"), { href: "/admin/messages", label: "Messages", perm: "messages", badge: unread }] },
    { title: "Système", items: [{ href: "/admin/parametres", label: "Paramètres du site", perm: "settings" }, { href: "/admin/utilisateurs", label: "Utilisateurs et rôles", perm: "users" }, { href: "/admin/journal", label: "Journal d'audit", perm: "audit" }] },
  ];
  const visible = groups.map((g) => ({ title: g.title, items: g.items.filter((i) => can(user.role, i.perm, "read")).map(({ perm: _p, ...rest }) => rest) })).filter((g) => g.items.length);

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[16rem_1fr]">
      <aside className="scene p-4 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div className="mb-6 flex items-center justify-between gap-3 lg:block">
          <Link href="/admin"><Image src={brand.logoIvory} alt="Génie des Lycées — administration" width={120} height={42} className="h-9 w-auto" /></Link>
          <Link href="/" className="text-xs text-fumee hover:text-ivoire lg:mt-3 lg:block">Voir le site public</Link>
        </div>
        <AdminNav groups={visible} />
        <div className="mt-8 border-t border-salle-3 pt-4 text-sm">
          <p className="font-semibold">{user.name}</p>
          <p className="text-xs text-fumee">{ROLE_LABELS[user.role]}</p>
          <form action={logoutAction} className="mt-3">
            <button className="text-sm text-or underline underline-offset-4">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        {(env.demoMode || services.storage === "local") && (
          <p className="bg-tribune px-4 py-1.5 text-center text-xs text-white">
            {env.demoMode ? "Mode démonstration" : "Stockage local"} · base {services.database === "pglite" ? "embarquée (PGlite)" : "PostgreSQL"} · e-mail {services.email === "resend" ? "actif" : "non configuré"} · SMS {services.sms === "webhook" ? "actif" : "non configuré"} · anti-robot {services.captcha === "turnstile" ? "actif" : "non configuré"}
          </p>
        )}
        <div className="px-4 py-8 sm:px-8 lg:px-10">{children}</div>
      </div>
    </div>
  );
}

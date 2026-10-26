import { asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS, ROLES } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { AdminHeader } from "@/components/admin/ui";
import { UserForm } from "@/components/admin/UserForm";
import { saveUser } from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/utils";

const ROLE_HELP: Record<string, string> = {
  super_admin: "Tout, y compris utilisateurs, paramètres, publication des résultats et journal.",
  candidatures: "Inscriptions (lecture, décision, export), candidats, établissements.",
  editeur: "Actualités, médias, vidéos, témoignages, partenaires, FAQ, annonces, messages.",
  vote: "Pilotage et règles du vote, invalidations, préparation des résultats, exports.",
  statistiques: "Tableau de bord en lecture seule.",
};

export default async function UsersPage() {
  const me = await requireUser("users");
  const db = await getDb();
  const users = await db.select().from(s.users).orderBy(asc(s.users.name));
  return (
    <>
      <AdminHeader title="Utilisateurs et rôles" />
      <section className="mb-10 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r} className="rounded-xl bg-[#fffaf0] p-4 ring-1 ring-ivoire-3">
            <p className="font-semibold">{ROLE_LABELS[r]}</p>
            <p className="text-sm text-gris">{ROLE_HELP[r]}</p>
          </div>
        ))}
      </section>
      <div className="space-y-4">
        {users.map((u) => (
          <details key={u.id} className="rounded-xl bg-[#fffaf0] p-4 ring-1 ring-ivoire-3">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
              <span><strong>{u.name}</strong> <span className="text-gris">· {u.email}</span>{u.id === me.id && <span className="text-gris"> (vous)</span>}</span>
              <span className="text-sm text-gris">{ROLE_LABELS[u.role]}{u.active ? "" : " · désactivé"}{u.lastLoginAt ? ` · dernière connexion ${formatDateTime(u.lastLoginAt)}` : ""}</span>
            </summary>
            <div className="mt-4"><UserForm action={saveUser.bind(null, u.id)} values={{ email: u.email, name: u.name, role: u.role, active: u.active }} /></div>
          </details>
        ))}
        <details className="rounded-xl bg-[#fffaf0] p-4 ring-2 ring-tribune/40" open={users.length < 2}>
          <summary className="cursor-pointer font-semibold text-tribune">Ajouter un compte</summary>
          <div className="mt-4"><UserForm action={saveUser.bind(null, null)} values={{ email: "", name: "", role: "editeur", active: true }} isNew /></div>
        </details>
      </div>
    </>
  );
}

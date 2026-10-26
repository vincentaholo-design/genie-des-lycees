import Link from "next/link";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { AdminHeader, Notice, Pill, Stat, Table } from "@/components/admin/ui";
import { markNotificationsRead } from "@/lib/actions/admin";
import { voteState, VOTE_STATE_LABELS } from "@/lib/vote/service";
import { voteService } from "@/lib/vote/server";
import { INSCRIPTION_STATUS_LABELS } from "@/lib/inscriptions/validation";
import { formatDateTime } from "@/lib/utils";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("dashboard");
  const db = await getDb();
  const [edition] = await db.select().from(s.editions).where(eq(s.editions.status, "en_cours"));
  const edWhere = edition ? eq(s.inscriptions.editionId, edition.id) : undefined;

  const byStatus = await db.select({ status: s.inscriptions.status, n: count() }).from(s.inscriptions).where(edWhere).groupBy(s.inscriptions.status);
  const byCategory = await db.select({ name: s.categories.name, n: count() }).from(s.inscriptions).innerJoin(s.categories, eq(s.categories.id, s.inscriptions.categoryId)).where(edWhere).groupBy(s.categories.name);
  const totalIns = byStatus.reduce((a, b) => a + b.n, 0);
  const [{ n: candidates }] = await db.select({ n: count() }).from(s.candidates).where(edition ? eq(s.candidates.editionId, edition.id) : undefined);
  const [{ n: schools }] = await db.select({ n: count() }).from(s.editionSchools).where(edition ? eq(s.editionSchools.editionId, edition.id) : undefined);
  const [{ n: draftTestimonials }] = await db.select({ n: count() }).from(s.testimonials).where(eq(s.testimonials.status, "brouillon"));
  const [{ n: draftArticles }] = await db.select({ n: count() }).from(s.articles).where(eq(s.articles.status, "brouillon"));
  const [{ n: unpublishedResults }] = await db.select({ n: count() }).from(s.results).where(eq(s.results.published, false));
  const [{ n: messages }] = await db.select({ n: count() }).from(s.messages).where(eq(s.messages.handled, false));
  const recent = can(user.role, "inscriptions")
    ? await db.select({ i: s.inscriptions, cat: s.categories.name }).from(s.inscriptions).innerJoin(s.categories, eq(s.categories.id, s.inscriptions.categoryId)).orderBy(desc(s.inscriptions.createdAt)).limit(6)
    : [];
  const vstats = edition ? await (await voteService()).stats(edition.id) : null;
  const notifs = await db
    .select()
    .from(s.notifications)
    .where(and(isNull(s.notifications.readAt), user.role === "super_admin" ? undefined : or(eq(s.notifications.role, user.role), eq(s.notifications.userId, user.id))))
    .orderBy(desc(s.notifications.createdAt))
    .limit(8);

  return (
    <>
      <AdminHeader title={`Bonjour ${user.name.split(" ")[0]}`} />
      {sp.refus && <Notice tone="err">Cette section n'est pas accessible avec votre rôle.</Notice>}
      {edition ? (
        <p className="mb-6 text-gris">
          Édition en cours : <strong className="text-encre">{edition.title}</strong> · inscriptions {edition.registrationOpen ? "ouvertes" : "fermées"} · {VOTE_STATE_LABELS[voteState(edition, new Date())].toLowerCase()}
        </p>
      ) : (
        <Notice tone="info">Aucune édition « en cours ». Créez-en une dans Éditions.</Notice>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Inscriptions (édition)" value={totalIns} href={can(user.role, "inscriptions") ? "/admin/inscriptions" : undefined} sub={byCategory.map((c) => `${c.name} : ${c.n}`).join(" · ") || "—"} />
        <Stat label="À traiter" value={byStatus.find((b) => b.status === "soumis")?.n ?? 0} href={can(user.role, "inscriptions") ? "/admin/inscriptions?statut=soumis" : undefined} sub="dossiers reçus non ouverts" />
        <Stat label="Candidats" value={candidates} sub={`${schools} établissements`} />
        <Stat label="Votes valides" value={vstats?.valid ?? 0} href={can(user.role, "vote") ? "/admin/vote" : undefined} sub={vstats ? `${vstats.invalid} invalidé(s)` : undefined} />
      </div>

      <div className="mt-10 grid gap-10 xl:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="t-sous-titre mb-4 text-2xl">Inscriptions par statut</h2>
          <ul className="space-y-2">
            {Object.entries(INSCRIPTION_STATUS_LABELS).map(([k, label]) => {
              const n = byStatus.find((b) => b.status === k)?.n ?? 0;
              return (
                <li key={k} className="grid grid-cols-[12rem_1fr_3rem] items-center gap-3 text-sm">
                  <span>{label}</span>
                  <span className="h-2 rounded-full bg-ivoire-2"><span className="block h-2 rounded-full bg-tribune" style={{ width: `${totalIns ? (n / totalIns) * 100 : 0}%` }} /></span>
                  <span className="text-right tabular-nums">{n}</span>
                </li>
              );
            })}
          </ul>
          {recent.length > 0 && (
            <>
              <h2 className="t-sous-titre mb-4 mt-10 text-2xl">Dernières candidatures</h2>
              <Table head={["Dossier", "Candidat", "Catégorie", "Statut", "Reçu le"]}>
                {recent.map(({ i, cat }) => (
                  <tr key={i.id}>
                    <td className="whitespace-nowrap px-4 py-3"><Link href={`/admin/inscriptions/${i.id}`} className="font-semibold hover:text-tribune">{i.dossierNumber}</Link></td>
                    <td className="px-4 py-3">{i.firstName} {i.lastName}</td>
                    <td className="px-4 py-3">{cat}</td>
                    <td className="px-4 py-3"><Pill>{INSCRIPTION_STATUS_LABELS[i.status]}</Pill></td>
                    <td className="px-4 py-3">{formatDateTime(i.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            </>
          )}
        </section>
        <section className="space-y-8">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="t-sous-titre text-2xl">Notifications</h2>
              {notifs.length > 0 && <form action={markNotificationsRead}><button className="text-sm text-tribune underline">Tout marquer comme lu</button></form>}
            </div>
            {notifs.length ? (
              <ul className="divide-y divide-ivoire-3 rounded-xl bg-[#fffaf0] ring-1 ring-ivoire-3">
                {notifs.map((n) => (
                  <li key={n.id} className="px-4 py-3 text-sm">
                    {n.link ? <Link href={n.link} className="hover:text-tribune">{n.message}</Link> : n.message}
                    <span className="block text-xs text-gris">{formatDateTime(n.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gris">Aucune notification non lue.</p>
            )}
          </div>
          <div>
            <h2 className="t-sous-titre mb-3 text-2xl">En attente</h2>
            <ul className="space-y-2 text-sm">
              <li>Témoignages à valider : <strong>{draftTestimonials}</strong></li>
              <li>Articles en brouillon : <strong>{draftArticles}</strong></li>
              <li>Résultats non publiés : <strong>{unpublishedResults}</strong></li>
              <li>Messages non traités : <strong>{messages}</strong></li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}

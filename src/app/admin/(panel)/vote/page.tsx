import { desc, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { AdminHeader, Notice, Pill, Stat, Table } from "@/components/admin/ui";
import { VoteControls, VoteSettingsForm, InvalidateForm } from "@/components/admin/VoteAdmin";
import { invalidateVoteAction, saveVoteSettings, voteControl } from "@/lib/actions/admin";
import { voteState, VOTE_STATE_LABELS, publicResultsVisible } from "@/lib/vote/service";
import { voteService } from "@/lib/vote/server";
import { services } from "@/lib/env";
import { formatDateTime } from "@/lib/utils";

export default async function VoteAdmin({ searchParams }: { searchParams: Promise<{ edition?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("vote");
  const db = await getDb();
  const editions = await db.select().from(s.editions).orderBy(sql`${s.editions.number} desc nulls last`);
  const edition = editions.find((e) => e.id === sp.edition) ?? editions.find((e) => e.status === "en_cours") ?? editions[0];
  if (!edition) return <Notice tone="info">Aucune édition.</Notice>;
  const svc = await voteService();
  const [stats, tally] = await Promise.all([svc.stats(edition.id), svc.tally(edition.id)]);
  const cands = await db.select({ id: s.candidates.id, f: s.candidates.firstName, l: s.candidates.lastName, t: s.candidates.teamName, school: s.schools.name }).from(s.candidates).leftJoin(s.schools, eq(s.schools.id, s.candidates.schoolId)).where(eq(s.candidates.editionId, edition.id));
  const nameOf = (id: string) => { const c = cands.find((x) => x.id === id); return c ? c.t ?? `${c.f} ${c.l}` : "?"; };
  const recentVotes = await db.select({ v: s.votes, inv: s.voteInvalidations }).from(s.votes).leftJoin(s.voteInvalidations, eq(s.voteInvalidations.voteId, s.votes.id)).where(eq(s.votes.editionId, edition.id)).orderBy(desc(s.votes.createdAt)).limit(40);
  const events = await db.select().from(s.voteEvents).where(eq(s.voteEvents.editionId, edition.id)).orderBy(desc(s.voteEvents.createdAt)).limit(40);
  const state = voteState(edition, new Date());
  const canWrite = can(user.role, "vote", "write");
  const methodReady = edition.voteMethod === "code_email" ? services.email === "resend" : edition.voteMethod === "code_sms" ? services.sms === "webhook" : services.captcha === "turnstile";

  return (
    <>
      <AdminHeader title="Vote du public">
        <form className="flex gap-2">
          <select name="edition" defaultValue={edition.id} aria-label="Édition" className="champ !min-h-10 !py-2">
            {editions.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <button className="btn btn-contour !min-h-10 !py-2">Afficher</button>
        </form>
        {can(user.role, "vote", "export") && (
          <>
            <a className="btn btn-contour" href={`/admin/export/vote-resultats?edition=${edition.id}`}>Exporter les résultats</a>
            <a className="btn btn-contour" href={`/admin/export/vote-journal?edition=${edition.id}`}>Exporter le journal</a>
          </>
        )}
      </AdminHeader>

      {!methodReady && (
        <Notice tone="err">
          {edition.voteMethod === "code_email" && "Aucun service d'e-mail n'est configuré (RESEND_API_KEY). "}
          {edition.voteMethod === "code_sms" && "Aucun fournisseur SMS n'est configuré (SMS_WEBHOOK_URL). "}
          {edition.voteMethod === "leger" && "La vérification anti-robot n'est pas configurée (Turnstile). "}
          En mode démonstration, les codes s'affichent à l'écran ; en production, le vote est refusé tant que ce service manque.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="État" value={<span className="text-3xl">{VOTE_STATE_LABELS[state]}</span>} sub={`Statut manuel : ${edition.voteStatus}`} />
        <Stat label="Votes valides" value={stats.valid} />
        <Stat label="Invalidés" value={stats.invalid} />
        <Stat label="Résultats publics" value={<span className="text-3xl">{publicResultsVisible(edition, new Date()) ? "Visibles" : "Masqués"}</span>} sub={edition.resultsVisibility.replace("_", " ")} />
      </div>

      {canWrite && <VoteControls action={voteControl.bind(null, edition.id)} state={state} />}

      <div className="mt-10 grid gap-10 xl:grid-cols-2">
        <section>
          <h2 className="t-sous-titre mb-4 text-2xl">Décompte (administration)</h2>
          <Table head={["#", "Candidat", "Votes valides"]} empty={!tally.length}>
            {tally.map((t, i) => (
              <tr key={t.candidateId}>
                <td className="px-4 py-2 tabular-nums">{i + 1}</td>
                <td className="px-4 py-2">{nameOf(t.candidateId)}</td>
                <td className="px-4 py-2 tabular-nums font-semibold">{t.total}</td>
              </tr>
            ))}
          </Table>
          <p className="mt-2 text-xs text-gris">Calculé en base à chaque affichage. Les suffrages ne peuvent être ni modifiés ni supprimés ; une invalidation est ajoutée à part, avec son motif.</p>
        </section>
        {canWrite && (
          <section>
            <h2 className="t-sous-titre mb-4 text-2xl">Règles du vote</h2>
            <VoteSettingsForm
              action={saveVoteSettings.bind(null, edition.id)}
              values={{
                voteMethod: edition.voteMethod,
                voteScope: edition.voteScope,
                resultsVisibility: edition.resultsVisibility,
                voteOpensAt: edition.voteOpensAt?.toISOString().slice(0, 16) ?? "",
                voteClosesAt: edition.voteClosesAt?.toISOString().slice(0, 16) ?? "",
                voteInstructions: edition.voteInstructions ?? "",
                voteRequireCaptcha: edition.voteRequireCaptcha,
              }}
            />
          </section>
        )}
      </div>

      <section className="mt-12">
        <h2 className="t-sous-titre mb-4 text-2xl">Derniers suffrages</h2>
        <Table head={["Date", "Candidat", "Méthode", "Votant (empreinte)", "IP (empreinte)", "État", ""]} empty={!recentVotes.length}>
          {recentVotes.map(({ v, inv }) => (
            <tr key={v.id}>
              <td className="whitespace-nowrap px-4 py-2">{formatDateTime(v.createdAt)}</td>
              <td className="px-4 py-2">{nameOf(v.candidateId)}</td>
              <td className="px-4 py-2">{v.method}</td>
              <td className="px-4 py-2 font-mono text-xs">{v.voterKey.slice(0, 10)}…</td>
              <td className="px-4 py-2 font-mono text-xs">{v.ipHash?.slice(0, 8) ?? "—"}</td>
              <td className="px-4 py-2">{inv ? <Pill tone="rouge" >Invalidé : {inv.reason.slice(0, 40)}</Pill> : <Pill tone="vert">Valide</Pill>}</td>
              <td className="px-4 py-2">{canWrite && !inv && <InvalidateForm action={invalidateVoteAction} voteId={v.id} />}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="mt-12">
        <h2 className="t-sous-titre mb-4 text-2xl">Journal d'audit du vote</h2>
        <Table head={["Date", "Événement", "Détails", "Auteur / IP"]} empty={!events.length}>
          {events.map((e) => (
            <tr key={e.id}>
              <td className="whitespace-nowrap px-4 py-2">{formatDateTime(e.createdAt)}</td>
              <td className="px-4 py-2 font-medium">{e.type.replaceAll("_", " ")}</td>
              <td className="px-4 py-2 font-mono text-xs">{e.details ? JSON.stringify(e.details).slice(0, 120) : ""}</td>
              <td className="px-4 py-2 text-xs">{e.actorEmail ?? (e.ipHash ? `ip ${e.ipHash.slice(0, 8)}` : "")}</td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}

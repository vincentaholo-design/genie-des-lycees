import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { audit } from "@/lib/audit";
import { toCsv } from "@/lib/utils";
import { INSCRIPTION_STATUS_LABELS } from "@/lib/inscriptions/validation";
import { voteService } from "@/lib/vote/server";

function csv(name: string, body: string) {
  return new Response(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const url = new URL(req.url);
  const user = await getCurrentUser();
  if (!user) return new Response("Non connecté", { status: 401 });
  const db = await getDb();
  const editionId = url.searchParams.get("edition");

  if (kind === "inscriptions" || kind === "inscriptions-acceptees") {
    if (!can(user.role, "inscriptions", "export")) return new Response("Interdit", { status: 403 });
    const where = [];
    if (editionId) where.push(eq(s.inscriptions.editionId, editionId));
    if (kind === "inscriptions-acceptees") where.push(eq(s.inscriptions.status, "accepte"));
    else if (url.searchParams.get("statut")) where.push(eq(s.inscriptions.status, url.searchParams.get("statut") as never));
    if (url.searchParams.get("categorie")) where.push(eq(s.inscriptions.categoryId, url.searchParams.get("categorie")!));
    const rows = await db
      .select({ i: s.inscriptions, cat: s.categories.name, school: s.schools.name, edition: s.editions.title })
      .from(s.inscriptions)
      .innerJoin(s.categories, eq(s.categories.id, s.inscriptions.categoryId))
      .innerJoin(s.editions, eq(s.editions.id, s.inscriptions.editionId))
      .leftJoin(s.schools, eq(s.schools.id, s.inscriptions.schoolId))
      .where(and(...where))
      .orderBy(s.schools.name, s.inscriptions.lastName);
    const data = rows.map(({ i, cat, school, edition }) => ({
      dossier: i.dossierNumber, edition, categorie: cat, statut: INSCRIPTION_STATUS_LABELS[i.status], nom: i.lastName, prenoms: i.firstName, naissance: i.birthDate, mineur: i.isMinor ? "oui" : "non",
      etablissement: school ?? i.schoolNameFree, classe: i.level, ville: i.city, telephone: i.phone, email: i.email, equipe: i.teamName,
      membres: (i.teamMembers ?? []).map((m) => `${m.firstName} ${m.lastName}`).join(" / "), tuteur: i.guardianName, tel_tuteur: i.guardianPhone,
      accord_parental: i.isMinor ? (i.consentGuardian ? "oui" : "non") : "", droit_image: i.consentImage ? "oui" : "non", recu_le: i.createdAt,
    }));
    const cols = (kind === "inscriptions-acceptees" ? ["dossier", "categorie", "etablissement", "nom", "prenoms", "classe", "equipe", "membres", "droit_image"] : Object.keys(data[0] ?? { dossier: 1 })).map((k) => ({ key: k, label: k }));
    await audit(user, "export", "inscriptions", editionId, { type: kind, lignes: data.length });
    return csv(kind, toCsv(data, cols));
  }

  if (kind === "vote-resultats" || kind === "vote-journal") {
    if (!can(user.role, "vote", "export") || !editionId) return new Response("Interdit", { status: 403 });
    const svc = await voteService();
    if (kind === "vote-resultats") {
      const tally = await svc.tally(editionId);
      const cands = await db.select({ id: s.candidates.id, f: s.candidates.firstName, l: s.candidates.lastName, t: s.candidates.teamName, school: s.schools.name }).from(s.candidates).leftJoin(s.schools, eq(s.schools.id, s.candidates.schoolId)).where(eq(s.candidates.editionId, editionId));
      const stats = await svc.stats(editionId);
      const data = tally.map((t, i) => { const c = cands.find((x) => x.id === t.candidateId)!; return { rang: i + 1, candidat: c.t ?? `${c.f} ${c.l}`, etablissement: c.school, votes_valides: t.total }; });
      await svc.log("export_resultats", { editionId, actorEmail: user.email, details: stats });
      await audit(user, "export", "vote", editionId, { type: kind });
      return csv("resultats-vote", toCsv(data, ["rang", "candidat", "etablissement", "votes_valides"].map((k) => ({ key: k, label: k }))));
    }
    const rows = await db.select({ v: s.votes, inv: s.voteInvalidations }).from(s.votes).leftJoin(s.voteInvalidations, eq(s.voteInvalidations.voteId, s.votes.id)).where(eq(s.votes.editionId, editionId)).orderBy(desc(s.votes.createdAt));
    const data = rows.map(({ v, inv }) => ({ id: v.id, date: v.createdAt, candidat_id: v.candidateId, methode: v.method, periode: v.period, votant_empreinte: v.voterKey.slice(0, 16), ip_empreinte: v.ipHash?.slice(0, 12), invalide: inv ? "oui" : "non", motif: inv?.reason, invalide_par: inv?.invalidatedByEmail }));
    await svc.log("export_journal", { editionId, actorEmail: user.email });
    await audit(user, "export", "vote", editionId, { type: kind });
    return csv("journal-vote", toCsv(data, Object.keys(data[0] ?? { id: 1 }).map((k) => ({ key: k, label: k }))));
  }

  if (kind === "messages") {
    if (!can(user.role, "messages", "export")) return new Response("Interdit", { status: 403 });
    const rows = await db.select().from(s.messages).orderBy(desc(s.messages.createdAt));
    await audit(user, "export", "messages", null);
    return csv("messages", toCsv(rows as unknown as Record<string, unknown>[], ["createdAt", "type", "name", "email", "phone", "organisation", "subject", "body", "handled"].map((k) => ({ key: k, label: k }))));
  }
  return new Response("Export inconnu", { status: 404 });
}

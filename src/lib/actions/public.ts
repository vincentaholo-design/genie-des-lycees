"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { env } from "@/lib/env";
import { randomToken } from "@/lib/crypto";
import { requestFingerprint } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { putPrivateDocument } from "@/lib/storage";
import { sendEmail } from "@/lib/notify";
import { ageAt } from "@/lib/utils";
import { inscriptionSchema, makeDossierNumber, MAJORITY_AGE, validateTeam, INSCRIPTION_STATUS_LABELS } from "@/lib/inscriptions/validation";
import { voteService } from "@/lib/vote/server";
import { VOTE_ERROR_MESSAGES, type VoteError } from "@/lib/vote/service";

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string>; values?: Record<string, string> };

const TOO_MANY = "Trop de tentatives en peu de temps. Patientez quelques minutes puis réessayez.";

function values(fd: FormData) {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  return out;
}

function zodErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? "form";
    out[key] ??= issue.message;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Inscription                                                         */
/* ------------------------------------------------------------------ */

export async function submitInscription(_: FormState, fd: FormData): Promise<FormState> {
  const vals = values(fd);
  if (vals.site_web) return { ok: false, message: "Envoi refusé." }; // champ piège anti-robot
  const db = await getDb();
  const fp = await requestFingerprint();
  if (fp.ipHash && !(await rateLimit(db, `inscription:${fp.ipHash}`, 6, 3600)).ok) return { ok: false, message: TOO_MANY, values: vals };

  const [edition] = await db.select().from(s.editions).where(eq(s.editions.status, "en_cours"));
  if (!edition || !edition.registrationOpen || (edition.registrationClosesAt && edition.registrationClosesAt < new Date())) {
    return { ok: false, message: "Les inscriptions sont fermées pour le moment.", values: vals };
  }

  const members = [0, 1, 2, 3].map((i) => ({ firstName: vals[`member${i}_first`] ?? "", lastName: vals[`member${i}_last`] ?? "", level: vals[`member${i}_level`] ?? "" }));
  const parsed = inscriptionSchema.safeParse({ ...vals, schoolId: vals.schoolId && vals.schoolId !== "autre" ? vals.schoolId : undefined, teamMembers: members });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error), message: "Certains champs sont à corriger.", values: vals };
  const data = parsed.data;

  const [category] = await db.select().from(s.categories).where(eq(s.categories.slug, data.categorySlug));
  if (!category) return { ok: false, errors: { categorySlug: "Catégorie inconnue" }, values: vals };
  const teamErrors = validateTeam(data, category);
  if (Object.keys(teamErrors).length) return { ok: false, errors: teamErrors, message: "Certains champs sont à corriger.", values: vals };

  if (data.schoolId) {
    const [school] = await db.select({ id: s.schools.id }).from(s.schools).where(eq(s.schools.id, data.schoolId));
    if (!school) return { ok: false, errors: { schoolId: "Établissement inconnu" }, values: vals };
  }

  // Doublon : même e-mail, même édition, même catégorie
  const dup = await db
    .select({ n: s.inscriptions.dossierNumber })
    .from(s.inscriptions)
    .where(and(eq(s.inscriptions.editionId, edition.id), eq(s.inscriptions.email, data.email), eq(s.inscriptions.categoryId, category.id)));
  if (dup.length) return { ok: false, message: "Un dossier existe déjà avec cette adresse pour cette catégorie. Utilisez « Suivre mon dossier » pour le consulter.", values: vals };

  // Pièces justificatives (facultatives selon le règlement)
  const docs: Array<{ kind: string; file: File }> = [];
  for (const kind of ["justificatif_scolaire", "autorisation_parentale"]) {
    const f = fd.get(kind);
    if (f instanceof File && f.size > 0) docs.push({ kind, file: f });
  }
  const stored: Array<{ kind: string; key: string; mime: string; size: number; name: string }> = [];
  try {
    for (const d of docs) {
      const r = await putPrivateDocument(`dossiers/${edition.year}`, d.file);
      stored.push({ kind: d.kind, ...r, name: d.file.name.slice(0, 120) });
    }
  } catch (e) {
    return { ok: false, errors: { documents: (e as Error).message }, values: vals };
  }

  const isMinor = ageAt(data.birthDate) < MAJORITY_AGE;
  let dossierNumber = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    dossierNumber = makeDossierNumber(edition.year ?? new Date().getFullYear());
    try {
      const [row] = await db
        .insert(s.inscriptions)
        .values({
          dossierNumber,
          editionId: edition.id,
          categoryId: category.id,
          schoolId: data.schoolId ?? null,
          schoolNameFree: data.schoolId ? null : data.schoolNameFree,
          firstName: data.firstName,
          lastName: data.lastName,
          birthDate: data.birthDate,
          level: data.level,
          city: data.city,
          phone: data.phone,
          email: data.email,
          motivation: data.motivation,
          teamName: category.teamMode ? data.teamName : null,
          teamMembers: category.teamMode ? data.teamMembers : null,
          isMinor,
          guardianName: isMinor ? data.guardianName : null,
          guardianPhone: isMinor ? data.guardianPhone : null,
          guardianRelation: isMinor ? data.guardianRelation : null,
          consentData: data.consentData,
          consentRules: data.consentRules,
          consentGuardian: isMinor ? data.consentGuardian : false,
          consentImage: data.consentImage,
          ipHash: fp.ipHash,
        })
        .returning({ id: s.inscriptions.id });
      if (stored.length)
        await db.insert(s.documents).values(stored.map((d) => ({ inscriptionId: row.id, kind: d.kind, storagePath: d.key, originalName: d.name, mimeType: d.mime, size: d.size })));
      await db.insert(s.notifications).values({ role: "candidatures", type: "inscription", message: `Nouveau dossier ${dossierNumber} (${category.name})`, link: `/admin/inscriptions/${row.id}` });
      break;
    } catch (e) {
      if (attempt === 4 || !/dossier_number|unique/i.test(String(e) + String((e as { cause?: unknown }).cause))) throw e;
    }
  }

  await sendEmail(
    data.email,
    `Inscription reçue — dossier ${dossierNumber}`,
    `Bonjour ${data.firstName},\n\nVotre inscription au concours Génie des Lycées ORATHON (${edition.title}, catégorie ${category.name}) est bien reçue.\nNuméro de dossier : ${dossierNumber}\n\nSuivez son statut sur ${env.siteUrl}/suivi avec ce numéro et votre adresse e-mail.\n\nL'équipe AJ3C`,
  ).catch(() => null);

  redirect(`/inscription/confirmation?dossier=${encodeURIComponent(dossierNumber)}`);
}

/* ------------------------------------------------------------------ */
/* Suivi de dossier                                                    */
/* ------------------------------------------------------------------ */

export type TrackState = FormState & { result?: { dossier: string; status: string; label: string; note: string | null; category: string; edition: string; createdAt: string } };

export async function trackDossier(_: TrackState, fd: FormData): Promise<TrackState> {
  const vals = values(fd);
  const dossier = (vals.dossier ?? "").trim().toUpperCase();
  const email = (vals.email ?? "").trim().toLowerCase();
  if (!dossier || !email) return { ok: false, message: "Saisissez le numéro de dossier et l'adresse e-mail utilisée.", values: vals };
  const db = await getDb();
  const fp = await requestFingerprint();
  if (fp.ipHash && !(await rateLimit(db, `suivi:${fp.ipHash}`, 10, 900)).ok) return { ok: false, message: TOO_MANY, values: vals };
  const [row] = await db
    .select({ i: s.inscriptions, category: s.categories.name, edition: s.editions.title })
    .from(s.inscriptions)
    .innerJoin(s.categories, eq(s.categories.id, s.inscriptions.categoryId))
    .innerJoin(s.editions, eq(s.editions.id, s.inscriptions.editionId))
    .where(and(eq(s.inscriptions.dossierNumber, dossier), eq(s.inscriptions.email, email)));
  // Message identique dans les deux cas : on ne révèle pas l'existence d'un dossier.
  if (!row) return { ok: false, message: "Aucun dossier ne correspond à ce numéro et à cette adresse.", values: vals };
  return {
    ok: true,
    values: vals,
    result: {
      dossier: row.i.dossierNumber,
      status: row.i.status,
      label: INSCRIPTION_STATUS_LABELS[row.i.status],
      note: row.i.publicNote,
      category: row.category,
      edition: row.edition,
      createdAt: row.i.createdAt.toISOString(),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Contact & partenariat                                               */
/* ------------------------------------------------------------------ */

const contactSchema = z.object({
  type: z.enum(["contact", "partenariat"]),
  name: z.string().trim().min(2, "Indiquez votre nom").max(120),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(200),
  phone: z.string().trim().max(30).optional(),
  organisation: z.string().trim().max(160).optional(),
  subject: z.string().trim().max(160).optional(),
  body: z.string().trim().min(10, "Votre message est trop court").max(4000, "4000 caractères maximum"),
});

export async function submitContact(_: FormState, fd: FormData): Promise<FormState> {
  const vals = values(fd);
  if (vals.site_web) return { ok: true, message: "Message envoyé." };
  const parsed = contactSchema.safeParse(vals);
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error), values: vals };
  const db = await getDb();
  const fp = await requestFingerprint();
  if (fp.ipHash && !(await rateLimit(db, `contact:${fp.ipHash}`, 5, 3600)).ok) return { ok: false, message: TOO_MANY, values: vals };
  await db.insert(s.messages).values({ ...parsed.data, ipHash: fp.ipHash });
  await db.insert(s.notifications).values({ role: "editeur", type: parsed.data.type, message: `${parsed.data.type === "partenariat" ? "Demande de partenariat" : "Message"} de ${parsed.data.name}`, link: "/admin/messages" });
  return { ok: true, message: parsed.data.type === "partenariat" ? "Demande envoyée. L'équipe partenariats vous recontacte." : "Message envoyé. Nous vous répondons par e-mail." };
}

/* ------------------------------------------------------------------ */
/* Vote du public                                                      */
/* ------------------------------------------------------------------ */

export type VoteState = { step: "identifier" | "code" | "done"; error?: string; demoCode?: string; delivered?: boolean; identifier?: string; candidateId?: string };

const voteInput = z.object({ editionId: z.string().uuid(), candidateId: z.string().uuid() });

function fail(error: VoteError, base: Partial<VoteState>): VoteState {
  return { step: base.step ?? "identifier", ...base, error: VOTE_ERROR_MESSAGES[error] };
}

export async function voteAction(prev: VoteState, fd: FormData): Promise<VoteState> {
  const vals = values(fd);
  const ids = voteInput.safeParse(vals);
  if (!ids.success) return { step: "identifier", error: "Choisissez un candidat." };
  const { editionId, candidateId } = ids.data;
  const svc = await voteService();
  const fp = await requestFingerprint();
  const ctx = { ipHash: fp.ipHash, uaHash: fp.uaHash };
  const captchaToken = vals["cf-turnstile-response"] ?? null;
  const intent = vals.intent;

  if (intent === "leger") {
    const jar = await cookies();
    let token = jar.get("gdl_device")?.value;
    if (!token) {
      token = randomToken(24);
      jar.set("gdl_device", token, { httpOnly: true, sameSite: "lax", secure: env.isProd, path: "/", maxAge: 60 * 60 * 24 * 400 });
    }
    const r = await svc.castLightVote({ editionId, candidateId, deviceToken: token, captchaToken }, ctx);
    return r.ok ? { step: "done", candidateId } : fail(r.error, { candidateId });
  }

  if (intent === "code") {
    const identifier = vals.identifier ?? "";
    const r = await svc.requestCode({ editionId, candidateId, identifier, captchaToken }, ctx);
    if (!r.ok) return fail(r.error, { step: "identifier", candidateId, identifier });
    return { step: "code", candidateId, identifier, delivered: r.delivered, demoCode: "demoCode" in r ? r.demoCode : undefined };
  }

  if (intent === "confirm") {
    const identifier = vals.identifier ?? prev.identifier ?? "";
    const r = await svc.confirmVote({ editionId, candidateId, identifier, code: vals.code ?? "" }, ctx);
    if (!r.ok) {
      const back = r.error === "code_expire" || r.error === "deja_vote";
      return fail(r.error, { step: back ? "identifier" : "code", candidateId, identifier, demoCode: back ? undefined : prev.demoCode, delivered: prev.delivered });
    }
    return { step: "done", candidateId };
  }
  return { step: "identifier" };
}

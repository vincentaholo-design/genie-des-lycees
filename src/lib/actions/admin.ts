"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, ne } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { verifyPassword, hashPassword } from "@/lib/crypto";
import { requestFingerprint } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { assertPermission, createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { canPublishResults, ROLES } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";
import { getResource, tables } from "@/lib/admin/resources";
import { getRow, parseForm } from "@/lib/admin/crud";
import { putPublicImage, removeVideo } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { voteService } from "@/lib/vote/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AdminState = { ok?: boolean; message?: string; errors?: Record<string, string> };

function friendlyDbError(e: unknown): string {
  const msg = String((e as Error)?.message ?? e) + String((e as { cause?: Error })?.cause?.message ?? "");
  if (/editions_single_current/.test(msg)) return "Une autre édition est déjà « en cours ». Archivez-la d'abord.";
  if (/unique|duplicate/i.test(msg)) return "Cette adresse (slug) ou cette valeur existe déjà. Choisissez-en une autre.";
  if (/foreign key|violates|restrict/i.test(msg)) return "Impossible : d'autres éléments dépendent de celui-ci (candidats, votes, inscriptions…). Dépubliez-le plutôt.";
  if (/insertion seule/.test(msg)) return "Opération interdite : ces données sont protégées en écriture.";
  return "Enregistrement impossible. Vérifiez les champs et réessayez.";
}

/* ------------------------------------------------------------------ */
/* Connexion                                                           */
/* ------------------------------------------------------------------ */

export async function loginAction(_: AdminState, fd: FormData): Promise<AdminState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const db = await getDb();
  const fp = await requestFingerprint();
  const ipOk = fp.ipHash ? await rateLimit(db, `login-ip:${fp.ipHash}`, 20, 900) : { ok: true };
  const userOk = await rateLimit(db, `login-user:${email}`, 8, 900);
  if (!ipOk.ok || !userOk.ok) return { ok: false, message: "Trop de tentatives. Réessayez dans 15 minutes." };
  const [user] = await db.select().from(s.users).where(eq(s.users.email, email));
  // Vérification même si l'utilisateur n'existe pas (temps de réponse constant)
  const valid = await verifyPassword(password, user?.passwordHash ?? "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!user || !valid || !user.active) {
    await audit(null, "connexion_refusee", "users", null, { email });
    return { ok: false, message: "Adresse e-mail ou mot de passe incorrect." };
  }
  await createSession(user.id);
  await db.update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, user.id));
  await audit({ id: user.id, email: user.email, name: user.name, role: user.role }, "connexion", "users", user.id);
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await audit(user, "deconnexion", "users", user.id);
  await destroySession();
  redirect("/admin/connexion");
}

/* ------------------------------------------------------------------ */
/* CRUD générique                                                      */
/* ------------------------------------------------------------------ */

export async function saveResource(key: string, id: string | null, _: AdminState, fd: FormData): Promise<AdminState> {
  const def = getResource(key);
  if (!def) return { ok: false, message: "Module inconnu." };
  const user = await assertPermission(def.permission, "write");
  const existing = id ? await getRow(def, id) : null;
  if (id && !existing) return { ok: false, message: "Élément introuvable (supprimé entre-temps ?)." };
  const { values, errors } = await parseForm(def, fd, user, existing);
  if (Object.keys(errors).length) return { ok: false, errors, message: "Certains champs sont à corriger." };

  // Publication réservée : témoignages et articles exigent le droit « publish »
  if ((key === "testimonials" || key === "articles") && values.status === "publie" && existing?.status !== "publie") {
    await assertPermission(def.permission, "publish");
  }
  if (key === "results" && existing && existing.published && !canPublishResults(user.role)) {
    return { ok: false, message: "Ce résultat est publié : seul un super-administrateur peut le modifier." };
  }

  const db = await getDb();
  const table = tables[def.table] as unknown as PgTable;
  const idCol = (tables[def.table] as any).id as PgColumn;
  let newId = id;
  try {
    if (existing) {
      await db.update(table).set(values).where(eq(idCol, id!));
    } else {
      const [row] = (await db.insert(table).values(values).returning()) as any[];
      newId = row.id;
    }
  } catch (e) {
    return { ok: false, message: friendlyDbError(e) };
  }
  const changed = existing ? Object.keys(values).filter((k) => JSON.stringify(values[k]) !== JSON.stringify(existing[k])) : Object.keys(values);
  await audit(user, existing ? "modification" : "creation", key, newId, { champs: changed });
  revalidatePath("/", "layout");
  if (!existing) redirect(`/admin/${key}/${newId}?cree=1`);
  return { ok: true, message: "Modifications enregistrées." };
}

export async function deleteResource(key: string, id: string, _: AdminState, fd: FormData): Promise<AdminState> {
  const def = getResource(key);
  if (!def) return { ok: false, message: "Module inconnu." };
  const user = await assertPermission(def.permission, "delete");
  if (fd.get("confirm") !== "SUPPRIMER") return { ok: false, message: "Tapez SUPPRIMER pour confirmer." };
  const existing = await getRow(def, id);
  if (!existing) return { ok: false, message: "Élément introuvable." };
  if (key === "results" && existing.published && !canPublishResults(user.role)) return { ok: false, message: "Seul un super-administrateur peut supprimer un résultat publié." };
  const db = await getDb();
  try {
    await db.delete(tables[def.table] as unknown as PgTable).where(eq((tables[def.table] as any).id, id));
  } catch (e) {
    return { ok: false, message: friendlyDbError(e) };
  }
  if (key === "videos" && existing.fileKey) await removeVideo(existing.fileKey);
  await audit(user, "suppression", key, id, { titre: existing[def.titleField] ?? null });
  revalidatePath("/", "layout");
  redirect(`/admin/${key}?supprime=1`);
}

/** Ajout de plusieurs photos d'un coup dans un album. */
export async function bulkUploadPhotos(_: AdminState, fd: FormData): Promise<AdminState> {
  const user = await assertPermission("media", "write");
  const albumId = String(fd.get("albumId") ?? "");
  const credit = String(fd.get("credit") ?? "").trim() || null;
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!albumId) return { ok: false, message: "Choisissez l'album." };
  if (!files.length) return { ok: false, message: "Ajoutez au moins une photo." };
  if (files.length > 30) return { ok: false, message: "30 photos maximum par envoi." };
  const db = await getDb();
  const [album] = await db.select().from(s.albums).where(eq(s.albums.id, albumId));
  if (!album) return { ok: false, message: "Album introuvable." };
  const [{ n }] = await db.select({ n: count() }).from(s.media).where(eq(s.media.albumId, albumId));
  const failed: string[] = [];
  let i = 0;
  for (const f of files) {
    try {
      const img = await putPublicImage("media", f);
      await db.insert(s.media).values({ albumId, url: img.url, thumbUrl: img.thumbUrl, width: img.width, height: img.height, alt: album.title, credit, sortOrder: n + i++ });
    } catch {
      failed.push(f.name);
    }
  }
  if (!album.coverUrl && i > 0) {
    const [first] = await db.select().from(s.media).where(eq(s.media.albumId, albumId)).limit(1);
    await db.update(s.albums).set({ coverUrl: first.url }).where(eq(s.albums.id, albumId));
  }
  await audit(user, "import_photos", "media", albumId, { ajoutees: i, refusees: failed });
  revalidatePath("/", "layout");
  return { ok: failed.length === 0, message: `${i} photo(s) ajoutée(s).${failed.length ? ` Refusées (format ou poids) : ${failed.join(", ")}` : " Pensez à compléter les textes alternatifs."}` };
}

/* ------------------------------------------------------------------ */
/* Inscriptions                                                        */
/* ------------------------------------------------------------------ */

const reviewSchema = z.object({
  status: z.enum(["soumis", "en_verification", "incomplet", "accepte", "refuse"]),
  reviewNote: z.string().trim().max(2000).optional(),
  publicNote: z.string().trim().max(600).optional(),
});

export async function reviewInscription(id: string, _: AdminState, fd: FormData): Promise<AdminState> {
  const user = await assertPermission("inscriptions", "write");
  const parsed = reviewSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Statut invalide." };
  const db = await getDb();
  const [before] = await db.select().from(s.inscriptions).where(eq(s.inscriptions.id, id));
  if (!before) return { ok: false, message: "Dossier introuvable." };
  await db
    .update(s.inscriptions)
    .set({ status: parsed.data.status, reviewNote: parsed.data.reviewNote || null, publicNote: parsed.data.publicNote || null, reviewedBy: user.id, reviewedAt: new Date() })
    .where(eq(s.inscriptions.id, id));
  await audit(user, "revue_dossier", "inscriptions", id, { de: before.status, vers: parsed.data.status, dossier: before.dossierNumber });
  revalidatePath(`/admin/inscriptions/${id}`);
  return { ok: true, message: "Dossier mis à jour. Le candidat voit le nouveau statut sur la page de suivi." };
}

/** Crée la fiche publique (non publiée) d'un dossier accepté. */
export async function promoteInscription(id: string) {
  const user = await assertPermission("candidates", "write");
  const db = await getDb();
  const [ins] = await db.select().from(s.inscriptions).where(eq(s.inscriptions.id, id));
  if (!ins || ins.status !== "accepte") throw new Error("Seul un dossier accepté peut devenir une fiche candidat.");
  const [already] = await db.select({ id: s.candidates.id }).from(s.candidates).where(eq(s.candidates.inscriptionId, id));
  if (already) redirect(`/admin/candidates/${already.id}`);
  const [ed] = await db.select().from(s.editions).where(eq(s.editions.id, ins.editionId));
  let slug = slugify(`${ins.teamName ?? `${ins.firstName}-${ins.lastName}`}-${ed.year ?? ed.number ?? ""}`);
  const [clash] = await db.select({ id: s.candidates.id }).from(s.candidates).where(eq(s.candidates.slug, slug));
  if (clash) slug = `${slug}-${ins.dossierNumber.slice(-4).toLowerCase()}`;
  const [c] = await db
    .insert(s.candidates)
    .values({
      slug,
      editionId: ins.editionId,
      categoryId: ins.categoryId,
      schoolId: ins.schoolId,
      inscriptionId: ins.id,
      firstName: ins.firstName,
      lastName: ins.lastName,
      teamName: ins.teamName,
      level: ins.level,
      imageConsent: ins.consentImage,
      status: "retenu",
      published: false, // relecture avant publication
    })
    .returning({ id: s.candidates.id });
  await audit(user, "creation_fiche_candidat", "candidates", c.id, { dossier: ins.dossierNumber });
  redirect(`/admin/candidates/${c.id}?cree=1`);
}

/* ------------------------------------------------------------------ */
/* Vote                                                                */
/* ------------------------------------------------------------------ */

export async function voteControl(editionId: string, _: AdminState, fd: FormData): Promise<AdminState> {
  const user = await assertPermission("vote", "write");
  const op = String(fd.get("op"));
  const note = String(fd.get("note") ?? "").trim() || undefined;
  const svc = await voteService();
  const db = await getDb();
  if (op === "ouvrir") await svc.setStatus(editionId, "ouvert", user.email, note);
  else if (op === "suspendre") {
    if (!note) return { ok: false, message: "Indiquez le motif de la suspension (il est journalisé)." };
    await svc.setStatus(editionId, "suspendu", user.email, note);
  } else if (op === "reprendre") await svc.setStatus(editionId, "ouvert", user.email, note);
  else if (op === "clore") {
    if (fd.get("confirm") !== "CLORE") return { ok: false, message: "Tapez CLORE pour confirmer la clôture immédiate." };
    await db.update(s.editions).set({ voteClosesAt: new Date() }).where(eq(s.editions.id, editionId));
    await svc.setStatus(editionId, "ferme", user.email, note ?? "clôture manuelle");
  } else return { ok: false, message: "Action inconnue." };
  await audit(user, `vote_${op}`, "vote", editionId, note ? { note } : undefined);
  revalidatePath("/", "layout");
  return { ok: true, message: "État du vote mis à jour." };
}

const voteSettingsSchema = z.object({
  voteMethod: z.enum(["code_email", "code_sms", "leger"]),
  voteScope: z.enum(["une_fois_par_edition", "une_fois_par_jour"]),
  resultsVisibility: z.enum(["jamais", "apres_cloture", "en_direct"]),
  voteOpensAt: z.string().optional(),
  voteClosesAt: z.string().optional(),
  voteInstructions: z.string().trim().max(1200).optional(),
});

export async function saveVoteSettings(editionId: string, _: AdminState, fd: FormData): Promise<AdminState> {
  const user = await assertPermission("vote", "write");
  const parsed = voteSettingsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Paramètres invalides." };
  const toDate = (v?: string) => (v ? new Date(`${v.length === 16 ? `${v}:00` : v}Z`) : null);
  const opens = toDate(parsed.data.voteOpensAt);
  const closes = toDate(parsed.data.voteClosesAt);
  if (opens && closes && closes <= opens) return { ok: false, message: "La clôture doit être postérieure à l'ouverture." };
  const db = await getDb();
  const [before] = await db.select().from(s.editions).where(eq(s.editions.id, editionId));
  const [{ n }] = await db.select({ n: count() }).from(s.votes).where(eq(s.votes.editionId, editionId));
  if (n > 0 && (before.voteMethod !== parsed.data.voteMethod || before.voteScope !== parsed.data.voteScope)) {
    return { ok: false, message: `Des votes sont déjà enregistrés (${n}) : la méthode et la règle de fréquence ne peuvent plus changer pour cette édition.` };
  }
  const values = {
    voteMethod: parsed.data.voteMethod,
    voteScope: parsed.data.voteScope,
    resultsVisibility: parsed.data.resultsVisibility,
    voteOpensAt: opens,
    voteClosesAt: closes,
    voteInstructions: parsed.data.voteInstructions || null,
    voteRequireCaptcha: fd.get("voteRequireCaptcha") === "on",
  };
  await db.update(s.editions).set(values).where(eq(s.editions.id, editionId));
  const svc = await voteService();
  await svc.log("parametres_modifies", { editionId, actorEmail: user.email, details: { ...values, voteOpensAt: opens?.toISOString() ?? null, voteClosesAt: closes?.toISOString() ?? null } });
  await audit(user, "vote_parametres", "vote", editionId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Règles du vote enregistrées." };
}

export async function invalidateVoteAction(_: AdminState, fd: FormData): Promise<AdminState> {
  const user = await assertPermission("vote", "write");
  const voteId = String(fd.get("voteId") ?? "");
  const reason = String(fd.get("reason") ?? "");
  try {
    const svc = await voteService();
    await svc.invalidate(voteId, reason, { id: user.id, email: user.email });
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  await audit(user, "vote_invalidation", "vote", voteId, { reason });
  revalidatePath("/admin/vote");
  return { ok: true, message: "Vote invalidé. Il reste visible dans le journal avec son motif." };
}

/* ------------------------------------------------------------------ */
/* Utilisateurs                                                        */
/* ------------------------------------------------------------------ */

const userSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse invalide"),
  name: z.string().trim().min(2, "Nom obligatoire").max(120),
  role: z.enum(ROLES),
  password: z.string().optional(),
});

export async function saveUser(id: string | null, _: AdminState, fd: FormData): Promise<AdminState> {
  const actor = await assertPermission("users", "write");
  const parsed = userSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const { email, name, role, password } = parsed.data;
  const active = fd.get("active") === "on";
  if (password && password.length < 12) return { ok: false, errors: { password: "12 caractères minimum" } };
  if (!id && !password) return { ok: false, errors: { password: "Mot de passe initial obligatoire" } };
  const db = await getDb();
  if (id) {
    if (id === actor.id && (role !== "super_admin" || !active)) return { ok: false, message: "Vous ne pouvez pas retirer vos propres droits de super-administrateur." };
    if (role !== "super_admin" || !active) {
      const [{ n }] = await db.select({ n: count() }).from(s.users).where(and(eq(s.users.role, "super_admin"), eq(s.users.active, true), ne(s.users.id, id)));
      if (n === 0) return { ok: false, message: "Il doit rester au moins un super-administrateur actif." };
    }
  }
  try {
    if (id) {
      await db.update(s.users).set({ email, name, role, active, ...(password ? { passwordHash: await hashPassword(password) } : {}) }).where(eq(s.users.id, id));
      if (!active || password) await db.delete(s.sessions).where(eq(s.sessions.userId, id));
    } else {
      const [u] = await db.insert(s.users).values({ email, name, role, active, passwordHash: await hashPassword(password!) }).returning({ id: s.users.id });
      id = u.id;
    }
  } catch (e) {
    return { ok: false, message: friendlyDbError(e) };
  }
  await audit(actor, "utilisateur_enregistre", "users", id, { email, role, active, motDePasseChange: Boolean(password) });
  revalidatePath("/admin/utilisateurs");
  return { ok: true, message: "Compte enregistré." };
}

/* ------------------------------------------------------------------ */
/* Paramètres du site & messages                                       */
/* ------------------------------------------------------------------ */

export async function saveSettings(key: "hero" | "about" | "contact", _: AdminState, fd: FormData): Promise<AdminState> {
  const user = await assertPermission("settings", "write");
  const str = (k: string, max = 1200) => String(fd.get(k) ?? "").trim().slice(0, max);
  let value: Record<string, unknown>;
  if (key === "hero") {
    let imageUrl = str("imageUrl", 500);
    const file = fd.get("imageFile");
    if (file instanceof File && file.size > 0) {
      try {
        imageUrl = (await putPublicImage("accueil", file)).url;
      } catch (e) {
        return { ok: false, message: (e as Error).message };
      }
    }
    value = { imageUrl, imageAlt: str("imageAlt", 200), imageCredit: str("imageCredit", 200), headline: str("headline", 80), intro: str("intro", 500) };
  } else if (key === "about") {
    value = { mission: str("mission"), motto: str("motto", 200), vision: str("vision", 2000), objectives: str("objectives", 3000).split("\n").map((l) => l.trim()).filter(Boolean), history: str("history", 6000) };
  } else {
    const email = str("email", 200);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, errors: { email: "Adresse invalide" } };
    value = { email, phone: str("phone", 40), whatsapp: str("whatsapp", 40), address: str("address", 300) };
  }
  const db = await getDb();
  await db.insert(s.siteSettings).values({ key, value }).onConflictDoUpdate({ target: s.siteSettings.key, set: { value } });
  await audit(user, "parametres", "settings", key);
  revalidatePath("/", "layout");
  return { ok: true, message: "Paramètres enregistrés." };
}

export async function toggleMessageHandled(id: string) {
  const user = await assertPermission("messages", "write");
  const db = await getDb();
  const [m] = await db.select().from(s.messages).where(eq(s.messages.id, id));
  if (!m) return;
  await db.update(s.messages).set({ handled: !m.handled }).where(eq(s.messages.id, id));
  await audit(user, m.handled ? "message_rouvert" : "message_traite", "messages", id);
  revalidatePath("/admin/messages");
}

export async function markNotificationsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  const db = await getDb();
  await db.update(s.notifications).set({ readAt: new Date() }).where(eq(s.notifications.role, user.role));
  await db.update(s.notifications).set({ readAt: new Date() }).where(eq(s.notifications.userId, user.id));
  revalidatePath("/admin");
}

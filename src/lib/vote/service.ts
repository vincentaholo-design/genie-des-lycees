/**
 * Vote du public — logique serveur.
 *
 * Garanties :
 * - Aucune donnée du navigateur n'est crue : édition, candidat, période et compteur sont
 *   recalculés ici à partir de la base.
 * - Doublons bloqués par la contrainte unique (edition_id, voter_key, period) en base.
 * - Les suffrages sont en insertion seule (trigger) ; l'invalidation est une ligne séparée,
 *   motivée, attribuée et journalisée.
 * - Limitation de fréquence par IP et par votant, codes à usage unique, 5 essais maximum.
 *
 * Limite assumée : avec un code par e-mail ou SMS, on garantit « un vote par adresse ou par
 * numéro vérifié », pas « un vote par personne ». Le mode léger garantit seulement « un vote
 * par appareil » et est présenté comme tel.
 */
import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { candidates, editions, voteCodes, voteEvents, voteInvalidations, votes } from "@/lib/db/schema";
import { hmac, randomDigits, safeEqual } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { lomeDay } from "@/lib/utils";

export type Edition = typeof editions.$inferSelect;
export type VoteState = "ferme" | "a_venir" | "ouvert" | "suspendu" | "clos";

export const VOTE_STATE_LABELS: Record<VoteState, string> = {
  ferme: "Vote non ouvert",
  a_venir: "Vote bientôt ouvert",
  ouvert: "Vote ouvert",
  suspendu: "Vote suspendu",
  clos: "Vote clos",
};

export const CODE_TTL_MINUTES = 10;
export const CODE_MAX_ATTEMPTS = 5;
export const LIMITS = {
  codesPerIpPerHour: 12,
  codesPerVoterPer15Min: 3,
  attemptsPerIpPerHour: 60,
  /** Les réseaux partagés (écoles, cybercafés) partagent une IP : limite volontairement large. */
  lightVotesPerIpPerDay: 30,
};

export function voteState(edition: Pick<Edition, "voteStatus" | "voteOpensAt" | "voteClosesAt">, now: Date): VoteState {
  if (edition.voteStatus === "suspendu") return "suspendu";
  const closed = !!edition.voteClosesAt && now >= edition.voteClosesAt; // clôture automatique à l'heure définie
  if (edition.voteStatus === "ferme") return closed ? "clos" : "ferme";
  if (closed) return "clos";
  if (edition.voteOpensAt && now < edition.voteOpensAt) return "a_venir";
  return "ouvert";
}

/** Résultats du vote du public visibles par le public ? (l'administration les voit toujours) */
export function publicResultsVisible(edition: Pick<Edition, "resultsVisibility" | "voteStatus" | "voteOpensAt" | "voteClosesAt">, now: Date) {
  if (edition.resultsVisibility === "en_direct") return true;
  if (edition.resultsVisibility === "apres_cloture") return voteState(edition, now) === "clos";
  return false;
}

export function votePeriod(edition: Pick<Edition, "voteScope">, now: Date) {
  return edition.voteScope === "une_fois_par_jour" ? lomeDay(now) : "edition";
}

export function normalizeEmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 200 ? v : null;
}

/** Numéros togolais : 8 chiffres, préfixe +228 ajouté si absent. Autres pays acceptés avec indicatif. */
export function normalizePhone(raw: string): string | null {
  let v = raw.replace(/[\s.\-()]/g, "");
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  if (/^\d{8}$/.test(v)) v = `+228${v}`;
  return /^\+\d{8,15}$/.test(v) ? v : null;
}

export type VoteError =
  | "vote_ferme"
  | "vote_a_venir"
  | "vote_suspendu"
  | "vote_clos"
  | "candidat_invalide"
  | "identifiant_invalide"
  | "trop_de_demandes"
  | "deja_vote"
  | "code_invalide"
  | "code_expire"
  | "methode_incorrecte"
  | "envoi_impossible"
  | "captcha_requis"
  | "captcha_invalide"
  | "captcha_non_configure";

export const VOTE_ERROR_MESSAGES: Record<VoteError, string> = {
  vote_ferme: "Le vote n'est pas ouvert pour cette édition.",
  vote_a_venir: "Le vote n'est pas encore ouvert. Revenez à la date d'ouverture.",
  vote_suspendu: "Le vote est suspendu par l'organisation. Réessayez plus tard.",
  vote_clos: "Le vote est clos. Merci pour votre participation.",
  candidat_invalide: "Ce candidat ne peut pas recevoir de vote.",
  identifiant_invalide: "Vérifiez l'adresse e-mail ou le numéro saisi.",
  trop_de_demandes: "Trop de demandes en peu de temps. Patientez quelques minutes puis réessayez.",
  deja_vote: "Ce vote a déjà été utilisé pour la période en cours.",
  code_invalide: "Code incorrect. Vérifiez les 6 chiffres reçus.",
  code_expire: "Ce code a expiré ou a été trop souvent essayé. Demandez-en un nouveau.",
  methode_incorrecte: "Cette méthode de vote n'est pas active pour cette édition.",
  envoi_impossible: "Le code n'a pas pu être envoyé. Réessayez dans un instant.",
  captcha_requis: "Confirmez que vous n'êtes pas un robot.",
  captcha_invalide: "La vérification anti-robot a échoué. Réessayez.",
  captcha_non_configure: "La vérification anti-robot n'est pas configurée : le vote léger est indisponible.",
};

export type VoteDeps = {
  db: DB;
  now?: () => Date;
  /** Autorise l'affichage du code à l'écran quand aucun fournisseur n'est configuré. */
  demoMode: boolean;
  sendEmail: (to: string, subject: string, text: string) => Promise<{ sent: boolean; reason?: string }>;
  sendSms: (to: string, text: string) => Promise<{ sent: boolean; reason?: string }>;
  verifyCaptcha: (token: string | null | undefined) => Promise<"ok" | "invalide" | "non_configure">;
};

type Ctx = { ipHash: string | null; uaHash?: string | null };
type Fail = { ok: false; error: VoteError };

export function createVoteService(deps: VoteDeps) {
  const { db } = deps;
  const now = () => (deps.now ? deps.now() : new Date());

  async function log(type: string, data: { editionId?: string | null; candidateId?: string | null; voterKey?: string | null; ipHash?: string | null; details?: Record<string, unknown>; actorEmail?: string | null }) {
    await db.insert(voteEvents).values({
      type,
      editionId: data.editionId ?? null,
      candidateId: data.candidateId ?? null,
      voterKey: data.voterKey ?? null,
      ipHash: data.ipHash ?? null,
      details: data.details ?? null,
      actorEmail: data.actorEmail ?? null,
    });
  }

  async function loadContext(editionId: string, candidateId: string): Promise<{ ok: true; edition: Edition } | Fail> {
    const [edition] = await db.select().from(editions).where(eq(editions.id, editionId));
    if (!edition) return { ok: false, error: "vote_ferme" };
    const state = voteState(edition, now());
    if (state !== "ouvert") {
      const map: Record<Exclude<VoteState, "ouvert">, VoteError> = { ferme: "vote_ferme", a_venir: "vote_a_venir", suspendu: "vote_suspendu", clos: "vote_clos" };
      return { ok: false, error: map[state] };
    }
    const [cand] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
    if (!cand || cand.editionId !== edition.id || !cand.published || !cand.voteEnabled || cand.status === "elimine") {
      return { ok: false, error: "candidat_invalide" };
    }
    return { ok: true, edition };
  }

  function voterKeyFor(method: "code_email" | "code_sms" | "leger", identifier: string) {
    return hmac(`${method}:${identifier}`, "voter");
  }

  async function alreadyVoted(edition: Edition, voterKey: string) {
    const [row] = await db
      .select({ n: count() })
      .from(votes)
      .where(and(eq(votes.editionId, edition.id), eq(votes.voterKey, voterKey), eq(votes.period, votePeriod(edition, now()))));
    return (row?.n ?? 0) > 0;
  }

  async function insertVote(edition: Edition, candidateId: string, voterKey: string, method: Edition["voteMethod"], ctx: Ctx) {
    try {
      const [vote] = await db
        .insert(votes)
        .values({
          editionId: edition.id,
          candidateId,
          voterKey,
          method,
          period: votePeriod(edition, now()),
          ipHash: ctx.ipHash,
          userAgentHash: ctx.uaHash ?? null,
          createdAt: now(),
        })
        .returning({ id: votes.id });
      await log("vote_enregistre", { editionId: edition.id, candidateId, voterKey, ipHash: ctx.ipHash, details: { method, voteId: vote.id } });
      return { ok: true as const, voteId: vote.id };
    } catch (e) {
      const msg = String((e as Error)?.message ?? e) + String((e as { cause?: Error })?.cause?.message ?? "");
      if (/votes_unique_voter_period|duplicate key|unique/i.test(msg)) {
        await log("vote_refuse_doublon", { editionId: edition.id, candidateId, voterKey, ipHash: ctx.ipHash });
        return { ok: false as const, error: "deja_vote" as VoteError };
      }
      throw e;
    }
  }

  return {
    /** Étape 1 (méthodes à code) : envoi d'un code à usage unique. */
    async requestCode(input: { editionId: string; candidateId: string; identifier: string; captchaToken?: string | null }, ctx: Ctx) {
      const loaded = await loadContext(input.editionId, input.candidateId);
      if (!loaded.ok) return loaded;
      const { edition } = loaded;
      if (edition.voteMethod === "leger") return { ok: false as const, error: "methode_incorrecte" as VoteError };

      const captcha = await checkCaptcha(edition, input.captchaToken);
      if (captcha) return { ok: false as const, error: captcha };

      const identifier = edition.voteMethod === "code_email" ? normalizeEmail(input.identifier) : normalizePhone(input.identifier);
      if (!identifier) return { ok: false as const, error: "identifiant_invalide" as VoteError };
      const voterKey = voterKeyFor(edition.voteMethod, identifier);

      const ipOk = ctx.ipHash ? await rateLimit(db, `vote-code-ip:${ctx.ipHash}`, LIMITS.codesPerIpPerHour, 3600, now()) : { ok: true };
      const voterOk = await rateLimit(db, `vote-code-voter:${voterKey}`, LIMITS.codesPerVoterPer15Min, 900, now());
      if (!ipOk.ok || !voterOk.ok) {
        await log("code_refuse_frequence", { editionId: edition.id, voterKey, ipHash: ctx.ipHash });
        return { ok: false as const, error: "trop_de_demandes" as VoteError };
      }
      if (await alreadyVoted(edition, voterKey)) return { ok: false as const, error: "deja_vote" as VoteError };

      const code = randomDigits(6);
      const [row] = await db
        .insert(voteCodes)
        .values({
          editionId: edition.id,
          voterKey,
          codeHash: "pending",
          expiresAt: new Date(now().getTime() + CODE_TTL_MINUTES * 60_000),
          createdAt: now(),
        })
        .returning({ id: voteCodes.id });
      await db.update(voteCodes).set({ codeHash: hmac(code, `vote-code:${row.id}`) }).where(eq(voteCodes.id, row.id));

      const text = `Votre code de vote Génie des Lycées : ${code}. Il expire dans ${CODE_TTL_MINUTES} minutes. Si vous n'avez rien demandé, ignorez ce message.`;
      const result =
        edition.voteMethod === "code_email"
          ? await deps.sendEmail(identifier, "Votre code de vote — Génie des Lycées", text)
          : await deps.sendSms(identifier, text);

      await log("code_envoye", { editionId: edition.id, voterKey, ipHash: ctx.ipHash, details: { sent: result.sent, reason: result.reason ?? null } });
      if (result.sent) return { ok: true as const, delivered: true as const };
      if (deps.demoMode) return { ok: true as const, delivered: false as const, demoCode: code };
      return { ok: false as const, error: "envoi_impossible" as VoteError };
    },

    /** Étape 2 (méthodes à code) : vérification du code et enregistrement du suffrage. */
    async confirmVote(input: { editionId: string; candidateId: string; identifier: string; code: string }, ctx: Ctx) {
      const loaded = await loadContext(input.editionId, input.candidateId);
      if (!loaded.ok) return loaded;
      const { edition } = loaded;
      if (edition.voteMethod === "leger") return { ok: false as const, error: "methode_incorrecte" as VoteError };
      const identifier = edition.voteMethod === "code_email" ? normalizeEmail(input.identifier) : normalizePhone(input.identifier);
      if (!identifier) return { ok: false as const, error: "identifiant_invalide" as VoteError };
      const voterKey = voterKeyFor(edition.voteMethod, identifier);

      if (ctx.ipHash) {
        const lim = await rateLimit(db, `vote-confirm-ip:${ctx.ipHash}`, LIMITS.attemptsPerIpPerHour, 3600, now());
        if (!lim.ok) return { ok: false as const, error: "trop_de_demandes" as VoteError };
      }

      const [codeRow] = await db
        .select()
        .from(voteCodes)
        .where(and(eq(voteCodes.editionId, edition.id), eq(voteCodes.voterKey, voterKey), isNull(voteCodes.usedAt), gt(voteCodes.expiresAt, now())))
        .orderBy(desc(voteCodes.createdAt))
        .limit(1);
      if (!codeRow || codeRow.attempts >= CODE_MAX_ATTEMPTS) return { ok: false as const, error: "code_expire" as VoteError };

      const clean = input.code.replace(/\D/g, "");
      const match = clean.length === 6 && safeEqual(hmac(clean, `vote-code:${codeRow.id}`), codeRow.codeHash);
      if (!match) {
        await db.update(voteCodes).set({ attempts: sql`${voteCodes.attempts} + 1` }).where(eq(voteCodes.id, codeRow.id));
        await log("code_incorrect", { editionId: edition.id, voterKey, ipHash: ctx.ipHash });
        return { ok: false as const, error: "code_invalide" as VoteError };
      }
      // Consommation atomique du code : un seul usage possible même en cas de requêtes simultanées
      const consumed = await db
        .update(voteCodes)
        .set({ usedAt: now() })
        .where(and(eq(voteCodes.id, codeRow.id), isNull(voteCodes.usedAt)))
        .returning({ id: voteCodes.id });
      if (!consumed.length) return { ok: false as const, error: "code_expire" as VoteError };

      return insertVote(edition, input.candidateId, voterKey, edition.voteMethod, ctx);
    },

    /** Vote léger : un vote par appareil (jeton signé) et anti-robot. Ne vérifie pas l'identité. */
    async castLightVote(input: { editionId: string; candidateId: string; deviceToken: string; captchaToken?: string | null }, ctx: Ctx) {
      const loaded = await loadContext(input.editionId, input.candidateId);
      if (!loaded.ok) return loaded;
      const { edition } = loaded;
      if (edition.voteMethod !== "leger") return { ok: false as const, error: "methode_incorrecte" as VoteError };
      const captcha = await checkCaptcha(edition, input.captchaToken, true);
      if (captcha) return { ok: false as const, error: captcha };
      if (!/^[A-Za-z0-9_-]{20,100}$/.test(input.deviceToken)) return { ok: false as const, error: "identifiant_invalide" as VoteError };
      if (ctx.ipHash) {
        const lim = await rateLimit(db, `vote-light-ip:${ctx.ipHash}:${votePeriod(edition, now())}`, LIMITS.lightVotesPerIpPerDay, 86400, now());
        if (!lim.ok) {
          await log("vote_refuse_frequence", { editionId: edition.id, ipHash: ctx.ipHash });
          return { ok: false as const, error: "trop_de_demandes" as VoteError };
        }
      }
      return insertVote(edition, input.candidateId, voterKeyFor("leger", input.deviceToken), "leger", ctx);
    },

    async tally(editionId: string) {
      const rows = await db
        .select({ candidateId: votes.candidateId, total: count() })
        .from(votes)
        .leftJoin(voteInvalidations, eq(voteInvalidations.voteId, votes.id))
        .where(and(eq(votes.editionId, editionId), isNull(voteInvalidations.voteId)))
        .groupBy(votes.candidateId);
      return rows.sort((a, b) => b.total - a.total);
    },

    async stats(editionId: string) {
      const [{ total }] = await db.select({ total: count() }).from(votes).where(eq(votes.editionId, editionId));
      const [{ invalid }] = await db
        .select({ invalid: count() })
        .from(voteInvalidations)
        .innerJoin(votes, eq(votes.id, voteInvalidations.voteId))
        .where(eq(votes.editionId, editionId));
      return { total, invalid, valid: total - invalid };
    },

    async invalidate(voteId: string, reason: string, actor: { id: string; email: string }) {
      const trimmed = reason.trim();
      if (trimmed.length < 10) throw new Error("Motif d'invalidation obligatoire (10 caractères minimum).");
      const [vote] = await db.select().from(votes).where(eq(votes.id, voteId));
      if (!vote) throw new Error("Vote introuvable.");
      await db.insert(voteInvalidations).values({ voteId, reason: trimmed, invalidatedBy: actor.id, invalidatedByEmail: actor.email }).onConflictDoNothing();
      await log("vote_invalide", { editionId: vote.editionId, candidateId: vote.candidateId, voterKey: vote.voterKey, details: { voteId, reason: trimmed }, actorEmail: actor.email });
    },

    async setStatus(editionId: string, status: Edition["voteStatus"], actorEmail: string, note?: string) {
      await db.update(editions).set({ voteStatus: status }).where(eq(editions.id, editionId));
      await log(`statut_${status}`, { editionId, actorEmail, details: note ? { note } : undefined });
    },

    log,
  };

  async function checkCaptcha(edition: Edition, token: string | null | undefined, mandatory = false): Promise<VoteError | null> {
    if (!edition.voteRequireCaptcha && !mandatory) return null;
    const r = await deps.verifyCaptcha(token);
    if (r === "ok") return null;
    if (r === "non_configure") {
      // Sans fournisseur anti-robot : toléré en démonstration ou pour les méthodes à code
      // (le code e-mail/SMS joue déjà ce rôle) ; refusé pour le vote léger en production.
      if (deps.demoMode || !mandatory) return null;
      return "captcha_non_configure";
    }
    return token ? "captcha_invalide" : "captcha_requis";
  }
}

export type VoteService = ReturnType<typeof createVoteService>;

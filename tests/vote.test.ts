import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "./helpers";
import { createVoteService, normalizePhone, publicResultsVisible, voteState, type VoteDeps } from "@/lib/vote/service";
import * as s from "@/lib/db/schema";
import type { DB } from "@/lib/db";

let db: DB;
let close: () => Promise<void>;
let clock = new Date("2026-06-01T10:00:00Z");
const sent: Array<{ to: string; text: string }> = [];

function service(over: Partial<VoteDeps> = {}) {
  return createVoteService({
    db,
    now: () => clock,
    demoMode: false,
    sendEmail: async (to, _s, text) => {
      sent.push({ to, text });
      return { sent: true };
    },
    sendSms: async () => ({ sent: false, reason: "sms_non_configure" }),
    verifyCaptcha: async () => "non_configure",
    ...over,
  });
}
const lastCode = () => sent.at(-1)!.text.match(/(\d{6})/)![1];

let edition: typeof s.editions.$inferSelect;
let cand: typeof s.candidates.$inferSelect;
let other: typeof s.candidates.$inferSelect;
let archivedCandidate: typeof s.candidates.$inferSelect;
let ipCounter = 0;
const ctx = () => ({ ipHash: `ip-${++ipCounter}` });

beforeAll(async () => {
  ({ db, close } = await createTestDb({ now: clock }));
  [edition] = await db.select().from(s.editions).where(eq(s.editions.slug, "6e-edition"));
  const list = await db.select().from(s.candidates).where(eq(s.candidates.editionId, edition.id));
  [cand, other] = list;
  const [archived] = await db.select().from(s.editions).where(eq(s.editions.slug, "5e-edition"));
  [archivedCandidate] = await db
    .insert(s.candidates)
    .values({ slug: "ancien-candidat-5e", editionId: archived.id, categoryId: cand.categoryId, firstName: "Ancien", lastName: "Candidat" })
    .returning();
});
afterAll(async () => close());
beforeEach(async () => {
  clock = new Date("2026-06-01T10:00:00Z");
  await db.update(s.editions).set({ voteStatus: "ouvert", voteMethod: "code_email", voteScope: "une_fois_par_jour", voteOpensAt: new Date("2026-05-30T08:00:00Z"), voteClosesAt: new Date("2026-06-20T22:00:00Z"), voteRequireCaptcha: true }).where(eq(s.editions.id, edition.id));
  [edition] = await db.select().from(s.editions).where(eq(s.editions.id, edition.id));
});

describe("état du vote", () => {
  it("respecte ouverture, suspension et clôture automatique", () => {
    const base = { voteStatus: "ouvert" as const, voteOpensAt: new Date("2026-06-01T00:00:00Z"), voteClosesAt: new Date("2026-06-10T00:00:00Z") };
    expect(voteState(base, new Date("2026-05-31T00:00:00Z"))).toBe("a_venir");
    expect(voteState(base, new Date("2026-06-05T00:00:00Z"))).toBe("ouvert");
    expect(voteState(base, new Date("2026-06-10T00:00:00Z"))).toBe("clos");
    expect(voteState({ ...base, voteStatus: "suspendu" }, new Date("2026-06-05T00:00:00Z"))).toBe("suspendu");
    expect(voteState({ ...base, voteStatus: "ferme" }, new Date("2026-06-05T00:00:00Z"))).toBe("ferme");
  });
  it("ne publie pas de résultats partiels quand c'est interdit", () => {
    const e = { voteStatus: "ouvert" as const, voteOpensAt: null, voteClosesAt: new Date("2026-06-10T00:00:00Z") };
    const during = new Date("2026-06-05T00:00:00Z");
    const after = new Date("2026-06-11T00:00:00Z");
    expect(publicResultsVisible({ ...e, resultsVisibility: "apres_cloture" }, during)).toBe(false);
    expect(publicResultsVisible({ ...e, resultsVisibility: "apres_cloture" }, after)).toBe(true);
    expect(publicResultsVisible({ ...e, resultsVisibility: "jamais" }, after)).toBe(false);
    expect(publicResultsVisible({ ...e, resultsVisibility: "en_direct" }, during)).toBe(true);
  });
  it("normalise les numéros togolais", () => {
    expect(normalizePhone("90 12 34 56")).toBe("+22890123456");
    expect(normalizePhone("0022890123456")).toBe("+22890123456");
    expect(normalizePhone("123")).toBeNull();
  });
});

describe("vote par code e-mail", () => {
  it("enregistre un vote après un code valide, puis refuse le doublon le même jour", async () => {
    const svc = service();
    const c = ctx();
    const r1 = await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "Votant@Example.org" }, c);
    expect(r1.ok).toBe(true);
    const r2 = await svc.confirmVote({ editionId: edition.id, candidateId: cand.id, identifier: "votant@example.org", code: lastCode() }, c);
    expect(r2.ok).toBe(true);
    const again = await svc.requestCode({ editionId: edition.id, candidateId: other.id, identifier: "votant@example.org" }, ctx());
    expect(again).toEqual({ ok: false, error: "deja_vote" });
  });

  it("autorise un nouveau vote le lendemain quand la règle est « une fois par jour »", async () => {
    const svc = service();
    await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "jour@example.org" }, ctx());
    expect((await svc.confirmVote({ editionId: edition.id, candidateId: cand.id, identifier: "jour@example.org", code: lastCode() }, ctx())).ok).toBe(true);
    clock = new Date("2026-06-02T10:00:00Z");
    await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "jour@example.org" }, ctx());
    expect((await svc.confirmVote({ editionId: edition.id, candidateId: cand.id, identifier: "jour@example.org", code: lastCode() }, ctx())).ok).toBe(true);
  });

  it("refuse un second vote sur toute l'édition quand la règle est « une fois par édition »", async () => {
    await db.update(s.editions).set({ voteScope: "une_fois_par_edition" }).where(eq(s.editions.id, edition.id));
    const svc = service();
    await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "unique@example.org" }, ctx());
    expect((await svc.confirmVote({ editionId: edition.id, candidateId: cand.id, identifier: "unique@example.org", code: lastCode() }, ctx())).ok).toBe(true);
    clock = new Date("2026-06-05T10:00:00Z");
    expect(await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "unique@example.org" }, ctx())).toEqual({ ok: false, error: "deja_vote" });
  });

  it("refuse un code incorrect et bloque après 5 essais", async () => {
    const svc = service();
    await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "essais@example.org" }, ctx());
    const good = lastCode();
    const bad = good === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      const r = await svc.confirmVote({ editionId: edition.id, candidateId: cand.id, identifier: "essais@example.org", code: bad }, ctx());
      expect(r).toEqual({ ok: false, error: "code_invalide" });
    }
    const r = await svc.confirmVote({ editionId: edition.id, candidateId: cand.id, identifier: "essais@example.org", code: good }, ctx());
    expect(r).toEqual({ ok: false, error: "code_expire" });
  });

  it("refuse un code expiré", async () => {
    const svc = service();
    await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "expire@example.org" }, ctx());
    clock = new Date(clock.getTime() + 11 * 60_000);
    const r = await svc.confirmVote({ editionId: edition.id, candidateId: cand.id, identifier: "expire@example.org", code: lastCode() }, ctx());
    expect(r).toEqual({ ok: false, error: "code_expire" });
  });

  it("un code ne sert qu'une fois", async () => {
    const svc = service();
    const c = ctx();
    await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "once@example.org" }, c);
    const code = lastCode();
    expect((await svc.confirmVote({ editionId: edition.id, candidateId: cand.id, identifier: "once@example.org", code }, c)).ok).toBe(true);
    expect(await svc.confirmVote({ editionId: edition.id, candidateId: cand.id, identifier: "once@example.org", code }, c)).toEqual({ ok: false, error: "code_expire" });
  });

  it("limite les demandes de code par votant", async () => {
    const svc = service();
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "spam@example.org" }, ctx()));
    expect(results.slice(0, 3).every((r) => r.ok)).toBe(true);
    expect(results[3]).toEqual({ ok: false, error: "trop_de_demandes" });
  });

  it("refuse un candidat d'une autre édition et un vote suspendu ou clos", async () => {
    const svc = service();
    expect(await svc.requestCode({ editionId: edition.id, candidateId: archivedCandidate.id, identifier: "x@example.org" }, ctx())).toEqual({ ok: false, error: "candidat_invalide" });
    await db.update(s.editions).set({ voteStatus: "suspendu" }).where(eq(s.editions.id, edition.id));
    expect(await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "x@example.org" }, ctx())).toEqual({ ok: false, error: "vote_suspendu" });
    await db.update(s.editions).set({ voteStatus: "ouvert" }).where(eq(s.editions.id, edition.id));
    clock = new Date("2026-06-21T00:00:00Z");
    expect(await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "x@example.org" }, ctx())).toEqual({ ok: false, error: "vote_clos" });
  });

  it("n'affiche jamais le code hors mode démo si l'envoi échoue", async () => {
    const failing = service({ sendEmail: async () => ({ sent: false, reason: "email_non_configure" }) });
    expect(await failing.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "nodemo@example.org" }, ctx())).toEqual({ ok: false, error: "envoi_impossible" });
    const demo = service({ demoMode: true, sendEmail: async () => ({ sent: false }) });
    const r = await demo.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "demo@example.org" }, ctx());
    expect(r.ok && "demoCode" in r && /^\d{6}$/.test(r.demoCode!)).toBe(true);
  });
});

describe("intégrité", () => {
  it("interdit toute modification ou suppression d'un suffrage, même directement en base", async () => {
    const svc = service();
    await svc.requestCode({ editionId: edition.id, candidateId: cand.id, identifier: "immuable@example.org" }, ctx());
    const r = await svc.confirmVote({ editionId: edition.id, candidateId: cand.id, identifier: "immuable@example.org", code: lastCode() }, ctx());
    if (!r.ok) throw new Error("vote attendu");
    const voteId = (r as { voteId: string }).voteId;
    await expect(db.update(s.votes).set({ candidateId: other.id }).where(eq(s.votes.id, voteId))).rejects.toThrow();
    await expect(db.delete(s.votes).where(eq(s.votes.id, voteId))).rejects.toThrow();
  });

  it("l'invalidation est motivée, journalisée et exclue du décompte", async () => {
    const svc = service();
    const before = (await svc.tally(edition.id)).find((t) => t.candidateId === other.id)?.total ?? 0;
    await svc.requestCode({ editionId: edition.id, candidateId: other.id, identifier: "fraude@example.org" }, ctx());
    const r = (await svc.confirmVote({ editionId: edition.id, candidateId: other.id, identifier: "fraude@example.org", code: lastCode() }, ctx())) as { ok: true; voteId: string };
    expect((await svc.tally(edition.id)).find((t) => t.candidateId === other.id)?.total).toBe(before + 1);
    await expect(svc.invalidate(r.voteId, "court", { id: "00000000-0000-0000-0000-000000000000", email: "a@b.c" })).rejects.toThrow();
    const [admin] = await db.select().from(s.users);
    await svc.invalidate(r.voteId, "Adresse jetable détectée dans une série", { id: admin.id, email: admin.email });
    expect((await svc.tally(edition.id)).find((t) => t.candidateId === other.id)?.total ?? 0).toBe(before);
    const events = await db.select().from(s.voteEvents).where(eq(s.voteEvents.type, "vote_invalide"));
    expect(events.length).toBe(1);
    await expect(db.delete(s.voteInvalidations)).rejects.toThrow();
  });

  it("le vote léger exige la bonne méthode et bloque le second vote du même appareil", async () => {
    await db.update(s.editions).set({ voteMethod: "leger" }).where(eq(s.editions.id, edition.id));
    const svc = service({ demoMode: true });
    const token = "device_token_abcdefghijklmnopqrstuv";
    expect((await svc.castLightVote({ editionId: edition.id, candidateId: cand.id, deviceToken: token }, ctx())).ok).toBe(true);
    expect(await svc.castLightVote({ editionId: edition.id, candidateId: other.id, deviceToken: token }, ctx())).toEqual({ ok: false, error: "deja_vote" });
    const prod = service({ demoMode: false });
    expect(await prod.castLightVote({ editionId: edition.id, candidateId: cand.id, deviceToken: "another_device_token_123456789" }, ctx())).toEqual({ ok: false, error: "captcha_non_configure" });
  });
});

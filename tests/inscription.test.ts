import { describe, expect, it } from "vitest";
import { inscriptionSchema, makeDossierNumber, validateTeam } from "@/lib/inscriptions/validation";
import { csvEscape } from "@/lib/utils";
import { sniffMime } from "@/lib/storage";

const year = new Date().getFullYear();
const base = {
  categorySlug: "lycees",
  schoolId: "00000000-0000-0000-0000-000000000001",
  firstName: "Abla",
  lastName: "Lawson",
  birthDate: `${year - 20}-01-15`,
  level: "Terminale A4",
  city: "Lomé",
  phone: "90 12 34 56",
  email: "Abla@Example.org",
  consentData: "on",
  consentRules: "on",
};

describe("validation des inscriptions", () => {
  it("accepte un dossier majeur complet et normalise e-mail et téléphone", () => {
    const r = inscriptionSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("abla@example.org");
      expect(r.data.phone).toBe("90123456");
    }
  });

  it("exige l'accord et les coordonnées d'un parent pour un mineur", () => {
    const r = inscriptionSchema.safeParse({ ...base, birthDate: `${year - 15}-03-01` });
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["guardianName", "guardianPhone", "guardianRelation", "consentGuardian"]));
    const ok = inscriptionSchema.safeParse({ ...base, birthDate: `${year - 15}-03-01`, guardianName: "Parent", guardianPhone: "91 00 00 00", guardianRelation: "Père", consentGuardian: "on" });
    expect(ok.success).toBe(true);
  });

  it("refuse sans accord au règlement ni au traitement des données", () => {
    const r = inscriptionSchema.safeParse({ ...base, consentData: undefined, consentRules: undefined });
    expect(r.success).toBe(false);
  });

  it("refuse un e-mail ou un téléphone invalide, et un établissement manquant", () => {
    expect(inscriptionSchema.safeParse({ ...base, email: "pas-un-mail" }).success).toBe(false);
    expect(inscriptionSchema.safeParse({ ...base, phone: "12" }).success).toBe(false);
    expect(inscriptionSchema.safeParse({ ...base, schoolId: undefined }).success).toBe(false);
    expect(inscriptionSchema.safeParse({ ...base, schoolId: undefined, schoolNameFree: "Lycée X" }).success).toBe(true);
  });

  it("contrôle la taille des équipes universitaires", () => {
    const cat = { teamMode: true, teamSizeMin: 2, teamSizeMax: 3 };
    const parse = (members: { firstName: string; lastName: string }[], teamName?: string) => {
      const r = inscriptionSchema.parse({ ...base, categorySlug: "universites", teamName, teamMembers: members });
      return validateTeam(r, cat);
    };
    expect(parse([], "Agora")).toHaveProperty("teamMembers");
    expect(parse([{ firstName: "A", lastName: "B" }])).toHaveProperty("teamName");
    expect(parse([{ firstName: "A", lastName: "B" }], "Agora")).toEqual({});
    expect(parse([{ firstName: "A", lastName: "B" }, { firstName: "C", lastName: "D" }, { firstName: "E", lastName: "F" }], "Agora")).toHaveProperty("teamMembers");
  });

  it("génère des numéros de dossier lisibles", () => {
    expect(makeDossierNumber(2026)).toMatch(/^GDL26-[2-9A-HJ-NP-Z]{6}$/);
  });
});

describe("sécurité des fichiers et exports", () => {
  it("détecte le vrai type d'un fichier par sa signature", () => {
    expect(sniffMime(Buffer.from("%PDF-1.7 xxxxxxxx"))).toBe("application/pdf");
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(sniffMime(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });
  it("neutralise les formules dans les exports CSV", () => {
    expect(csvEscape("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvEscape("Lomé; Togo")).toBe('"Lomé; Togo"');
  });
});

import { describe, expect, it } from "vitest";
import { can, canPublishResults, ROLES } from "@/lib/auth/permissions";

describe("rôles et permissions", () => {
  it("le super-administrateur peut tout faire", () => {
    for (const r of ["users", "settings", "audit", "vote", "inscriptions", "results"] as const) {
      expect(can("super_admin", r, "write")).toBe(true);
      expect(can("super_admin", r, "delete")).toBe(true);
    }
    expect(canPublishResults("super_admin")).toBe(true);
  });

  it("le lecteur des statistiques ne voit que le tableau de bord", () => {
    expect(can("statistiques", "dashboard", "read")).toBe(true);
    for (const r of ["inscriptions", "vote", "candidates", "users", "articles", "results"] as const) expect(can("statistiques", r, "read")).toBe(false);
  });

  it("le responsable des candidatures gère les dossiers mais pas le vote ni les contenus", () => {
    expect(can("candidatures", "inscriptions", "write")).toBe(true);
    expect(can("candidatures", "inscriptions", "export")).toBe(true);
    expect(can("candidatures", "inscriptions", "delete")).toBe(false);
    expect(can("candidatures", "vote", "read")).toBe(false);
    expect(can("candidatures", "articles", "write")).toBe(false);
    expect(can("candidatures", "users", "read")).toBe(false);
  });

  it("l'éditeur publie les contenus mais n'accède pas aux dossiers ni au vote", () => {
    expect(can("editeur", "articles", "publish")).toBe(true);
    expect(can("editeur", "testimonials", "publish")).toBe(true);
    expect(can("editeur", "inscriptions", "read")).toBe(false);
    expect(can("editeur", "vote", "read")).toBe(false);
    expect(can("editeur", "results", "write")).toBe(false);
  });

  it("le responsable du vote prépare les résultats sans pouvoir les publier", () => {
    expect(can("vote", "vote", "write")).toBe(true);
    expect(can("vote", "results", "write")).toBe(true);
    expect(canPublishResults("vote")).toBe(false);
    expect(can("vote", "inscriptions", "read")).toBe(false);
  });

  it("personne d'autre que le super-administrateur ne gère les comptes, paramètres et journal", () => {
    for (const r of ROLES.filter((x) => x !== "super_admin")) {
      expect(can(r, "users", "read")).toBe(false);
      expect(can(r, "settings", "write")).toBe(false);
      expect(can(r, "audit", "read")).toBe(false);
    }
    expect(can(null, "dashboard", "read")).toBe(false);
  });
});

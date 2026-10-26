import { z } from "zod";
import { ageAt } from "@/lib/utils";

/** Âge de la majorité retenu pour exiger l'accord d'un parent ou tuteur. */
export const MAJORITY_AGE = 18;

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ""))
  .refine((v) => /^(\+|00)?\d{8,15}$/.test(v), "Numéro invalide : 8 chiffres pour le Togo, ou indicatif international.");

const text = (max: number, msg = "Champ obligatoire") => z.string().trim().min(1, msg).max(max, `${max} caractères maximum`);
const optionalText = (max: number) => z.string().trim().max(max, `${max} caractères maximum`).optional().transform((v) => v || undefined);
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

export const inscriptionSchema = z
  .object({
    categorySlug: z.string().min(1, "Choisissez une catégorie"),
    schoolId: z.string().optional(),
    schoolNameFree: optionalText(160),
    firstName: text(80, "Indiquez le prénom"),
    lastName: text(80, "Indiquez le nom"),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Indiquez la date de naissance"),
    level: text(80, "Indiquez la classe ou le niveau d'études"),
    city: text(80, "Indiquez la ville"),
    phone,
    email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(200),
    motivation: optionalText(1200),
    teamName: optionalText(80),
    teamMembers: z
      .array(z.object({ firstName: z.string().trim().max(80), lastName: z.string().trim().max(80), level: z.string().trim().max(80).optional() }))
      .optional()
      .transform((list) => list?.filter((m) => m.firstName || m.lastName)),
    guardianName: optionalText(120),
    guardianPhone: z.string().trim().optional().transform((v) => (v ? v.replace(/[\s.\-()]/g, "") : undefined)),
    guardianRelation: optionalText(60),
    consentData: checkbox.refine((v) => v, "Votre accord est nécessaire pour traiter l'inscription"),
    consentRules: checkbox.refine((v) => v, "Le règlement doit être accepté"),
    consentGuardian: checkbox,
    consentImage: checkbox,
  })
  .superRefine((d, ctx) => {
    const age = /^\d{4}-\d{2}-\d{2}$/.test(d.birthDate) ? ageAt(d.birthDate) : NaN;
    if (Number.isNaN(age) || age < 10 || age > 40) ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Date de naissance improbable : vérifiez l'année" });
    if (!d.schoolId && !d.schoolNameFree) ctx.addIssue({ code: "custom", path: ["schoolId"], message: "Choisissez l'établissement ou saisissez son nom" });
    if (age < MAJORITY_AGE) {
      if (!d.guardianName) ctx.addIssue({ code: "custom", path: ["guardianName"], message: "Nom du parent ou tuteur obligatoire pour un mineur" });
      if (!d.guardianPhone || !/^(\+|00)?\d{8,15}$/.test(d.guardianPhone)) ctx.addIssue({ code: "custom", path: ["guardianPhone"], message: "Téléphone du parent ou tuteur obligatoire pour un mineur" });
      if (!d.guardianRelation) ctx.addIssue({ code: "custom", path: ["guardianRelation"], message: "Précisez le lien avec le candidat" });
      if (!d.consentGuardian) ctx.addIssue({ code: "custom", path: ["consentGuardian"], message: "L'accord du parent ou tuteur est obligatoire pour un mineur" });
    }
  });

export type InscriptionInput = z.input<typeof inscriptionSchema>;
export type InscriptionData = z.output<typeof inscriptionSchema>;

export function validateTeam(data: InscriptionData, cat: { teamMode: boolean; teamSizeMin: number | null; teamSizeMax: number | null }): Record<string, string> {
  if (!cat.teamMode) return {};
  const errors: Record<string, string> = {};
  if (!data.teamName) errors.teamName = "Donnez un nom à l'équipe";
  const size = 1 + (data.teamMembers?.length ?? 0);
  if (cat.teamSizeMin && size < cat.teamSizeMin) errors.teamMembers = `L'équipe doit compter au moins ${cat.teamSizeMin} membres (vous compris).`;
  if (cat.teamSizeMax && size > cat.teamSizeMax) errors.teamMembers = `L'équipe ne peut pas dépasser ${cat.teamSizeMax} membres.`;
  if (data.teamMembers?.some((m) => !m.firstName || !m.lastName)) errors.teamMembers = "Indiquez le prénom et le nom de chaque membre.";
  return errors;
}

/** Numéro de dossier lisible, sans caractères ambigus (0/O, 1/I). */
export function makeDossierNumber(year: number, random: () => number = Math.random) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(random() * alphabet.length)];
  return `GDL${String(year).slice(-2)}-${code}`;
}

export const INSCRIPTION_STATUS_LABELS = {
  soumis: "Dossier reçu",
  en_verification: "En cours de vérification",
  incomplet: "Dossier incomplet",
  accepte: "Candidature acceptée",
  refuse: "Candidature non retenue",
} as const;

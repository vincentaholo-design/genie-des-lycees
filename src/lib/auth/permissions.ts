/**
 * Matrice des rôles. Chaque rôle n'accède qu'aux fonctions autorisées.
 * Vérifiée côté serveur à chaque action (jamais seulement dans l'interface).
 */
export const ROLES = ["super_admin", "candidatures", "editeur", "vote", "statistiques"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super-administrateur",
  candidatures: "Responsable des candidatures",
  editeur: "Éditeur de contenu",
  vote: "Responsable du vote",
  statistiques: "Lecteur des statistiques",
};

export type Resource =
  | "dashboard"
  | "editions"
  | "announcements"
  | "categories"
  | "schools"
  | "candidates"
  | "inscriptions"
  | "albums"
  | "media"
  | "videos"
  | "testimonials"
  | "articles"
  | "partners"
  | "partnerTiers"
  | "faqs"
  | "messages"
  | "results"
  | "vote"
  | "users"
  | "settings"
  | "audit";

export type Action = "read" | "write" | "delete" | "export" | "publish";

type Matrix = Partial<Record<Resource, Action[]>>;

const ALL: Action[] = ["read", "write", "delete", "export", "publish"];
const RW: Action[] = ["read", "write"];
const RWD: Action[] = ["read", "write", "delete"];

const MATRIX: Record<Exclude<Role, "super_admin">, Matrix> = {
  candidatures: {
    dashboard: ["read"],
    editions: ["read"],
    categories: ["read"],
    schools: RWD,
    candidates: RWD,
    inscriptions: ["read", "write", "export"],
  },
  editeur: {
    dashboard: ["read"],
    editions: RW,
    announcements: RWD,
    categories: RW,
    schools: ["read"],
    candidates: ["read"],
    albums: RWD,
    media: RWD,
    videos: RWD,
    testimonials: [...RWD, "publish"],
    articles: [...RWD, "publish"],
    partners: RWD,
    partnerTiers: RWD,
    faqs: RWD,
    messages: ["read", "write", "export"],
  },
  vote: {
    dashboard: ["read"],
    editions: ["read"],
    candidates: ["read"],
    vote: ["read", "write", "export"],
    results: ["read", "write", "export"],
  },
  statistiques: {
    dashboard: ["read"],
  },
};

export function can(role: Role | null | undefined, resource: Resource, action: Action = "read"): boolean {
  if (!role) return false;
  if (role === "super_admin") return ALL.includes(action);
  return MATRIX[role]?.[resource]?.includes(action) ?? false;
}

/**
 * Seul le super-administrateur publie des résultats officiels
 * (le responsable du vote les prépare).
 */
export function canPublishResults(role: Role | null | undefined) {
  return role === "super_admin";
}

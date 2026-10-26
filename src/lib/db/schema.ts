/**
 * Schéma de données — Génie des Lycées ORATHON
 * PostgreSQL (Supabase en production, PGlite embarqué en local / démo).
 *
 * Conventions :
 * - `isDemo` marque les contenus fictifs de démonstration (affichés avec un badge « Démo »).
 * - Les votes sont en insertion seule (trigger dans la migration 0001) : aucune mise à jour
 *   ni suppression n'est possible, même pour un administrateur. Une invalidation est
 *   enregistrée dans `vote_invalidations`, avec motif et auteur.
 */
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const roleEnum = pgEnum("role", [
  "super_admin",
  "candidatures",
  "editeur",
  "vote",
  "statistiques",
]);

export const editionStatusEnum = pgEnum("edition_status", ["brouillon", "en_cours", "archivee"]);

export const voteStatusEnum = pgEnum("vote_status", ["ferme", "ouvert", "suspendu"]);

export const voteMethodEnum = pgEnum("vote_method", ["code_email", "code_sms", "leger"]);

export const voteScopeEnum = pgEnum("vote_scope", ["une_fois_par_edition", "une_fois_par_jour"]);

export const resultsVisibilityEnum = pgEnum("results_visibility", [
  "jamais",
  "apres_cloture",
  "en_direct",
]);

export const candidateStatusEnum = pgEnum("candidate_status", [
  "inscrit",
  "retenu",
  "demi_finaliste",
  "finaliste",
  "laureat",
  "elimine",
]);

export const inscriptionStatusEnum = pgEnum("inscription_status", [
  "soumis",
  "en_verification",
  "incomplet",
  "accepte",
  "refuse",
]);

export const albumTypeEnum = pgEnum("album_type", [
  "ouverture",
  "eliminatoires",
  "demi_finales",
  "finale",
  "remise_des_prix",
  "coulisses",
  "portraits",
  "autre",
]);

export const videoTypeEnum = pgEnum("video_type", [
  "discours",
  "interview",
  "temoignage",
  "moments_forts",
  "ceremonie",
  "autre",
]);

export const publicationStatusEnum = pgEnum("publication_status", ["brouillon", "publie"]);

export const messageTypeEnum = pgEnum("message_type", ["contact", "partenariat"]);

/* ------------------------------------------------------------------ */
/* Utilisateurs & sécurité                                             */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("statistiques"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Journal des actions sensibles de l'administration. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userEmail: text("user_email"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

/** Limitation de fréquence (fenêtre fixe) stockée côté serveur. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export const notifications = pgTable("notifications", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  role: roleEnum("role"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

/* ------------------------------------------------------------------ */
/* Concours                                                            */
/* ------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  description: text("description"),
  eligibility: text("eligibility"),
  /** Mode de participation : individuel ou équipe (catégorie universités). */
  teamMode: boolean("team_mode").notNull().default(false),
  teamSizeMin: integer("team_size_min"),
  teamSizeMax: integer("team_size_max"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type EditionStep = { label: string; date?: string; description?: string };
export type EvaluationCriterion = { label: string; weight?: number; description?: string };

export const editions = pgTable("editions", {
  id: id(),
  slug: text("slug").notNull().unique(),
  /** Numéro de l'édition (1re, 2e… 5e). */
  number: integer("number"),
  /** Année, si connue (laisser vide plutôt que d'inventer). */
  year: integer("year"),
  title: text("title").notNull(),
  theme: text("theme"),
  summary: text("summary"),
  rules: text("rules"),
  registrationInfo: text("registration_info"),
  status: editionStatusEnum("status").notNull().default("brouillon"),
  coverUrl: text("cover_url"),
  /** Date de l'événement mis en avant par le compte à rebours. */
  countdownLabel: text("countdown_label"),
  countdownAt: timestamp("countdown_at", { withTimezone: true }),
  steps: jsonb("steps").$type<EditionStep[]>().notNull().default([]),
  criteria: jsonb("criteria").$type<EvaluationCriterion[]>().notNull().default([]),
  registrationOpen: boolean("registration_open").notNull().default(false),
  registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
  /* Vote du public */
  voteStatus: voteStatusEnum("vote_status").notNull().default("ferme"),
  voteOpensAt: timestamp("vote_opens_at", { withTimezone: true }),
  voteClosesAt: timestamp("vote_closes_at", { withTimezone: true }),
  voteMethod: voteMethodEnum("vote_method").notNull().default("code_email"),
  voteScope: voteScopeEnum("vote_scope").notNull().default("une_fois_par_edition"),
  voteInstructions: text("vote_instructions"),
  voteRequireCaptcha: boolean("vote_require_captcha").notNull().default(true),
  resultsVisibility: resultsVisibilityEnum("results_visibility").notNull().default("jamais"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const announcements = pgTable("announcements", {
  id: id(),
  editionId: uuid("edition_id")
    .notNull()
    .references(() => editions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  status: publicationStatusEnum("status").notNull().default("publie"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
});

export const schools = pgTable(
  "schools",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("lycee"), // lycee | universite | autre
    city: text("city"),
    region: text("region"),
    logoUrl: text("logo_url"),
    description: text("description"),
    published: boolean("published").notNull().default(true),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("schools_city_idx").on(t.city), index("schools_region_idx").on(t.region)],
);

/** Participation d'un établissement à une édition. */
export const editionSchools = pgTable(
  "edition_schools",
  {
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.editionId, t.schoolId] })],
);

export const candidates = pgTable(
  "candidates",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    inscriptionId: uuid("inscription_id"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    /** Nom d'équipe (catégorie universités en mode équipe). */
    teamName: text("team_name"),
    portraitUrl: text("portrait_url"),
    /** Position du recadrage du portrait (CSS object-position), ex. « 50% 30% ». */
    portraitFocus: text("portrait_focus").default("50% 30%"),
    level: text("level"),
    shortBio: text("short_bio"),
    presentation: text("presentation"),
    quote: text("quote"),
    journey: text("journey"),
    status: candidateStatusEnum("status").notNull().default("retenu"),
    voteEnabled: boolean("vote_enabled").notNull().default(true),
    published: boolean("published").notNull().default(true),
    /** Consentement à la diffusion de l'image (obligatoire pour afficher le portrait). */
    imageConsent: boolean("image_consent").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("candidates_edition_idx").on(t.editionId),
    index("candidates_school_idx").on(t.schoolId),
    index("candidates_category_idx").on(t.categoryId),
  ],
);

/* ------------------------------------------------------------------ */
/* Inscriptions                                                        */
/* ------------------------------------------------------------------ */

export type TeamMember = { firstName: string; lastName: string; level?: string };

export const inscriptions = pgTable(
  "inscriptions",
  {
    id: id(),
    dossierNumber: text("dossier_number").notNull().unique(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    schoolNameFree: text("school_name_free"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    birthDate: date("birth_date").notNull(),
    level: text("level").notNull(),
    city: text("city").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    teamName: text("team_name"),
    teamMembers: jsonb("team_members").$type<TeamMember[]>(),
    motivation: text("motivation"),
    isMinor: boolean("is_minor").notNull(),
    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),
    guardianRelation: text("guardian_relation"),
    consentData: boolean("consent_data").notNull(),
    consentRules: boolean("consent_rules").notNull(),
    consentGuardian: boolean("consent_guardian").notNull().default(false),
    consentImage: boolean("consent_image").notNull().default(false),
    status: inscriptionStatusEnum("status").notNull().default("soumis"),
    reviewNote: text("review_note"),
    /** Message visible par le candidat sur la page de suivi. */
    publicNote: text("public_note"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ipHash: text("ip_hash"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("inscriptions_edition_idx").on(t.editionId),
    index("inscriptions_status_idx").on(t.status),
    index("inscriptions_email_idx").on(t.email),
  ],
);

/** Pièces justificatives — stockées en privé, servies uniquement à l'administration. */
export const documents = pgTable("documents", {
  id: id(),
  inscriptionId: uuid("inscription_id")
    .notNull()
    .references(() => inscriptions.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // justificatif_scolaire | autorisation_parentale | autre
  storagePath: text("storage_path").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Médias & contenus                                                   */
/* ------------------------------------------------------------------ */

export const albums = pgTable("albums", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  type: albumTypeEnum("type").notNull().default("autre"),
  description: text("description"),
  eventDate: date("event_date"),
  editionId: uuid("edition_id").references(() => editions.id, { onDelete: "set null" }),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
  coverUrl: text("cover_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  status: publicationStatusEnum("status").notNull().default("publie"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const media = pgTable(
  "media",
  {
    id: id(),
    albumId: uuid("album_id").references(() => albums.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "set null" }),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    thumbUrl: text("thumb_url"),
    width: integer("width"),
    height: integer("height"),
    alt: text("alt").notNull().default(""),
    caption: text("caption"),
    credit: text("credit"),
    downloadable: boolean("downloadable").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("media_album_idx").on(t.albumId)],
);

export const videos = pgTable("videos", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  type: videoTypeEnum("type").notNull().default("autre"),
  /** youtube | fichier */
  provider: text("provider").notNull().default("youtube"),
  youtubeId: text("youtube_id"),
  /** Adresse externe d'un fichier vidéo (CDN, autre hébergeur). */
  fileUrl: text("file_url"),
  /** Fichier téléversé : clé dans le stockage privé « videos » (servi par /api/videos/[id]/fichier). */
  fileKey: text("file_key"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  /** Le public peut télécharger le fichier. */
  downloadable: boolean("downloadable").notNull().default(false),
  thumbnailUrl: text("thumbnail_url"),
  /** Vidéo proposée par le public : en attente de modération (statut brouillon). */
  submitterName: text("submitter_name"),
  submitterEmail: text("submitter_email"),
  submitterNote: text("submitter_note"),
  rightsConsent: boolean("rights_consent").notNull().default(false),
  durationSeconds: integer("duration_seconds"),
  editionId: uuid("edition_id").references(() => editions.id, { onDelete: "set null" }),
  candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "set null" }),
  schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
  /** Date de publication d'origine, si connue (laisser vide plutôt que d'inventer). */
  publishedAt: timestamp("published_at", { withTimezone: true }),
  status: publicationStatusEnum("status").notNull().default("publie"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const testimonials = pgTable("testimonials", {
  id: id(),
  name: text("name").notNull(),
  role: text("role"), // ancien candidat, lauréat, enseignant, organisateur, partenaire
  organisation: text("organisation"),
  quote: text("quote").notNull(),
  portraitUrl: text("portrait_url"),
  youtubeId: text("youtube_id"),
  editionId: uuid("edition_id").references(() => editions.id, { onDelete: "set null" }),
  status: publicationStatusEnum("status").notNull().default("brouillon"),
  sortOrder: integer("sort_order").notNull().default(0),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const articles = pgTable(
  "articles",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    body: text("body").notNull().default(""),
    coverUrl: text("cover_url"),
    coverAlt: text("cover_alt"),
    author: text("author"),
    category: text("category"),
    editionId: uuid("edition_id").references(() => editions.id, { onDelete: "set null" }),
    status: publicationStatusEnum("status").notNull().default("brouillon"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("articles_published_idx").on(t.publishedAt)],
);

export const partnerTiers = pgTable("partner_tiers", {
  id: id(),
  name: text("name").notNull(),
  rank: integer("rank").notNull().default(0),
  createdAt: createdAt(),
});

export const partners = pgTable("partners", {
  id: id(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  website: text("website"),
  tierId: uuid("tier_id").references(() => partnerTiers.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const faqs = pgTable("faqs", {
  id: id(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  topic: text("topic"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const messages = pgTable("messages", {
  id: id(),
  type: messageTypeEnum("type").notNull().default("contact"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  organisation: text("organisation"),
  subject: text("subject"),
  body: text("body").notNull(),
  handled: boolean("handled").notNull().default(false),
  ipHash: text("ip_hash"),
  createdAt: createdAt(),
});

/* ------------------------------------------------------------------ */
/* Vote du public                                                      */
/* ------------------------------------------------------------------ */

/** Codes de vérification (e-mail / SMS). Seul le hachage du code est stocké. */
export const voteCodes = pgTable(
  "vote_codes",
  {
    id: id(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "cascade" }),
    voterKey: text("voter_key").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("vote_codes_voter_idx").on(t.editionId, t.voterKey)],
);

/**
 * Suffrages. Insertion seule (trigger `votes_immutable`).
 * `voterKey` = HMAC(secret, identifiant normalisé) : l'e-mail ou le numéro n'est jamais stocké en clair.
 * `period` = « edition » ou la date (AAAA-MM-JJ, Africa/Lome) selon la règle de l'édition.
 * La contrainte unique (edition, voterKey, period) empêche les doublons côté base.
 */
export const votes = pgTable(
  "votes",
  {
    id: id(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "restrict" }),
    voterKey: text("voter_key").notNull(),
    method: voteMethodEnum("method").notNull(),
    period: text("period").notNull(),
    ipHash: text("ip_hash"),
    userAgentHash: text("user_agent_hash"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("votes_unique_voter_period").on(t.editionId, t.voterKey, t.period),
    index("votes_candidate_idx").on(t.candidateId),
    index("votes_edition_idx").on(t.editionId),
  ],
);

export const voteInvalidations = pgTable("vote_invalidations", {
  voteId: uuid("vote_id")
    .primaryKey()
    .references(() => votes.id, { onDelete: "restrict" }),
  reason: text("reason").notNull(),
  invalidatedBy: uuid("invalidated_by").references(() => users.id, { onDelete: "set null" }),
  invalidatedByEmail: text("invalidated_by_email"),
  createdAt: createdAt(),
});

/** Journal d'audit du vote : tentatives, refus, suspensions, invalidations, exports. */
export const voteEvents = pgTable(
  "vote_events",
  {
    id: id(),
    editionId: uuid("edition_id").references(() => editions.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    candidateId: uuid("candidate_id"),
    voterKey: text("voter_key"),
    ipHash: text("ip_hash"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    actorEmail: text("actor_email"),
    createdAt: createdAt(),
  },
  (t) => [index("vote_events_edition_idx").on(t.editionId, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Résultats officiels                                                 */
/* ------------------------------------------------------------------ */

export const results = pgTable(
  "results",
  {
    id: id(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    candidateId: uuid("candidate_id").references(() => candidates.id, { onDelete: "set null" }),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    rank: integer("rank"),
    distinction: text("distinction").notNull(), // « 1er prix », « Prix du public »…
    note: text("note"),
    /** Publication après validation explicite d'un super-administrateur. */
    published: boolean("published").notNull().default(false),
    validatedBy: uuid("validated_by").references(() => users.id, { onDelete: "set null" }),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("results_edition_idx").on(t.editionId)],
);


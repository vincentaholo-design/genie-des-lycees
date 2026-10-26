/**
 * Configuration des modules d'administration (CRUD génériques).
 * Chaque module déclare ses champs ; formulaires, listes, validation et droits en découlent.
 */
import * as s from "@/lib/db/schema";
import type { Resource } from "@/lib/auth/permissions";
import { ALBUM_TYPES, VIDEO_TYPES } from "@/config/labels";

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "select"
  | "relation"
  | "image"
  | "url"
  | "steps"
  | "criteria"
  | "lines";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
  relation?: "editions" | "categories" | "schools" | "candidates" | "albums" | "partnerTiers";
  /** Champ réservé au super-administrateur. */
  superOnly?: boolean;
  wide?: boolean;
  max?: number;
};

export type ResourceDef = {
  key: string;
  permission: Resource;
  label: string;
  singular: string;
  table: keyof typeof tables;
  fields: FieldDef[];
  /** Colonnes affichées dans la liste. */
  list: string[];
  search: string[];
  orderBy: { column: string; desc?: boolean };
  /** Champ servant à générer le slug. */
  slugFrom?: string;
  titleField: string;
  publicPath?: (row: Record<string, unknown>) => string | null;
};

export const tables = {
  editions: s.editions,
  announcements: s.announcements,
  categories: s.categories,
  schools: s.schools,
  candidates: s.candidates,
  albums: s.albums,
  media: s.media,
  videos: s.videos,
  testimonials: s.testimonials,
  articles: s.articles,
  partners: s.partners,
  partnerTiers: s.partnerTiers,
  faqs: s.faqs,
  results: s.results,
};

const opts = (rec: Record<string, string>) => Object.entries(rec).map(([value, label]) => ({ value, label }));
const PUBLICATION = opts({ brouillon: "Brouillon", publie: "Publié" });
const demo: FieldDef = { name: "isDemo", label: "Contenu de démonstration (badge « Démo »)", type: "boolean" };

export const RESOURCES: ResourceDef[] = [
  {
    key: "editions",
    permission: "editions",
    label: "Éditions",
    singular: "édition",
    table: "editions",
    titleField: "title",
    slugFrom: "title",
    list: ["number", "title", "year", "status", "registrationOpen"],
    search: ["title", "theme"],
    orderBy: { column: "number", desc: true },
    publicPath: (r) => `/editions/${r.slug}`,
    fields: [
      { name: "number", label: "Numéro de l'édition", type: "number", help: "ex. 6 pour la 6e édition" },
      { name: "title", label: "Titre", type: "text", required: true, help: "ex. 6e édition" },
      { name: "year", label: "Année", type: "number", help: "Laisser vide si elle n'est pas confirmée." },
      { name: "slug", label: "Adresse (slug)", type: "text", help: "Laisser vide pour la générer depuis le titre." },
      { name: "status", label: "Statut", type: "select", required: true, options: opts({ brouillon: "Brouillon (invisible)", en_cours: "En cours (une seule à la fois)", archivee: "Archivée" }) },
      { name: "theme", label: "Thème", type: "text" },
      { name: "summary", label: "Présentation courte", type: "textarea", wide: true },
      { name: "coverUrl", label: "Image de couverture", type: "image" },
      { name: "countdownLabel", label: "Libellé du compte à rebours", type: "text", help: "ex. Grande finale" },
      { name: "countdownAt", label: "Date et heure du compte à rebours", type: "datetime" },
      { name: "steps", label: "Calendrier (une étape par ligne : AAAA-MM-JJ | Étape | Description)", type: "steps", wide: true },
      { name: "criteria", label: "Critères du jury (une ligne : Critère | Pondération % | Description)", type: "criteria", wide: true },
      { name: "rules", label: "Règlement (Markdown)", type: "markdown", wide: true },
      { name: "registrationInfo", label: "Modalités d'inscription (Markdown)", type: "markdown", wide: true },
      { name: "registrationOpen", label: "Inscriptions ouvertes", type: "boolean" },
      { name: "registrationClosesAt", label: "Clôture des inscriptions", type: "datetime" },
      demo,
    ],
  },
  {
    key: "announcements",
    permission: "announcements",
    label: "Annonces d'édition",
    singular: "annonce",
    table: "announcements",
    titleField: "title",
    list: ["title", "editionId", "publishedAt", "status"],
    search: ["title"],
    orderBy: { column: "publishedAt", desc: true },
    fields: [
      { name: "editionId", label: "Édition", type: "relation", relation: "editions", required: true },
      { name: "title", label: "Titre", type: "text", required: true },
      { name: "body", label: "Texte", type: "textarea", wide: true },
      { name: "publishedAt", label: "Date de publication", type: "datetime", required: true },
      { name: "status", label: "Publication", type: "select", options: PUBLICATION, required: true },
      demo,
    ],
  },
  {
    key: "categories",
    permission: "categories",
    label: "Catégories",
    singular: "catégorie",
    table: "categories",
    titleField: "name",
    slugFrom: "name",
    list: ["name", "teamMode", "sortOrder"],
    search: ["name"],
    orderBy: { column: "sortOrder" },
    publicPath: (r) => `/concours/${r.slug}`,
    fields: [
      { name: "name", label: "Nom", type: "text", required: true },
      { name: "slug", label: "Adresse (slug)", type: "text" },
      { name: "shortDescription", label: "Accroche", type: "text" },
      { name: "description", label: "Description (Markdown)", type: "markdown", wide: true },
      { name: "eligibility", label: "Conditions de participation", type: "textarea", wide: true },
      { name: "teamMode", label: "Participation en équipe", type: "boolean" },
      { name: "teamSizeMin", label: "Taille minimale d'équipe", type: "number" },
      { name: "teamSizeMax", label: "Taille maximale d'équipe", type: "number" },
      { name: "sortOrder", label: "Ordre d'affichage", type: "number" },
    ],
  },
  {
    key: "schools",
    permission: "schools",
    label: "Établissements",
    singular: "établissement",
    table: "schools",
    titleField: "name",
    slugFrom: "name",
    list: ["name", "city", "region", "kind", "published"],
    search: ["name", "city", "region"],
    orderBy: { column: "name" },
    publicPath: (r) => `/etablissements/${r.slug}`,
    fields: [
      { name: "name", label: "Nom", type: "text", required: true },
      { name: "slug", label: "Adresse (slug)", type: "text" },
      { name: "kind", label: "Type", type: "select", required: true, options: opts({ lycee: "Lycée / secondaire", universite: "Université / supérieur", autre: "Autre" }) },
      { name: "city", label: "Ville", type: "text" },
      { name: "region", label: "Région", type: "select", options: opts({ Maritime: "Maritime", Plateaux: "Plateaux", Centrale: "Centrale", Kara: "Kara", Savanes: "Savanes" }) },
      { name: "logoUrl", label: "Logo", type: "image" },
      { name: "description", label: "Présentation", type: "textarea", wide: true },
      { name: "published", label: "Visible sur le site", type: "boolean" },
      demo,
    ],
  },
  {
    key: "candidates",
    permission: "candidates",
    label: "Candidats",
    singular: "candidat",
    table: "candidates",
    titleField: "lastName",
    list: ["portraitUrl", "lastName", "firstName", "teamName", "schoolId", "editionId", "status", "published"],
    search: ["firstName", "lastName", "teamName"],
    orderBy: { column: "lastName" },
    publicPath: (r) => `/candidats/${r.slug}`,
    fields: [
      { name: "editionId", label: "Édition", type: "relation", relation: "editions", required: true },
      { name: "categoryId", label: "Catégorie", type: "relation", relation: "categories", required: true },
      { name: "schoolId", label: "Établissement", type: "relation", relation: "schools" },
      { name: "firstName", label: "Prénom(s)", type: "text", required: true },
      { name: "lastName", label: "Nom", type: "text", required: true },
      { name: "slug", label: "Adresse (slug)", type: "text", help: "Laisser vide : prénom-nom-année." },
      { name: "teamName", label: "Nom d'équipe (universités)", type: "text" },
      { name: "level", label: "Classe / niveau", type: "text" },
      { name: "portraitUrl", label: "Portrait (cadrage 4:5 conseillé)", type: "image" },
      { name: "portraitFocus", label: "Point de recadrage", type: "text", help: "Position CSS, ex. « 50% 25% » pour remonter le visage." },
      { name: "imageConsent", label: "Autorisation de diffusion de l'image enregistrée", type: "boolean", help: "Sans elle, le portrait n'est jamais affiché." },
      { name: "status", label: "Statut", type: "select", required: true, options: opts({ inscrit: "Inscrit", retenu: "Retenu", demi_finaliste: "Demi-finaliste", finaliste: "Finaliste", laureat: "Lauréat", elimine: "Parcours terminé" }) },
      { name: "shortBio", label: "Courte biographie", type: "textarea", max: 300 },
      { name: "quote", label: "Citation", type: "textarea", max: 280 },
      { name: "presentation", label: "Présentation", type: "textarea", wide: true },
      { name: "journey", label: "Parcours (une étape par ligne)", type: "textarea", wide: true },
      { name: "voteEnabled", label: "Peut recevoir des votes", type: "boolean" },
      { name: "published", label: "Visible sur le site", type: "boolean" },
      demo,
    ],
  },
  {
    key: "albums",
    permission: "albums",
    label: "Albums photos",
    singular: "album",
    table: "albums",
    titleField: "title",
    slugFrom: "title",
    list: ["coverUrl", "title", "type", "editionId", "eventDate", "status"],
    search: ["title"],
    orderBy: { column: "eventDate", desc: true },
    publicPath: (r) => `/galerie/${r.slug}`,
    fields: [
      { name: "title", label: "Titre", type: "text", required: true },
      { name: "slug", label: "Adresse (slug)", type: "text" },
      { name: "type", label: "Moment", type: "select", options: opts(ALBUM_TYPES), required: true },
      { name: "editionId", label: "Édition", type: "relation", relation: "editions" },
      { name: "schoolId", label: "Établissement", type: "relation", relation: "schools" },
      { name: "eventDate", label: "Date", type: "date" },
      { name: "coverUrl", label: "Couverture", type: "image" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "sortOrder", label: "Ordre", type: "number" },
      { name: "status", label: "Publication", type: "select", options: PUBLICATION, required: true },
      demo,
    ],
  },
  {
    key: "media",
    permission: "media",
    label: "Photos",
    singular: "photo",
    table: "media",
    titleField: "alt",
    list: ["url", "alt", "albumId", "credit", "downloadable"],
    search: ["alt", "caption", "credit"],
    orderBy: { column: "createdAt", desc: true },
    fields: [
      { name: "url", label: "Fichier image", type: "image", required: true },
      { name: "albumId", label: "Album", type: "relation", relation: "albums" },
      { name: "candidateId", label: "Candidat (galerie du profil)", type: "relation", relation: "candidates" },
      { name: "schoolId", label: "Établissement", type: "relation", relation: "schools" },
      { name: "alt", label: "Texte alternatif (ce que montre la photo)", type: "text", required: true },
      { name: "caption", label: "Légende", type: "text" },
      { name: "credit", label: "Crédit photo", type: "text" },
      { name: "downloadable", label: "Téléchargement autorisé", type: "boolean" },
      { name: "sortOrder", label: "Ordre", type: "number" },
      demo,
    ],
  },
  {
    key: "videos",
    permission: "videos",
    label: "Vidéos",
    singular: "vidéo",
    table: "videos",
    titleField: "title",
    slugFrom: "title",
    list: ["title", "type", "provider", "editionId", "downloadable", "status"],
    search: ["title"],
    orderBy: { column: "createdAt", desc: true },
    publicPath: (r) => `/videos/${r.slug}`,
    fields: [
      { name: "title", label: "Titre", type: "text", required: true },
      { name: "slug", label: "Adresse (slug)", type: "text" },
      { name: "type", label: "Type", type: "select", options: opts(VIDEO_TYPES), required: true },
      { name: "provider", label: "Hébergement", type: "select", options: opts({ youtube: "YouTube", fichier: "Fichier mis en ligne sur le site" }), required: true },
      { name: "youtubeId", label: "Lien ou identifiant YouTube", type: "text", help: "Collez l'adresse de la vidéo : l'identifiant est extrait automatiquement." },
      { name: "fileUrl", label: "Adresse externe du fichier vidéo", type: "url", help: "Pour une vidéo hébergée ailleurs. Pour envoyer un fichier, utilisez « Mettre en ligne une vidéo »." },
      { name: "downloadable", label: "Téléchargement autorisé pour le public", type: "boolean", help: "Uniquement pour les fichiers mis en ligne sur le site (pas YouTube)." },
      { name: "thumbnailUrl", label: "Vignette", type: "image" },
      { name: "submitterName", label: "Proposée par (nom)", type: "text" },
      { name: "submitterEmail", label: "Proposée par (e-mail)", type: "text" },
      { name: "submitterNote", label: "Message de la personne", type: "textarea" },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "durationSeconds", label: "Durée (secondes)", type: "number" },
      { name: "editionId", label: "Édition", type: "relation", relation: "editions" },
      { name: "candidateId", label: "Candidat", type: "relation", relation: "candidates" },
      { name: "schoolId", label: "Établissement", type: "relation", relation: "schools" },
      { name: "publishedAt", label: "Date de publication d'origine", type: "datetime" },
      { name: "status", label: "Publication", type: "select", options: PUBLICATION, required: true },
      demo,
    ],
  },
  {
    key: "testimonials",
    permission: "testimonials",
    label: "Témoignages",
    singular: "témoignage",
    table: "testimonials",
    titleField: "name",
    list: ["name", "role", "status", "sortOrder"],
    search: ["name", "quote"],
    orderBy: { column: "sortOrder" },
    fields: [
      { name: "name", label: "Nom", type: "text", required: true },
      { name: "role", label: "Fonction", type: "text", help: "ex. Lauréate 2025, enseignant, partenaire" },
      { name: "organisation", label: "Établissement / organisation", type: "text" },
      { name: "quote", label: "Citation", type: "textarea", required: true, wide: true },
      { name: "portraitUrl", label: "Portrait (autorisé)", type: "image" },
      { name: "youtubeId", label: "Vidéo YouTube (lien ou identifiant)", type: "text" },
      { name: "editionId", label: "Édition", type: "relation", relation: "editions" },
      { name: "status", label: "Publication (après validation)", type: "select", options: PUBLICATION, required: true },
      { name: "sortOrder", label: "Ordre", type: "number" },
      demo,
    ],
  },
  {
    key: "articles",
    permission: "articles",
    label: "Actualités",
    singular: "article",
    table: "articles",
    titleField: "title",
    slugFrom: "title",
    list: ["coverUrl", "title", "category", "publishedAt", "status"],
    search: ["title", "excerpt"],
    orderBy: { column: "publishedAt", desc: true },
    publicPath: (r) => `/actualites/${r.slug}`,
    fields: [
      { name: "title", label: "Titre", type: "text", required: true },
      { name: "slug", label: "Adresse (slug)", type: "text" },
      { name: "excerpt", label: "Chapeau", type: "textarea" },
      { name: "body", label: "Texte (Markdown)", type: "markdown", wide: true },
      { name: "coverUrl", label: "Image de couverture", type: "image" },
      { name: "coverAlt", label: "Description de l'image", type: "text" },
      { name: "author", label: "Auteur", type: "text" },
      { name: "category", label: "Rubrique", type: "text", help: "ex. Compétition, Inscriptions, Conseils" },
      { name: "editionId", label: "Édition liée", type: "relation", relation: "editions" },
      { name: "publishedAt", label: "Date de publication", type: "datetime", help: "Une date future programme la publication." },
      { name: "status", label: "Publication", type: "select", options: PUBLICATION, required: true },
      demo,
    ],
  },
  {
    key: "partners",
    permission: "partners",
    label: "Partenaires",
    singular: "partenaire",
    table: "partners",
    titleField: "name",
    list: ["logoUrl", "name", "tierId", "published"],
    search: ["name"],
    orderBy: { column: "sortOrder" },
    fields: [
      { name: "name", label: "Nom", type: "text", required: true },
      { name: "tierId", label: "Niveau de partenariat", type: "relation", relation: "partnerTiers" },
      { name: "logoUrl", label: "Logo", type: "image" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "website", label: "Site web", type: "url" },
      { name: "sortOrder", label: "Ordre", type: "number" },
      { name: "published", label: "Visible sur le site", type: "boolean" },
      demo,
    ],
  },
  {
    key: "partnerTiers",
    permission: "partnerTiers",
    label: "Niveaux de partenariat",
    singular: "niveau",
    table: "partnerTiers",
    titleField: "name",
    list: ["name", "rank"],
    search: ["name"],
    orderBy: { column: "rank" },
    fields: [
      { name: "name", label: "Nom du niveau", type: "text", required: true },
      { name: "rank", label: "Rang (1 = le plus élevé)", type: "number", required: true },
    ],
  },
  {
    key: "faqs",
    permission: "faqs",
    label: "FAQ",
    singular: "question",
    table: "faqs",
    titleField: "question",
    list: ["question", "topic", "published", "sortOrder"],
    search: ["question", "answer"],
    orderBy: { column: "sortOrder" },
    fields: [
      { name: "topic", label: "Thème", type: "text", help: "ex. Inscription, Vote, Médias" },
      { name: "question", label: "Question", type: "text", required: true },
      { name: "answer", label: "Réponse", type: "textarea", required: true, wide: true },
      { name: "sortOrder", label: "Ordre", type: "number" },
      { name: "published", label: "Visible", type: "boolean" },
    ],
  },
  {
    key: "results",
    permission: "results",
    label: "Résultats officiels",
    singular: "résultat",
    table: "results",
    titleField: "distinction",
    list: ["distinction", "rank", "candidateId", "editionId", "published"],
    search: ["distinction"],
    orderBy: { column: "createdAt", desc: true },
    fields: [
      { name: "editionId", label: "Édition", type: "relation", relation: "editions", required: true },
      { name: "categoryId", label: "Catégorie", type: "relation", relation: "categories" },
      { name: "candidateId", label: "Candidat ou équipe", type: "relation", relation: "candidates" },
      { name: "schoolId", label: "Établissement", type: "relation", relation: "schools" },
      { name: "rank", label: "Rang", type: "number", help: "Vide pour un prix spécial." },
      { name: "distinction", label: "Distinction", type: "text", required: true, help: "ex. Premier prix, Prix du public" },
      { name: "note", label: "Note interne", type: "textarea" },
      { name: "published", label: "Publié (validation du super-administrateur)", type: "boolean", superOnly: true },
      demo,
    ],
  },
];

export function getResource(key: string) {
  return RESOURCES.find((r) => r.key === key);
}

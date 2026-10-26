export const primaryNav = [
  { href: "/concours", label: "Le concours" },
  { href: "/edition-en-cours", label: "Édition en cours" },
  { href: "/candidats", label: "Candidats" },
  { href: "/vote", label: "Vote du public" },
  { href: "/resultats", label: "Palmarès" },
];

/** Barre de navigation du haut (ordinateur) : menus déroulants + « Vote du public » mis en avant. */
export type DesktopNavItem = { label: string; href: string; children?: { href: string; label: string; hint?: string }[]; highlight?: boolean };
export const desktopNav: DesktopNavItem[] = [
  {
    label: "Le concours",
    href: "/concours",
    children: [
      { href: "/a-propos", label: "À propos", hint: "L'AJ3C et l'histoire du concours" },
      { href: "/concours", label: "Règles et déroulement", hint: "Phases, critères, jury" },
      { href: "/concours/lycees", label: "Catégorie Lycées" },
      { href: "/concours/universites", label: "Catégorie Universités" },
      { href: "/edition-en-cours", label: "Édition en cours" },
      { href: "/editions", label: "Archives des éditions" },
    ],
  },
  {
    label: "Candidats",
    href: "/candidats",
    children: [
      { href: "/candidats", label: "Profils des candidats" },
      { href: "/candidats/par-etablissement", label: "Trombinoscope par école" },
      { href: "/etablissements", label: "Établissements participants" },
      { href: "/inscription", label: "S'inscrire au concours" },
      { href: "/suivi", label: "Suivre mon dossier" },
    ],
  },
  {
    label: "Médias",
    href: "/galerie",
    children: [
      { href: "/galerie", label: "Galerie photos" },
      { href: "/videos", label: "Vidéothèque" },
      { href: "/videos/partager", label: "Partager une vidéo" },
      { href: "/actualites", label: "Actualités" },
      { href: "/temoignages", label: "Témoignages" },
    ],
  },
  { label: "Palmarès", href: "/resultats" },
  { label: "Vote du public", href: "/vote", highlight: true },
];

/** Plan complet, présenté comme le programme d'une soirée. */
export const fullNav: Array<{ title: string; links: { href: string; label: string }[] }> = [
  {
    title: "Le concours",
    links: [
      { href: "/a-propos", label: "À propos" },
      { href: "/concours", label: "Règles et déroulement" },
      { href: "/concours/lycees", label: "Catégorie Lycées" },
      { href: "/concours/universites", label: "Catégorie Universités" },
      { href: "/edition-en-cours", label: "Édition en cours" },
      { href: "/editions", label: "Archives des éditions" },
    ],
  },
  {
    title: "Les orateurs",
    links: [
      { href: "/candidats", label: "Profils des candidats" },
      { href: "/candidats/par-etablissement", label: "Trombinoscope par école" },
      { href: "/etablissements", label: "Établissements participants" },
      { href: "/vote", label: "Vote du public" },
      { href: "/resultats", label: "Résultats et palmarès" },
    ],
  },
  {
    title: "Revivre",
    links: [
      { href: "/galerie", label: "Galerie photos" },
      { href: "/videos", label: "Vidéothèque" },
      { href: "/temoignages", label: "Témoignages" },
      { href: "/actualites", label: "Actualités" },
    ],
  },
  {
    title: "Participer",
    links: [
      { href: "/inscription", label: "S'inscrire" },
      { href: "/suivi", label: "Suivre mon dossier" },
      { href: "/partenaires", label: "Partenaires" },
      { href: "/faq", label: "Questions fréquentes" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

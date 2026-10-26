export const primaryNav = [
  { href: "/concours", label: "Le concours" },
  { href: "/edition-en-cours", label: "Édition en cours" },
  { href: "/candidats", label: "Candidats" },
  { href: "/vote", label: "Vote du public" },
  { href: "/resultats", label: "Palmarès" },
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

/**
 * Chemins des médias centralisés.
 *
 * Photos : /public/photos (édition précédente, fournies par l'organisation), optimisées en WebP.
 * Logos des partenaires : /public/partenaires. Elles se remplacent aussi depuis l'administration
 * (Paramètres du site → Image d'accueil, albums, portraits, partenaires).
 */
export type MediaAsset = {
  src: string;
  alt: string;
  credit?: string;
  demo?: boolean;
  /** CSS object-position pour un recadrage cohérent. */
  focus?: string;
};

export const brand = {
  logoColor: "/brand/gdl-couleur.svg",
  logoIvory: "/brand/gdl-ivoire.svg",
  logoPng: "/brand/gdl-couleur.png",
  logoSquare: "/brand/gdl-carre.png",
  orathon: "/brand/orathon.webp",
  aj3c: "/brand/aj3c.webp",
};

/** Photos officielles de l'édition précédente (fournies par l'organisation). */
const p = (name: string, alt: string, focus?: string): MediaAsset & { thumb: string } => ({
  src: `/photos/${name}.webp`,
  thumb: `/photos/${name}-640.webp`,
  alt,
  focus,
});

export const photos = {
  heroOratrice: p("hero-oratrice", "Une oratrice en veste bleue et orange s'adresse au public sur scène", "74% 18%"),
  remiseDesPrix: p("remise-des-prix", "Les lauréats et le jury sur scène lors de la remise des prix de la finale"),
  orateurPupitre: p("orateur-pupitre-1", "Un candidat en chemise blanche plaide au pupitre, le drapeau du Togo derrière lui", "40% 40%"),
  orateurMicro: p("orateur-micro", "Un candidat en costume parle avec force au micro", "55% 35%"),
  oratricePoingLeve: p("oratrice-poing-leve", "Une candidate lève le poing au pupitre Génie des Lycées ORATHON", "50% 25%"),
  orateurPlaidoirie: p("orateur-plaidoirie", "Un candidat en costume bleu plaide, poing serré, au pupitre Génie des Lycées", "45% 30%"),
  orateurScene: p("orateur-scene", "Un orateur au pupitre devant la bannière du thème de l'édition", "55% 40%"),
  publicApplaudit: p("public-applaudit", "Le public applaudit dans la salle"),
  laureatsTrophee: p("laureats-trophee", "Les lauréats brandissent le trophée et le diplôme", "50% 35%"),
  oratricePupitre: p("oratrice-pupitre", "Une candidate en costume s'exprime au pupitre", "40% 30%"),
  orateurMicroMain: p("orateur-micro-main", "Un participant prend la parole micro en main", "50% 30%"),
  publicRires: p("public-rires", "Des spectatrices rient et réagissent pendant un discours"),
  publicEnthousiaste: p("public-enthousiaste", "Le public enthousiaste se lève et lève les bras"),
};

/** Partenaires et sponsors de la 5e édition (logos extraits du visuel officiel « Merci à nos partenaires & sponsors »). */
export const sponsors = [
  { name: "INADES-Formation", logo: "/partenaires/inades-formation.webp" },
  { name: "Fondation de l'Innovation pour la Démocratie", logo: "/partenaires/fondation-innovation-democratie.webp" },
  { name: "CIDP — Conseil International de Dialogue et de Partenariat", logo: "/partenaires/cidp.webp" },
  { name: "Virtual School", logo: "/partenaires/virtual-school.webp" },
  { name: "Association des Écrivains du Togo (AET)", logo: "/partenaires/aet.webp" },
  { name: "Gathe Works Academy", logo: "/partenaires/gathe-works-academy.webp" },
  { name: "Caution Bancaire Étudiants (CBE)", logo: "/partenaires/caution-bancaire-etudiants.webp" },
  { name: "The English Clinic", logo: "/partenaires/the-english-clinic.webp" },
  { name: "Adjana House", logo: "/partenaires/adjana-house.webp" },
  { name: "MM BTP", logo: "/partenaires/mm-btp.webp" },
  { name: "Agri", logo: "/partenaires/agri.webp" },
  { name: "MM Invest", logo: "/partenaires/mm-invest.webp" },
  { name: "nettoyeur.pro", logo: "/partenaires/nettoyeur-pro.webp" },
  { name: "MM Consulting Group", logo: "/partenaires/mm-consulting.webp" },
  { name: "Face au Célibat", logo: "/partenaires/face-au-celibat.webp" },
  { name: "Djeli Africa", logo: "/partenaires/djeli-africa.webp" },
  { name: "VADO Studio", logo: "/partenaires/vado-studio.webp" },
];

/** Coordonnées officielles (visuel de la 5e édition). */
export const officialContact = {
  email: "aj3c2013@gmail.com",
  phone: "+228 97 07 57 07",
  handle: "@aj3c",
};

/** Liens officiels connus. */
export const socials = {
  facebook: "https://web.facebook.com/aj3c2013",
  x: "https://x.com/aj3c",
  tiktok: "https://www.tiktok.com/@geniedeslycees",
  youtube: "https://www.youtube.com/@geniedeslycees",
};

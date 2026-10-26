/**
 * Données initiales.
 * RÉELLES (fournies par l'organisation, is_demo = false) :
 *   - les photos de l'édition précédente (albums de la 5e édition) ;
 *   - les 17 partenaires & sponsors du visuel « Merci à nos partenaires & sponsors » (5e édition) ;
 *   - les coordonnées de l'AJ3C (e-mail, téléphone, @aj3c) ;
 *   - la devise et la description de la chaîne YouTube @geniedeslycees, et la vidéo de Léticia KPATCHA.
 * FICTIVES (is_demo = true, badge « Démo ») : l'édition en cours, ses candidats, établissements,
 * dates, annonces, témoignages, articles et dossiers d'inscription.
 * Aucune date, aucun thème ni aucun lauréat réel n'est inventé pour la 5e édition.
 */
import { count } from "drizzle-orm";
import { officialContact, photos, sponsors } from "@/config/media";
import { hashPassword } from "@/lib/crypto";
import { slugify } from "@/lib/utils";
import type { DB } from "./index";
import * as s from "./schema";

const DAY = 86_400_000;

export const DEMO_ADMIN = {
  email: "admin@demo.local",
  password: "Demo-Orathon-2026",
};

export async function seedIfEmpty(db: DB) {
  // Base locale embarquée : on ajoute aussi le compte administrateur de démonstration.
  const [{ n }] = await db.select({ n: count() }).from(s.categories);
  if (n > 0) return false;
  await seedDemo(db, { withDemoAdmin: true });
  return true;
}

export async function seedDemo(db: DB, opts: { now?: Date; withDemoAdmin?: boolean } = {}) {
  const now = opts.now ?? new Date();
  const t = (days: number, hour = 9) => {
    const d = new Date(now.getTime() + days * DAY);
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  };
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  /* Catégories ------------------------------------------------------ */
  const [lycees, universites] = await db
    .insert(s.categories)
    .values([
      {
        slug: "lycees",
        name: "Lycées",
        shortDescription: "Pour les élèves du second cycle, seuls à la tribune.",
        description:
          "La catégorie historique du concours. Chaque candidat défend seul un sujet devant le jury et le public. Les conditions exactes (classes admises, nombre de candidats par établissement) sont fixées par le règlement de chaque édition.",
        eligibility: "Élèves inscrits dans un lycée ou un établissement d'enseignement secondaire. Détail dans le règlement de l'édition.",
        teamMode: false,
        sortOrder: 1,
      },
      {
        slug: "universites",
        name: "Universités",
        shortDescription: "Pour les étudiants, en individuel ou en équipe selon l'édition.",
        description:
          "La catégorie ouverte aux étudiants des universités et des grandes écoles. Le format (individuel ou en équipe) et la taille des équipes se règlent pour chaque édition depuis l'administration.",
        eligibility: "Étudiants inscrits dans un établissement d'enseignement supérieur. Détail dans le règlement de l'édition.",
        teamMode: true,
        teamSizeMin: 2,
        teamSizeMax: 3,
        sortOrder: 2,
      },
    ])
    .returning();

  /* Éditions -------------------------------------------------------- */
  const steps2026: s.EditionStep[] = [
    { label: "Inscriptions", date: iso(t(-30)), description: "Dépôt des dossiers en ligne, avec l'accord des parents pour les mineurs." },
    { label: "Casting de sélection", date: iso(t(-10)), description: "Premier passage devant un jury dans chaque établissement." },
    { label: "Phases éliminatoires", date: iso(t(8)), description: "Duels oratoires sur des sujets tirés au sort." },
    { label: "Demi-finales", date: iso(t(22)), description: "Les meilleurs orateurs de chaque catégorie s'affrontent." },
    { label: "Grande finale", date: iso(t(38)), description: "Finale publique, délibération du jury et remise des prix." },
  ];
  const criteria: s.EvaluationCriterion[] = [
    { label: "Fond et argumentation", description: "Pertinence, structure et solidité du raisonnement." },
    { label: "Expression orale", description: "Diction, rythme, voix et maîtrise de la langue." },
    { label: "Présence scénique", description: "Posture, gestuelle, regard et gestion du trac." },
    { label: "Originalité", description: "Angle personnel, images et force de conviction." },
    { label: "Respect du temps", description: "Gestion du temps de parole imparti." },
  ];

  const [ed2026, ed2025, edAn2024, edAn2023] = await db
    .insert(s.editions)
    .values([
      {
        slug: "6e-edition",
        number: 6,
        year: now.getUTCFullYear(),
        title: "6e édition",
        theme: "La parole qui rassemble",
        summary:
          "Édition de démonstration : le thème, le calendrier, le règlement et les candidats se saisissent depuis l'administration, sans toucher au code.",
        rules:
          "## Règlement (exemple de démonstration)\n\nCe texte est un exemple de mise en page. Le règlement officiel de l'édition sera publié ici par l'AJ3C.\n\n- Chaque candidat dispose d'un temps de parole fixé par le jury.\n- Les sujets sont communiqués selon les modalités de chaque phase.\n- Les décisions du jury sont souveraines.",
        registrationInfo:
          "Les inscriptions se font en ligne. Les candidats mineurs doivent fournir l'accord d'un parent ou tuteur. Un numéro de dossier est délivré à la fin de l'inscription pour suivre son statut.",
        status: "en_cours",
        coverUrl: photos.oratricePoingLeve.src,
        countdownLabel: "Grande finale",
        countdownAt: t(38, 15),
        steps: steps2026,
        criteria,
        registrationOpen: true,
        registrationClosesAt: t(5, 23),
        voteStatus: "ouvert",
        voteOpensAt: t(-2, 8),
        voteClosesAt: t(20, 22),
        voteMethod: "code_email",
        voteScope: "une_fois_par_jour",
        voteInstructions:
          "Choisissez un candidat, saisissez votre adresse e-mail et confirmez avec le code reçu. Un vote par adresse et par jour pendant la période de vote.",
        voteRequireCaptcha: true,
        resultsVisibility: "apres_cloture",
        isDemo: true,
      },
      {
        slug: "5e-edition",
        number: 5,
        year: null,
        title: "5e édition",
        theme: null,
        summary:
          "Retour en images sur la 5e édition du concours national d'éloquence et de plaidoirie. Le thème, les dates et le palmarès officiels sont à compléter depuis l'administration.",
        status: "archivee",
        coverUrl: photos.remiseDesPrix.src,
        steps: [],
        criteria,
        voteStatus: "ferme",
        isDemo: false,
      },
      /* Éditions connues par les vidéos de la chaîne YouTube officielle (#GDL2024, #GDL2023).
         Leur numéro n'est pas précisé dans les vidéos : il se complète depuis l'administration. */
      {
        slug: "edition-2024",
        number: null,
        year: 2024,
        title: "Édition 2024",
        theme: null,
        summary:
          "L'édition 2024 du concours Génie des Lycées ORATHON, à revivre en vidéo : la finale en intégralité et ses moments forts. Le numéro, le thème et le palmarès officiels sont à compléter depuis l'administration.",
        status: "archivee",
        coverUrl: photos.orateurPlaidoirie.src,
        steps: [],
        criteria,
        voteStatus: "ferme",
        isDemo: false,
      },
      {
        slug: "edition-2023",
        number: null,
        year: 2023,
        title: "Édition 2023",
        theme: null,
        summary:
          "L'édition 2023 du concours national d'éloquence et de plaidoirie Génie des Lycées. Le numéro, le thème et le palmarès officiels sont à compléter depuis l'administration.",
        status: "archivee",
        coverUrl: photos.orateurPupitre.src,
        steps: [],
        criteria,
        voteStatus: "ferme",
        isDemo: false,
      },
    ])
    .returning();

  await db.insert(s.announcements).values([
    {
      editionId: ed2026.id,
      title: "Le vote du public est ouvert",
      body: "Exemple d'annonce. Le vote se fait depuis la page Vote, avec un code de vérification.",
      publishedAt: t(-2),
      isDemo: true,
    },
    {
      editionId: ed2026.id,
      title: "Liste des candidats retenus après le casting",
      body: "Exemple d'annonce. Les profils sont consultables par établissement.",
      publishedAt: t(-8),
      isDemo: true,
    },
  ]);

  /* Établissements (fictifs) --------------------------------------- */
  const schoolData = [
    { name: "Lycée des Palmiers", city: "Lomé", region: "Maritime", kind: "lycee" },
    { name: "Lycée de la Lagune", city: "Lomé", region: "Maritime", kind: "lycee" },
    { name: "Complexe scolaire L'Aurore", city: "Tsévié", region: "Maritime", kind: "lycee" },
    { name: "Lycée du Plateau", city: "Kpalimé", region: "Plateaux", kind: "lycee" },
    { name: "Lycée Les Manguiers", city: "Atakpamé", region: "Plateaux", kind: "lycee" },
    { name: "Lycée de la Colline", city: "Sokodé", region: "Centrale", kind: "lycee" },
    { name: "Lycée Mont-Kabyè", city: "Kara", region: "Kara", kind: "lycee" },
    { name: "Lycée Soleil des Savanes", city: "Dapaong", region: "Savanes", kind: "lycee" },
    { name: "Université Horizon", city: "Lomé", region: "Maritime", kind: "universite" },
    { name: "Institut supérieur du Golfe", city: "Lomé", region: "Maritime", kind: "universite" },
  ];
  const insertedSchools = await db
    .insert(s.schools)
    .values(
      schoolData.map((sc) => ({
        ...sc,
        slug: slugify(sc.name),
        description: `Établissement fictif créé pour la démonstration. La fiche réelle présentera l'établissement, son équipe encadrante et l'historique de sa participation.`,
        isDemo: true,
      })),
    )
    .returning();
  const school = (name: string) => insertedSchools.find((x) => x.name === name)!;

  await db
    .insert(s.editionSchools)
    .values([
      ...insertedSchools.map((sc) => ({ editionId: ed2026.id, schoolId: sc.id })),
    ]);

  /* Candidats (fictifs) -------------------------------------------- */
  type C = [first: string, last: string, school: string, level: string, status?: (typeof s.candidateStatusEnum.enumValues)[number]];
  const lyc2026: C[] = [
    ["Akossiwa", "Amégah", "Lycée des Palmiers", "Terminale A4"],
    ["Komla", "Agbéko", "Lycée des Palmiers", "Première D"],
    ["Essossimna", "Tchao", "Lycée Mont-Kabyè", "Terminale C"],
    ["Abla", "Lawson", "Lycée de la Lagune", "Terminale A4"],
    ["Mawuli", "Adjovi", "Lycée de la Lagune", "Seconde S"],
    ["Délali", "Kpodar", "Complexe scolaire L'Aurore", "Première A4"],
    ["Tchilabalo", "Djagba", "Lycée de la Colline", "Terminale D"],
    ["Ayélé", "Mensah", "Lycée du Plateau", "Terminale A4"],
    ["Kafui", "Gbadoé", "Lycée du Plateau", "Première C"],
    ["Mazamesso", "Bodjona", "Lycée Mont-Kabyè", "Première A4"],
    ["Elom", "Atsou", "Lycée Les Manguiers", "Terminale D"],
    ["Lamboni", "Yendoubé", "Lycée Soleil des Savanes", "Terminale A4"],
    ["Fafa", "Akakpo", "Complexe scolaire L'Aurore", "Terminale C"],
    ["Essohana", "Kodjo", "Lycée de la Colline", "Seconde A4"],
  ];
  const quotes = [
    "La parole n'appartient pas à ceux qui crient, mais à ceux qui ont quelque chose à dire.",
    "Mon trac, je l'ai appris par cœur. Maintenant je lui laisse la première phrase, pas la dernière.",
    "Je parle pour ceux de mon quartier qui pensent que personne ne les écoute.",
    "Convaincre, c'est d'abord écouter la salle.",
    "Une bonne idée mal dite reste une idée perdue.",
    "J'ai commencé par réciter. Aujourd'hui, j'argumente.",
    "Le silence entre deux phrases fait partie du discours.",
  ];
  const uniTeams2026: Array<{ team: string; first: string; last: string; school: string; level: string }> = [
    { team: "Les Voix du Golfe", first: "Sénam", last: "Kouma", school: "Institut supérieur du Golfe", level: "Licence 2 Droit" },
    { team: "Équipe Agora", first: "Romaric", last: "Ahadji", school: "Université Horizon", level: "Master 1 Communication" },
    { team: "Plaidoyer 228", first: "Gloria", last: "Ekoué", school: "Université Horizon", level: "Licence 3 Lettres" },
    { team: "Les Contradicteurs", first: "Yao", last: "Messan", school: "Institut supérieur du Golfe", level: "Licence 1 Sciences politiques" },
  ];

  const candidateRows: (typeof s.candidates.$inferInsert)[] = [];
  lyc2026.forEach(([first, last, sc, level], i) => {
    candidateRows.push({
      slug: slugify(`${first}-${last}`),
      editionId: ed2026.id,
      categoryId: lycees.id,
      schoolId: school(sc).id,
      firstName: first,
      lastName: last,
      level,
      shortBio: `Élève en ${level} au ${sc}. Profil fictif de démonstration.`,
      presentation:
        "Ce texte de présentation est un exemple. Le vrai profil racontera ce qui a amené le candidat à la tribune, ses sujets de prédilection et ce qu'il veut défendre.",
      quote: quotes[i % quotes.length],
      journey: "Casting de sélection : retenu(e).\nPhases éliminatoires : à venir.",
      status: "retenu",
      imageConsent: false,
      isDemo: true,
    });
  });
  uniTeams2026.forEach((u, i) => {
    candidateRows.push({
      slug: slugify(u.team),
      editionId: ed2026.id,
      categoryId: universites.id,
      schoolId: school(u.school).id,
      firstName: u.first,
      lastName: u.last,
      teamName: u.team,
      level: u.level,
      shortBio: `Équipe fictive menée par ${u.first} ${u.last}, ${u.level}.`,
      presentation: "Présentation d'équipe de démonstration.",
      quote: quotes[(i + 3) % quotes.length],
      status: "retenu",
      isDemo: true,
    });
  });
  await db.insert(s.candidates).values(candidateRows);

  /* Albums de la 5e édition (photos officielles) ------------------- */
  const albumDefs: Array<{ title: string; type: (typeof s.albumTypeEnum.enumValues)[number]; description: string; photos: (keyof typeof photos)[] }> = [
    {
      title: "5e édition — remise des prix et public",
      type: "remise_des_prix",
      description: "Les lauréats, le jury et une salle debout.",
      photos: ["remiseDesPrix", "laureatsTrophee", "publicRires", "publicEnthousiaste", "publicApplaudit"],
    },
    {
      title: "5e édition — les orateurs à la tribune",
      type: "finale",
      description: "Les candidats au pupitre pendant la finale.",
      photos: ["oratricePoingLeve", "orateurPlaidoirie", "orateurMicro", "orateurPupitre", "oratricePupitre", "orateurScene", "orateurMicroMain"],
    },
  ];
  for (const [i, a] of albumDefs.entries()) {
    const [album] = await db
      .insert(s.albums)
      .values({ slug: slugify(a.title), title: a.title, type: a.type, editionId: ed2025.id, coverUrl: photos[a.photos[0]].src, description: a.description, sortOrder: i, isDemo: false })
      .returning();
    await db.insert(s.media).values(
      a.photos.map((key, j) => ({ albumId: album.id, url: photos[key].src, thumbUrl: photos[key].thumb, alt: photos[key].alt, caption: photos[key].alt, credit: "Photo : AJ3C", downloadable: true, sortOrder: j, isDemo: false })),
    );
  }

  /* Vidéos ----------------------------------------------------------- */
  await db.insert(s.videos).values([
    {
      slug: "leticia-kpatcha-finale-edition-1",
      title: "Candidate Léticia KPATCHA — Finale, Génie des Lycées édition 1",
      description: "Vidéo publiée sur la chaîne YouTube officielle @geniedeslycees.",
      type: "discours",
      provider: "youtube",
      youtubeId: "1W045e3F_ew",
      publishedAt: null,
      isDemo: false,
    },
    /* Vidéos de la chaîne officielle « GENIE DES LYCEES » : titres, descriptions et dates de mise en ligne d'origine. */
    {
      slug: "moments-forts-finale-gdl-orathon-2024",
      title: "Les moments forts de la finale GDL ORATHON",
      description:
        "Entre éloquence intense et talents mémorables, cette édition a mis la barre haute. Revivez les moments forts de cette finale inoubliable !",
      type: "moments_forts",
      provider: "youtube",
      youtubeId: "LhDopeHNu5I",
      durationSeconds: 206,
      editionId: edAn2024.id,
      publishedAt: new Date("2024-10-28T12:31:06Z"),
      isDemo: false,
    },
    {
      slug: "genie-des-lycees-orathon-edition-2024",
      title: "Génie des Lycées ORATHON — Édition 2024 (intégrale)",
      description: "Revivez les moments intenses de l'édition 2024 du concours Génie des Lycées ORATHON.",
      type: "ceremonie",
      provider: "youtube",
      youtubeId: "J47fDMQPkOY",
      durationSeconds: 9300,
      editionId: edAn2024.id,
      publishedAt: new Date("2025-01-24T02:31:22Z"),
      isDemo: false,
    },
    {
      slug: "candidat-11-edition-2023",
      title: "Candidat n° 11 — Concours national d'éloquence et de plaidoirie, édition 2023",
      description: "Passage du candidat n° 11 au concours national d'éloquence et de plaidoirie Génie des Lycées, au Togo.",
      type: "discours",
      provider: "youtube",
      youtubeId: "KhAGMR0gA_k",
      durationSeconds: 152,
      editionId: edAn2023.id,
      publishedAt: new Date("2023-11-06T09:32:14Z"),
      isDemo: false,
    },
  ]);

  /* Témoignages (fictifs) -------------------------------------------- */
  await db.insert(s.testimonials).values([
    {
      name: "Ancienne candidate (exemple)",
      role: "Finaliste, catégorie Lycées",
      organisation: "Témoignage fictif",
      quote:
        "Avant le concours, je lisais mes exposés sans lever les yeux. Le jour de la finale, j'ai regardé la salle entière. C'est ça que je garde.",
      status: "publie",
      sortOrder: 1,
      isDemo: true,
    },
    {
      name: "Enseignant encadrant (exemple)",
      role: "Professeur de français",
      organisation: "Témoignage fictif",
      quote:
        "Les élèves préparent leurs plaidoiries pendant des semaines. On voit leur rapport à l'écrit changer autant que leur rapport à l'oral.",
      status: "publie",
      sortOrder: 2,
      isDemo: true,
    },
    {
      name: "Parent d'élève (exemple)",
      role: "Parent",
      organisation: "Témoignage fictif",
      quote: "Notre fils parlait peu à la maison. Il a fini par défendre ses idées à table, avec des arguments.",
      status: "publie",
      sortOrder: 3,
      isDemo: true,
    },
  ]);

  /* Actualités (fictives) -------------------------------------------- */
  await db.insert(s.articles).values([
    {
      slug: "ouverture-des-inscriptions-2026",
      title: "Les inscriptions de l'édition 2026 sont ouvertes",
      excerpt: "Article de démonstration : comment s'inscrire, quels documents préparer, quel calendrier suivre.",
      body: "Ceci est un article de démonstration.\n\n## S'inscrire\n\nRendez-vous sur la page **Inscription**, choisissez votre catégorie et remplissez le formulaire. Un numéro de dossier vous est remis à la fin.\n\n## Pour les mineurs\n\nL'accord d'un parent ou tuteur est obligatoire, ainsi que son numéro de téléphone.\n\n## Suivre son dossier\n\nLa page **Suivre mon dossier** affiche le statut avec votre numéro de dossier et votre adresse e-mail.",
      coverUrl: photos.orateurPupitre.src,
      coverAlt: photos.orateurPupitre.alt,
      author: "Équipe AJ3C (exemple)",
      category: "Inscriptions",
      editionId: ed2026.id,
      status: "publie",
      publishedAt: t(-30),
      isDemo: true,
    },
    {
      slug: "casting-de-selection-retour",
      title: "Casting de sélection : retour sur les premiers passages",
      excerpt: "Article de démonstration : ambiance, chiffres et prochaines étapes seront publiés par l'organisation.",
      body: "Ceci est un article de démonstration. Le compte rendu officiel sera publié par l'AJ3C.",
      coverUrl: photos.oratricePupitre.src,
      coverAlt: photos.oratricePupitre.alt,
      author: "Équipe AJ3C (exemple)",
      category: "Compétition",
      editionId: ed2026.id,
      status: "publie",
      publishedAt: t(-9),
      isDemo: true,
    },
    {
      slug: "preparer-un-discours-en-5-temps",
      title: "Préparer un discours : la méthode des cinq temps",
      excerpt: "Article de démonstration : conseils pratiques pour les candidats.",
      body: "Ceci est un article de démonstration.\n\n1. Comprendre le sujet\n2. Choisir une thèse\n3. Trouver trois arguments et un exemple vécu\n4. Écrire l'accroche et la chute\n5. Répéter à voix haute, chronomètre en main",
      coverUrl: photos.orateurMicro.src,
      coverAlt: photos.orateurMicro.alt,
      author: "Équipe AJ3C (exemple)",
      category: "Conseils",
      status: "publie",
      publishedAt: t(-15),
      isDemo: true,
    },
  ]);

  /* Partenaires & sponsors (visuel officiel de la 5e édition) -------- */
  const [sponsorTier] = await db
    .insert(s.partnerTiers)
    .values([
      { name: "Partenaires & sponsors", rank: 1 },
      { name: "Partenaire principal", rank: 0 },
      { name: "Partenaire média", rank: 2 },
    ])
    .returning();
  await db.insert(s.partners).values(sponsors.map((sp, i) => ({ name: sp.name, logoUrl: sp.logo, tierId: sponsorTier.id, sortOrder: i, isDemo: false })));

  /* FAQ : réponses génériques qui renvoient au règlement -------------- */
  await db.insert(s.faqs).values([
    { topic: "Inscription", question: "Qui peut s'inscrire ?", answer: "Les élèves des lycées et les étudiants, chacun dans sa catégorie. Les conditions exactes (classes admises, âge, nombre de candidats par établissement) figurent dans le règlement de l'édition en cours.", sortOrder: 1 },
    { topic: "Inscription", question: "Mon enfant est mineur : que faut-il ?", answer: "L'accord d'un parent ou tuteur est obligatoire. Le formulaire demande son nom, son lien avec le candidat et son numéro de téléphone. L'autorisation de diffuser photos et vidéos est demandée séparément.", sortOrder: 2 },
    { topic: "Inscription", question: "Comment savoir si mon dossier est accepté ?", answer: "Avec votre numéro de dossier et votre adresse e-mail, la page « Suivre mon dossier » affiche le statut : reçu, en vérification, incomplet, accepté ou refusé.", sortOrder: 3 },
    { topic: "Vote", question: "Le vote du public décide-t-il du gagnant ?", answer: "Le poids du vote du public est fixé par le règlement de chaque édition. Il est publié sur la page Vote avant l'ouverture.", sortOrder: 4 },
    { topic: "Vote", question: "Pourquoi dois-je confirmer mon vote avec un code ?", answer: "Le code limite les votes automatiques et les votes en série. Votre adresse n'est pas affichée publiquement et n'est conservée que sous forme d'empreinte chiffrée.", sortOrder: 5 },
    { topic: "Médias", question: "Puis-je demander le retrait d'une photo ?", answer: "Oui. Écrivez via la page Contact en précisant la photo concernée. Pour un mineur, la demande d'un parent ou tuteur suffit.", sortOrder: 6 },
  ]);

  /* Inscriptions de démonstration ------------------------------------ */
  await db.insert(s.inscriptions).values([
    {
      dossierNumber: "GDL26-DEMO1",
      editionId: ed2026.id,
      categoryId: lycees.id,
      schoolId: school("Lycée des Palmiers").id,
      firstName: "Exemple",
      lastName: "Candidat",
      birthDate: `${now.getUTCFullYear() - 16}-03-12`,
      level: "Première A4",
      city: "Lomé",
      phone: "+228 90 00 00 00",
      email: "candidat.demo@example.org",
      motivation: "Dossier fictif de démonstration.",
      isMinor: true,
      guardianName: "Parent Exemple",
      guardianPhone: "+228 91 00 00 00",
      guardianRelation: "Mère",
      consentData: true,
      consentRules: true,
      consentGuardian: true,
      consentImage: true,
      status: "en_verification",
      isDemo: true,
    },
    {
      dossierNumber: "GDL26-DEMO2",
      editionId: ed2026.id,
      categoryId: universites.id,
      schoolId: school("Université Horizon").id,
      firstName: "Étudiante",
      lastName: "Exemple",
      birthDate: `${now.getUTCFullYear() - 21}-07-02`,
      level: "Licence 3",
      city: "Lomé",
      phone: "+228 92 00 00 00",
      email: "etudiante.demo@example.org",
      teamName: "Équipe Démo",
      teamMembers: [
        { firstName: "Membre", lastName: "Un", level: "Licence 3" },
        { firstName: "Membre", lastName: "Deux", level: "Licence 2" },
      ],
      isMinor: false,
      consentData: true,
      consentRules: true,
      consentImage: false,
      status: "soumis",
      isDemo: true,
    },
  ]);

  /* Paramètres du site ----------------------------------------------- */
  await db.insert(s.siteSettings).values([
    { key: "hero", value: { imageUrl: photos.heroOratrice.src, imageAlt: photos.heroOratrice.alt, imageCredit: "", headline: "Prends la parole.", intro: "Génie des Lycées ORATHON est le concours national d'éloquence et de plaidoirie porté par l'AJ3C. Des lycéens et des étudiants du Togo montent à la tribune pour défendre leurs idées devant un jury et le public." } },
    { key: "about", value: {
      mission: "Renforcer les capacités des jeunes lycéens, et de tous ceux qu'intéresse l'éloquence, en prise de parole et en leadership.",
      motto: "Orateur de tous les pays, unissez-vous !",
      vision: "À compléter par l'AJ3C : la vision à long terme du concours.",
      objectives: ["À compléter : objectif 1", "À compléter : objectif 2", "À compléter : objectif 3"],
      history: "À compléter par l'AJ3C : la naissance du concours, les éditions marquantes, les chiffres officiels.",
    } },
    { key: "contact", value: { email: officialContact.email, phone: officialContact.phone, address: "", whatsapp: "" } },
  ]);

  /* Compte administrateur de démonstration (base locale uniquement) -- */
  if (!opts.withDemoAdmin) return;
  await db.insert(s.users).values({
    email: DEMO_ADMIN.email,
    name: "Administrateur démo",
    passwordHash: await hashPassword(DEMO_ADMIN.password),
    role: "super_admin",
  });
}

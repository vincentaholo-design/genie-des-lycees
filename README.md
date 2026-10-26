# Génie des Lycées ORATHON — site officiel et plateforme du concours

Site du concours national d'éloquence et de plaidoirie organisé par l'**AJ3C** (Association des Jeunes Communicateurs pour le Changement de Comportement) : éditions, candidats, établissements, inscriptions, vote du public, palmarès, galerie, vidéothèque, actualités et administration.

> **Contenus réels** : logos, photos de l'édition précédente (`public/photos`, deux albums « 5e édition »), les 17 partenaires & sponsors du visuel officiel (`public/partenaires`), les coordonnées de l'AJ3C (aj3c2013@gmail.com, +228 97 07 57 07, @aj3c), la devise de la chaîne YouTube et une vidéo de la chaîne.
> **Contenus de démonstration** : l'édition en cours (« 6e édition »), ses candidats, établissements, dates, témoignages, articles et dossiers sont **fictifs** et portent un badge « Démo ». Le thème, les dates et le palmarès de la 5e édition sont laissés vides, à compléter dans l'administration.

**Charte** : dégradé bleu du logo (#035cfc → #10338b), orange du pupitre (#ff8d18 → #ff33aa) et blanc ; Montserrat (la police du logo) pour les titres, Plus Jakarta Sans pour le texte ; cartes blanches arrondies, grandes photos, boutons pilule.

---

## Démarrage rapide (aucune configuration)

Prérequis : **Node.js 20.9 ou plus récent** (22 recommandé).

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000.
Au premier lancement, une base PostgreSQL **embarquée** (PGlite, dossier `.data/pglite`) est créée, migrée puis remplie avec les données de démonstration.

- Administration : http://localhost:3000/admin
- Compte de démonstration (base locale uniquement) : `admin@demo.local` / `Demo-Orathon-2026`
- En mode démo, le code de vote s'affiche à l'écran au lieu d'être envoyé par e-mail. Ce n'est le cas que si aucun fournisseur n'est configuré.

### Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` puis `npm start` | build et serveur de production |
| `npm test` | tests automatisés (vote, permissions, inscriptions) |
| `npm run typecheck` | vérification TypeScript |
| `npm run check` | typecheck + tests + build |
| `npm run db:migrate` | applique les migrations (PostgreSQL ou base locale) |
| `npm run db:seed` | charge les données de démonstration dans une base vide |
| `npm run db:reset` | efface la base locale (recréée au prochain lancement) |
| `npm run admin:create -- email "Nom" super_admin` | crée ou met à jour un compte d'administration |

---

## Mise en ligne sur Vercel (démo client, puis version pro)

Le projet se déploie sur Vercel sans saisir de clé à la main :

1. **Importer le dépôt GitHub** dans Vercel (*Add New → Project*), puis cliquer sur *Deploy*.
   Le site fonctionne aussitôt avec la base de démonstration embarquée. Elle est recréée à chaque redémarrage :
   les votes et inscriptions de test ne sont pas conservés.
2. **Relier Supabase** : dans le projet Vercel, onglet *Storage* → *Supabase* → créer la base et la connecter au projet,
   puis *Deployments* → *Redeploy*. Au déploiement, `npm run vercel-build` (`scripts/vercel-setup.ts`) :
   applique les migrations, verrouille l'API publique de Supabase, crée les buckets de stockage
   et charge les données de démonstration si la base est vide. Les variables de l'intégration
   (`POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`) sont reprises
   automatiquement (`src/lib/platform-env.ts`) ; `APP_SECRET` en est dérivé s'il n'est pas défini.
3. **Compte d'administration** : ajouter dans *Settings → Environment Variables* `ADMIN_EMAIL` et `ADMIN_PASSWORD`
   (12 caractères minimum), puis redéployer.

Tant qu'aucun fournisseur d'e-mail (`RESEND_API_KEY`) ni de SMS n'est configuré, le vote reste en **mode démonstration** :
le code de vérification s'affiche à l'écran. Pour la version officielle : configurer Resend, définir `DEMO_MODE=false`,
un `APP_SECRET` fixe, Turnstile, puis relier le nom de domaine (*Settings → Domains*).
Le plan gratuit Hobby de Vercel est réservé à un usage personnel : passer au plan Pro pour le site officiel.

## Mise en production avec Supabase

1. **Créer un projet Supabase** (région la plus proche : Europe de l'Ouest).
2. **Variables d'environnement** : copiez `.env.example` en `.env.local` (ou dans les réglages de l'hébergeur) et renseignez au minimum :
   - `DATABASE_URL` : chaîne de connexion PostgreSQL (pooler en mode transaction, port 6543) ;
   - `APP_SECRET` : 32 caractères aléatoires. **Ne plus le changer une fois le vote ouvert** ;
   - `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` : stockage des photos et des pièces ;
   - `NEXT_PUBLIC_SITE_URL` : l'adresse définitive du site ;
   - `DEMO_MODE=false`.
3. **Créer les tables** : `npm run db:migrate`.
4. **Verrouiller l'API publique de Supabase** : exécutez `supabase/securite-supabase.sql` dans le SQL Editor. Ce script active la RLS sans aucune politique pour `anon` et `authenticated`, et crée les buckets `public-media` (public) et `dossiers` (privé).
5. **Créer le premier compte** : `npm run admin:create -- vous@aj3c.tg "Votre Nom" super_admin` (mot de passe demandé, 12 caractères minimum).
6. *(Facultatif)* Charger les contenus de démonstration : `npm run db:seed`. **Aucun compte de démonstration n'est créé sur PostgreSQL.**
7. **Déployer** : Vercel, Netlify ou tout serveur Node (`npm run build && npm start`).

### Services externes

| Service | Variable | Sans configuration |
|---|---|---|
| E-mail (codes de vote, confirmations) | `RESEND_API_KEY`, `MAIL_FROM` | en démo : code affiché à l'écran ; en production : vote par e-mail refusé |
| SMS | `SMS_WEBHOOK_URL` (+ `SMS_WEBHOOK_TOKEN`) | idem. Le webhook reçoit `{"to","text"}` : à brancher sur l'agrégateur SMS de votre choix |
| Anti-robot | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | vote « léger » refusé en production |
| Stockage | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | fichiers dans `.data/uploads` (local) |

L'état de chaque service s'affiche dans **Administration → Paramètres du site**. Le site n'affiche jamais un service comme actif tant que sa clé n'est pas renseignée.

---

## Architecture

```
src/
  app/
    (site)/            pages publiques (accueil, concours, éditions, candidats, vote, galerie…)
    admin/             administration : connexion, tableau de bord, modules, exports, documents privés
    media/[...path]    fichiers publics du stockage local
  components/
    site/ ui/ forms/ vote/ edition/ admin/
  config/              logos, photos de démonstration, navigation, libellés  ← chemins des médias centralisés
  lib/
    db/                schéma Drizzle, connexion (PGlite ou PostgreSQL), données de démonstration
    vote/              logique du vote (service testé) et branchement serveur
    auth/              sessions, rôles et permissions
    admin/             configuration des modules CRUD
    actions/           actions serveur publiques et d'administration
    storage/           stockage local ou Supabase, optimisation des images
drizzle/               migrations SQL (0001 = protections : votes et journaux en insertion seule)
supabase/              script de verrouillage Supabase
tests/                 tests Vitest sur une vraie base PostgreSQL embarquée
```

**Stack** : Next.js 16 (App Router, actions serveur), React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, PostgreSQL (Supabase) ou PGlite en local, Zod, Sharp.
Polices auto-hébergées : *Anybody* (titres, largeur variable) et *Golos Text* (texte). Aucun appel à Google Fonts.

### Modèle de données

Éditions, annonces, catégories, établissements (et participation par édition), candidats, inscriptions, documents, albums, médias, vidéos, témoignages, articles, partenaires et niveaux, FAQ, messages, utilisateurs, sessions, journal d'audit, notifications, paramètres du site, limitation de fréquence, codes de vote, votes, invalidations, journal du vote, résultats.
Les clés étrangères, les contraintes d'unicité et les index sont dans `drizzle/0000_init.sql`.

---

## Vote du public : ce qui est garanti, et ce qui ne l'est pas

- **Tout est décidé côté serveur.** Édition, candidat, période, état du vote et décompte sont recalculés en base. Aucune donnée du navigateur n'est crue.
- **Doublons** : une contrainte unique `(édition, votant, période)` en base bloque le second vote, même en cas de requêtes simultanées.
- **Trois méthodes**, au choix de l'administration pour chaque édition :
  - *code par e-mail* : un vote par adresse vérifiée et par période ;
  - *code par SMS* : un vote par numéro vérifié et par période ;
  - *léger* : un vote par appareil, avec anti-robot obligatoire. **Ce mode ne vérifie pas l'identité.**
  Aucune méthode ne garantit « une personne = un vote » : quelqu'un peut posséder plusieurs adresses ou numéros. Le site l'écrit tel quel aux votants.
- **Fréquence** : un vote par édition ou un vote par jour (jour calculé à l'heure de Lomé).
- **Anti-abus** : codes à 6 chiffres à usage unique, valables 10 minutes, 5 essais maximum. Limitation de fréquence par IP et par votant, stockée en base. Anti-robot Turnstile. Champs pièges.
- **Confidentialité** : l'e-mail ou le numéro n'est jamais stocké en clair. Seule une empreinte HMAC (avec `APP_SECRET`) est conservée, et l'IP l'est aussi sous forme d'empreinte.
- **Intégrité** : les tables `votes`, `vote_invalidations`, `vote_events` et `audit_logs` sont en **insertion seule**. Un trigger PostgreSQL rejette toute modification ou suppression, y compris venant d'un administrateur. Pour invalider un vote frauduleux, on **ajoute** une invalidation motivée et attribuée ; le vote reste visible dans le journal.
- **Pilotage** : ouverture et clôture à l'heure définie (la clôture est automatique), suspension motivée, clôture immédiate confirmée. La méthode et la fréquence sont verrouillées dès le premier vote.
- **Résultats** : jamais publiés, publiés après la clôture, ou en direct, au choix. Les résultats partiels restent masqués tant que la règle l'interdit. Les exports CSV (résultats et journal anonymisé) sont journalisés.
- **Le poids du vote du public dans le classement final** dépend du règlement : il n'est pas calculé automatiquement. Les résultats officiels sont saisis à part et publiés par un super-administrateur.

## Vidéothèque : regarder, télécharger, mettre en ligne

- **Mettre en ligne (équipe)** : *Administration → Mettre en ligne une vidéo*. Glisser-déposer, barre de progression, choix « Publier tout de suite » et « Autoriser le téléchargement ».
- **Proposer une vidéo (public)** : page `/videos/partager`. La vidéo arrive en **brouillon**, l'équipe reçoit une notification, la regarde dans *Vidéos* puis la publie. Champs : nom, e-mail (jamais affiché), accord sur les droits et l'image des personnes filmées. Limite : 4 envois par heure et par adresse IP, anti-robot si Turnstile est configuré. En production, cet envoi public n'est actif que si Turnstile est configuré ou si `VIDEO_PUBLIC_UPLOAD=true`.
- **Formats** : MP4, WebM ou MOV, 500 Mo maximum (`VIDEO_MAX_MB`). Le type réel est vérifié sur le fichier reçu (signature binaire) ; un faux fichier est supprimé.
- **Stockage** : bucket **privé** `videos` sur Supabase (le fichier part directement du navigateur vers Supabase via une URL signée, sans passer par le serveur ni ses limites de taille), ou `.data/uploads/videos` en local.
- **Lecture et téléchargement** : `/api/videos/[id]/fichier` sert la vidéo (lecture progressive avec requêtes partielles) ; `?telecharger=1` la propose en téléchargement **uniquement si l'équipe l'a autorisé**. Une vidéo non publiée n'est accessible qu'à l'équipe.
- Les vidéos YouTube restent intégrées (lecteur léger chargé au clic) avec un lien « Ouvrir sur YouTube ».
- À créer dans Supabase : un bucket privé `videos` (ajouté au script `supabase/securite-supabase.sql`). **Attention** : sur l'offre gratuite de Supabase, un fichier est limité à 50 Mo ; pour des vidéos plus lourdes, passez à l'offre Pro et relevez la limite dans *Storage → Settings*, ou fixez `VIDEO_MAX_MB=50`.

## Inscriptions et données personnelles

- Formulaires Lycées et Universités. La catégorie Universités accepte les équipes, avec une taille configurable dans Catégories.
- Pour un **mineur**, détecté depuis la date de naissance et vérifié côté serveur : nom, lien et téléphone d'un parent ou tuteur, plus son accord, sont obligatoires.
- L'autorisation de diffuser l'image est **séparée et facultative**. Sans elle, le portrait n'est jamais affiché, même si une photo est téléversée.
- Les pièces justificatives (PDF, JPEG ou PNG, 5 Mo maximum, type vérifié par signature binaire) vont dans un espace **privé**. Elles ne sont servies qu'aux rôles autorisés, et chaque consultation est journalisée.
- Le candidat reçoit un numéro de dossier et suit son statut sur `/suivi`. Statuts : reçu, en vérification, incomplet, accepté, refusé.
- L'administration ouvre ou ferme les inscriptions, décide sur chaque dossier, exporte en CSV (avec protection contre l'injection de formules) et crée la fiche candidat à partir d'un dossier accepté. Cette fiche ne reprend aucune coordonnée.
- Coordonnées, dates de naissance et pièces ne sont **jamais** affichées sur le site public.
- La politique de confidentialité (`/confidentialite`) est un **modèle à faire valider** par l'AJ3C. Les durées de conservation y sont des propositions.

## Rôles d'administration

| Rôle | Accès |
|---|---|
| Super-administrateur | tout : comptes, paramètres, journal, publication des résultats |
| Responsable des candidatures | inscriptions (décision, export), candidats, établissements |
| Éditeur de contenu | actualités, médias, vidéos, témoignages, partenaires, FAQ, annonces, messages |
| Responsable du vote | pilotage et règles du vote, invalidations, préparation des résultats, exports |
| Lecteur des statistiques | tableau de bord seul |

Les droits sont vérifiés **côté serveur** à chaque page, action et export, et pas seulement dans l'interface. Suppressions confirmées par saisie. Actions sensibles journalisées (`/admin/journal`).

## Remplacer les contenus de démonstration

1. **Photos** : *Paramètres du site → Accueil* pour la grande photo d'accueil. *Photos* pour importer jusqu'à 30 photos à la fois dans un album. Les images sont converties en WebP, redimensionnées et débarrassées de leurs métadonnées (dont la géolocalisation).
2. **Éditions, candidats, établissements, articles…** : modifiez chaque élément, puis décochez « Contenu de démonstration » pour retirer le badge.
3. **À propos** (vision, objectifs, histoire) et **coordonnées** : *Paramètres du site*.
4. Une fois les vrais contenus en place : supprimez les éléments fictifs restants et mettez `DEMO_MODE=false`.

Les chemins des logos et des photos de démonstration sont centralisés dans `src/config/media.ts`.

## Performance et accessibilité (connexions mobiles)

- Images servies en AVIF ou WebP aux bonnes dimensions, chargement différé, solution de repli si une image manque.
- Les vidéos YouTube ne chargent que leur vignette (≈ 30 Ko). Le lecteur (≈ 1 Mo) ne se charge qu'au clic, depuis `youtube-nocookie.com`.
- Polices auto-hébergées avec `font-display: swap`. Filtres en formulaires GET, utilisables sans JavaScript.
- Navigation au clavier, lien d'évitement, focus visible, contrastes vérifiés (AA), cibles tactiles de 48 px, `prefers-reduced-motion` respecté.
- SEO : métadonnées par page, Open Graph (partage WhatsApp et Facebook), `sitemap.xml`, `robots.txt`, données structurées FAQ.
- En-têtes de sécurité : CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.

## Tests

`npm test` exécute 32 tests sur une vraie base PostgreSQL en mémoire :

- **vote** : un vote après un code valide, doublon refusé, règle par jour et par édition, code faux, expiré ou réutilisé, 5 essais maximum, limitation de fréquence, candidat d'une autre édition, vote suspendu ou clos, code jamais affiché hors démo, suffrage impossible à modifier ou supprimer en base, invalidation motivée et exclue du décompte, vote léger ;
- **permissions** : matrice des cinq rôles ;
- **vidéos** : tickets d'envoi signés et expirants, détection des vrais formats vidéo ;
- **inscriptions** : accord parental des mineurs, consentements, formats, taille des équipes, numéros de dossier, détection du type de fichier, échappement CSV.

## Points à décider par l'AJ3C

- Le règlement officiel : poids du vote du public, classes admises, format Universités (individuel ou équipe, taille).
- La méthode de vérification du vote (e-mail, SMS ou léger) et le fournisseur correspondant.
- Les durées de conservation des données et le texte définitif de confidentialité.
- Les photos officielles, le contenu « À propos » (vision, objectifs, histoire) et les coordonnées de contact.
- Les partenaires et leurs niveaux.

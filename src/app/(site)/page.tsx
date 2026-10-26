import Image from "next/image";
import Link from "next/link";
import { SmartImage } from "@/components/ui/SmartImage";
import { Countdown } from "@/components/ui/Countdown";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { CandidateCard } from "@/components/ui/CandidateCard";
import { Timeline } from "@/components/ui/Timeline";
import { YouTube } from "@/components/ui/YouTube";
import { SponsorsWall } from "@/components/ui/SponsorsWall";
import { IconLycee, IconUniversite, IconVote } from "@/components/ui/Icons";
import { brand, photos } from "@/config/media";
import {
  getCurrentEdition,
  getSetting,
  listArticles,
  listCandidates,
  listCategories,
  listEditions,
  listPartners,
  listRecentPhotos,
  listTestimonials,
  listVideos,
} from "@/lib/queries";
import { voteState } from "@/lib/vote/service";
import { formatDate, formatDateTime, formatDuration, formatShortDate } from "@/lib/utils";

export default async function HomePage() {
  const now = new Date();
  const [hero, edition, editions, categories, testimonials, articles, gallery, videos, partners] = await Promise.all([
    getSetting("hero"),
    getCurrentEdition(),
    listEditions(),
    listCategories(),
    listTestimonials(3),
    listArticles(3),
    listRecentPhotos(7),
    listVideos({ limit: 4 }),
    listPartners(),
  ]);
  const candidates = edition ? await listCandidates({ editionId: edition.id }) : [];
  const state = edition ? voteState(edition, now) : "ferme";
  const lastArchived = editions.find((e) => e.status === "archivee");
  const allPartners = [...partners.tiers.flatMap((t) => t.partners), ...partners.untiered];
  const headline = hero.headline ?? "Prends la parole.";
  const featuredVideo = videos.find((v) => v.youtubeId && v.type === "moments_forts") ?? videos.find((v) => v.youtubeId) ?? videos[0];
  const otherVideos = videos.filter((v) => v.id !== featuredVideo?.id).slice(0, 3);
  const heroImg = hero.imageUrl || photos.heroOratrice.src;

  return (
    <>
      {/* ——— Ouverture : bannière photo, éléments en verre dépoli dans la partie sombre ——— */}
      <section className="px-3 sm:px-4">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-salle text-white">
          <div className="relative h-[22rem] sm:h-[28rem] lg:absolute lg:inset-0 lg:-z-10 lg:h-auto">
            <SmartImage
              src={heroImg}
              alt={hero.imageAlt ?? photos.heroOratrice.alt}
              fill
              priority
              sizes="100vw"
              className="object-cover object-[72%_20%] lg:object-[center_22%]"
            />
            {/* Lisibilité : la partie gauche, déjà sombre sur la photo, est fondue dans le bleu profond */}
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-salle)_0%,rgba(10,36,112,0.35)_35%,rgba(10,36,112,0)_60%)] lg:bg-[linear-gradient(90deg,rgba(10,36,112,0.95)_0%,rgba(10,36,112,0.8)_34%,rgba(10,36,112,0.15)_62%,rgba(10,36,112,0)_75%)]" />
            <div aria-hidden className="absolute inset-x-0 bottom-0 hidden h-40 bg-gradient-to-t from-salle/70 to-transparent lg:block" />
          </div>

          <div className="conteneur relative -mt-10 pb-8 lg:mt-0 lg:min-h-[47rem] lg:pb-12 lg:pt-36">
            <div className="max-w-[44rem]">
              <p className="entree verre pastille">
                <span className="size-2 rounded-full bg-or" aria-hidden />
                Concours national d'éloquence et de plaidoirie
              </p>
              <h1 className="t-voix entree-2 mt-6 text-[clamp(2.6rem,6.4vw,5rem)]">
                {headline}
                <span className="texte-degrade block pb-1">Fais entendre ta voix.</span>
              </h1>
              <p className="entree-3 mt-5 max-w-[46ch] text-lg leading-relaxed text-white/85">{hero.intro}</p>
              <div className="entree-3 mt-8 flex flex-wrap gap-3">
                <Link href="/concours" className="btn btn-blanc btn-fleche">Découvrir le concours</Link>
                <Link href="/candidats" className="btn verre hover:bg-white/20">Voir les candidats</Link>
              </div>
            </div>

            <div className="entree-3 mt-10 grid max-w-[46rem] gap-3 sm:grid-cols-2">
              {edition?.countdownAt && edition.countdownAt > now && (
                <div className="verre rounded-[1.5rem] p-5">
                  <p className="flex items-center justify-between gap-3 text-sm font-semibold text-white/80">
                    {edition.countdownLabel ?? "Prochain rendez-vous"} dans {edition.isDemo && <DemoBadge />}
                  </p>
                  <div className="mt-3 text-white">
                    <Countdown target={edition.countdownAt.toISOString()} serverNow={now.toISOString()} compact />
                  </div>
                  <p className="mt-2 text-xs text-white/70">{formatDateTime(edition.countdownAt)}</p>
                </div>
              )}
              {state === "ouvert" ? (
                <Link href="/vote" className="verre group flex items-center gap-4 rounded-[1.5rem] p-5 transition-colors hover:bg-white/20">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-tribune"><IconVote className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 whitespace-nowrap font-bold"><span className="point-direct" aria-hidden /> Vote ouvert</span>
                    <span className="block text-sm text-white/75">Vote du public{edition?.voteClosesAt ? ` · jusqu'au ${formatShortDate(edition.voteClosesAt)}` : ""}</span>
                  </span>
                  <span aria-hidden className="grid size-9 place-items-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              ) : (
                <Link href="/inscription" className="verre group flex items-center gap-4 rounded-[1.5rem] p-5 transition-colors hover:bg-white/20">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-tribune"><IconVote className="size-5" /></span>
                  <span className="min-w-0 flex-1 font-bold">S'inscrire au concours</span>
                </Link>
              )}
            </div>

            <div className="mt-8 flex items-center gap-4">
              <Image src={brand.orathon} alt="ORATHON" width={150} height={43} className="h-8 w-auto" />
              <span className="h-7 w-px bg-white/25" aria-hidden />
              <span className="text-sm text-white/80">Organisé par l'AJ3C</span>
              {hero.imageCredit && <span className="ml-auto hidden text-xs text-white/55 sm:inline">{hero.imageCredit}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* ——— Repères ——— */}
      <section className="conteneur py-12 sm:py-16">
        <dl className="grid grid-cols-1 divide-y divide-ivoire-3 text-center sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { value: <>{lastArchived?.number ?? 5}</>, label: "éditions déjà organisées" },
            { value: <>{categories.length}</>, label: "catégories : lycées et universités" },
            { value: <>{allPartners.length}</>, label: "partenaires et sponsors à nos côtés" },
          ].map((st) => (
            <div key={st.label} className="flex flex-col-reverse py-5">
              <dt className="mt-2 text-gris">{st.label}</dt>
              <dd className="t-chiffre text-5xl text-tribune sm:text-6xl">{st.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ——— Grande photo et portes d'entrée ——— */}
      <section className="px-3 sm:px-4">
        <div className="relative overflow-hidden rounded-[2rem]">
          <Image src={photos.publicEnthousiaste.src} alt={photos.publicEnthousiaste.alt} fill sizes="100vw" className="object-cover" style={{ objectPosition: "50% 30%" }} />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-salle/80 via-salle/55 to-salle/85" />
          <div className="conteneur relative py-16 sm:py-24">
            <div className="mx-auto max-w-2xl text-center text-white">
              <h2 className="t-titre text-[clamp(2rem,5vw,3.4rem)]">Une scène pour la jeunesse togolaise</h2>
              <p className="mt-4 text-lg text-white/90">Des lycéens et des étudiants montent à la tribune et défendent leurs idées devant un jury et une salle qui vibre avec eux.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                { icon: <IconLycee className="size-6" />, title: "Catégorie Lycées", text: categories[0]?.shortDescription ?? "", href: "/concours/lycees", cta: "Les conditions" },
                { icon: <IconUniversite className="size-6" />, title: "Catégorie Universités", text: categories[1]?.shortDescription ?? "", href: "/concours/universites", cta: "Les conditions" },
                { icon: <IconVote className="size-6" />, title: "Vote du public", text: "Choisis ton orateur préféré et confirme ton vote avec un code.", href: "/vote", cta: state === "ouvert" ? "Voter" : "En savoir plus" },
              ].map((c) => (
                <div key={c.title} className="carte flex flex-col gap-3 p-6">
                  <span className="grid size-12 place-items-center rounded-full bg-ivoire-2 text-tribune">{c.icon}</span>
                  <h3 className="t-sous-titre text-xl">{c.title}</h3>
                  <p className="flex-1 text-gris">{c.text}</p>
                  <Link href={c.href} className="btn btn-tribune btn-fleche self-start !min-h-11 !py-2">{c.cta}</Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ——— Calendrier ——— */}
      {edition && edition.steps.length > 0 && (
        <section className="conteneur py-16 sm:py-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-or-texte">{edition.title} {edition.isDemo && <DemoBadge />}</p>
              <h2 className="t-titre mt-2 text-[clamp(2rem,4.5vw,3.2rem)]">Le chemin vers la finale</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {edition.registrationOpen && (
                <Link href="/inscription" className="btn btn-tribune btn-fleche">S'inscrire{edition.registrationClosesAt ? ` avant le ${formatShortDate(edition.registrationClosesAt)}` : ""}</Link>
              )}
              <Link href="/concours" className="btn btn-contour">Règles du concours</Link>
            </div>
          </div>
          <Timeline steps={edition.steps} now={now} />
        </section>
      )}

      {/* ——— Candidats ——— */}
      {edition && candidates.length > 0 && (
        <section className="papier-bleute py-16 sm:py-24">
          <div className="conteneur">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <h2 className="t-titre text-[clamp(2rem,4.5vw,3.2rem)]">Ils montent à la tribune</h2>
                <p className="mt-2 text-gris">Les candidats de la {edition.title}, venus de tout le Togo.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/candidats/par-etablissement" className="btn btn-contour">Par école</Link>
                <Link href="/candidats" className="btn btn-tribune btn-fleche">Tous les candidats</Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {candidates.slice(0, 4).map((c) => <CandidateCard key={c.id} c={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* ——— Retour en images ——— */}
      {gallery.length >= 5 && (
        <section className="conteneur py-16 sm:py-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-or-texte">{lastArchived?.title ?? "Édition précédente"}</p>
              <h2 className="t-titre mt-2 text-[clamp(2rem,4.5vw,3.2rem)]">Retour en images</h2>
            </div>
            <Link href="/galerie" className="btn btn-tribune btn-fleche">Toute la galerie</Link>
          </div>
          <div className="grid auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] sm:gap-4 lg:grid-cols-4">
            {gallery.slice(0, 5).map((p, i) => (
              <Link
                key={p.id}
                href={`/galerie/${p.albumSlug}`}
                className={`group relative overflow-hidden rounded-[1.5rem] bg-ivoire-2 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
              >
                <SmartImage src={i === 0 ? p.url : (p.thumbUrl ?? p.url)} alt={p.alt} fill sizes={i === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ——— Vidéos ——— */}
      <section className="px-3 sm:px-4">
        <div className="scene overflow-hidden rounded-[2rem]">
          <div className="conteneur grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.35fr_1fr] lg:items-center">
            <div>{featuredVideo?.youtubeId ? <YouTube id={featuredVideo.youtubeId} title={featuredVideo.title} /> : null}</div>
            <div>
              <h2 className="t-titre text-[clamp(2rem,4.5vw,3.2rem)]">Revivez les éditions en vidéo</h2>
              <p className="mt-4 text-white/85">Discours des finalistes, moments forts et cérémonies : regardez en ligne, téléchargez les vidéos autorisées ou partagez les vôtres.</p>
              {otherVideos.length > 0 && (
                <ul className="mt-7 space-y-3">
                  {otherVideos.map((v) => {
                    const thumb = v.thumbnailUrl ?? (v.youtubeId ? `https://i.ytimg.com/vi/${v.youtubeId}/mqdefault.jpg` : null);
                    return (
                      <li key={v.id}>
                        <Link href={`/videos/${v.slug}`} className="verre group flex items-center gap-4 rounded-2xl p-2.5 pr-4 transition-colors hover:bg-white/20">
                          <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-salle-2">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                            ) : null}
                            <span className="absolute inset-0 grid place-items-center bg-salle/25">
                              <svg viewBox="0 0 24 24" className="ml-0.5 size-5 text-white drop-shadow" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-2 font-semibold leading-snug text-white">{v.title}</span>
                            <span className="mt-1 block text-sm text-white/70">
                              {[v.editionTitle, formatDuration(v.durationSeconds)].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/videos" className="btn btn-blanc">Vidéothèque</Link>
                <Link href="/videos/partager" className="btn btn-or btn-fleche">Partager une vidéo</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Partenaires & sponsors ——— */}
      {allPartners.length > 0 && (
        <section className="conteneur py-16 sm:py-24">
          <div className="rounded-[2rem] bg-gradient-to-b from-ivoire-2 to-[#e3ecff] px-4 py-10 sm:p-12">
            <div className="mb-10 text-center">
              <p className="t-marque texte-degrade-fonce text-5xl sm:text-6xl">Merci</p>
              <h2 className="t-titre mt-2 text-[clamp(1.8rem,4vw,2.8rem)]">à nos partenaires & sponsors</h2>
              <p className="mx-auto mt-3 max-w-xl text-gris">Ils ont rendu possible la {lastArchived?.title ?? "dernière édition"} du concours.</p>
            </div>
            <SponsorsWall partners={allPartners} />
            <div className="mt-10 text-center">
              <Link href="/partenaires#devenir-partenaire" className="btn btn-tribune btn-fleche">Devenir partenaire</Link>
            </div>
          </div>
        </section>
      )}

      {/* ——— Témoignages ——— */}
      {testimonials.length > 0 && (
        <section className="conteneur pb-16 sm:pb-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className="t-titre text-[clamp(2rem,4.5vw,3.2rem)]">Ils en parlent</h2>
            <Link href="/temoignages" className="lien font-semibold text-tribune">Tous les témoignages</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <figure key={t.id} className={`flex flex-col justify-between gap-6 rounded-[1.5rem] p-7 ${i === 0 ? "scene" : "carte"}`}>
                <blockquote className="text-lg leading-relaxed">« {t.quote} »</blockquote>
                <figcaption className="flex items-center gap-3">
                  <span className={`grid size-11 place-items-center rounded-full font-bold ${i === 0 ? "bg-white text-tribune" : "bg-ivoire-2 text-tribune"}`}>{t.name.slice(0, 1)}</span>
                  <span>
                    <span className="flex items-center gap-2 font-bold">{t.name} {t.isDemo && <DemoBadge />}</span>
                    <span className={`block text-sm ${i === 0 ? "text-white/75" : "text-gris"}`}>{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ——— Actualités ——— */}
      {articles.length > 0 && (
        <section className="papier-bleute py-16 sm:py-24">
          <div className="conteneur">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <h2 className="t-titre text-[clamp(2rem,4.5vw,3.2rem)]">Actualités</h2>
              <Link href="/actualites" className="lien font-semibold text-tribune">Toutes les actualités</Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {articles.map((a) => (
                <article key={a.id} className="carte group relative overflow-hidden">
                  <div className="relative aspect-[16/10] bg-ivoire-2">
                    <SmartImage src={a.coverUrl} alt={a.coverAlt ?? ""} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <div className="p-6">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-gris">
                      <span className="font-semibold text-tribune">{a.category}</span> · {formatDate(a.publishedAt)} {a.isDemo && <DemoBadge />}
                    </p>
                    <h3 className="t-sous-titre mt-2 text-xl">
                      <Link href={`/actualites/${a.slug}`} className="after:absolute after:inset-0 group-hover:text-tribune">{a.title}</Link>
                    </h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ——— Appel à l'inscription ——— */}
      <section className="px-3 py-16 sm:px-4 sm:py-24">
        <div className="degrade-orange relative mx-auto grid max-w-[78rem] overflow-hidden rounded-[2rem] lg:grid-cols-[1.2fr_1fr]">
          <div className="relative z-10 p-8 text-encre sm:p-14">
            <h2 className="t-voix text-[clamp(2.2rem,5vw,3.8rem)]">Ta voix a sa place sur scène.</h2>
            <p className="mt-4 max-w-md text-lg font-medium">
              {edition?.registrationOpen
                ? `Lycéens et étudiants, inscrivez-vous${edition.registrationClosesAt ? ` jusqu'au ${formatDate(edition.registrationClosesAt)}` : ""}. Accord parental requis pour les mineurs.`
                : "Les inscriptions de la prochaine édition seront annoncées ici et sur nos réseaux."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={edition?.registrationOpen ? "/inscription" : "/actualites"} className="btn bg-encre text-white hover:bg-salle">
                {edition?.registrationOpen ? "Commencer mon inscription" : "Suivre les annonces"}
              </Link>
              <Link href="/suivi" className="btn btn-contour">Suivre mon dossier</Link>
            </div>
          </div>
          <div className="relative h-72 lg:h-auto lg:min-h-[26rem]">
            <Image src={photos.laureatsTrophee.src} alt={photos.laureatsTrophee.alt} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" style={{ objectPosition: "50% 30%" }} />
          </div>
        </div>
      </section>
    </>
  );
}

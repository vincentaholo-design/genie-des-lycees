import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Portrait } from "@/components/ui/Portrait";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { SmartImage } from "@/components/ui/SmartImage";
import { YouTube } from "@/components/ui/YouTube";
import { STATUS_LABELS } from "@/components/ui/CandidateCard";
import { getCandidateBySlug, getCurrentEdition } from "@/lib/queries";
import { voteState } from "@/lib/vote/service";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await getCandidateBySlug((await params).slug);
  if (!c) return {};
  const name = c.teamName ?? `${c.firstName} ${c.lastName}`;
  return {
    title: `${name} — ${c.categoryName}, ${c.editionTitle}`,
    description: c.shortBio ?? `${name}, ${c.schoolName ?? ""}`,
    openGraph: c.portraitUrl && c.imageConsent ? { images: [c.portraitUrl] } : undefined,
  };
}

export default async function CandidatePage({ params }: P) {
  const c = await getCandidateBySlug((await params).slug);
  if (!c) notFound();
  const current = await getCurrentEdition();
  const canVote = current?.id === c.editionId && voteState(current, new Date()) === "ouvert" && c.voteEnabled && c.status !== "elimine";
  const name = c.teamName ?? `${c.firstName} ${c.lastName}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <article>
      <header className="px-3 sm:px-4">
        <div className="scene overflow-hidden rounded-[2rem]">
        <div className="conteneur grid gap-8 pb-12 pt-28 sm:pb-16 sm:pt-32 md:grid-cols-[minmax(0,22rem)_1fr] md:items-end lg:gap-14">
          <Portrait {...c} priority sizes="(min-width:768px) 22rem, 60vw" className="w-3/5 max-w-[22rem] rounded-[1.75rem] ring-8 ring-white/10 md:w-full" />
          <div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-white/80">
              <Link href={`/concours/${c.categorySlug}`} className="hover:text-white">{c.categoryName}</Link>
              <span>·</span>
              <Link href={`/editions/${c.editionSlug}`} className="hover:text-white">{c.editionTitle}</Link>
              <span>·</span>
              <span>{STATUS_LABELS[c.status]}</span>
              {c.isDemo && <DemoBadge />}
            </p>
            <h1 className="t-voix mt-3 text-[clamp(2.8rem,8vw,6rem)]">{name}</h1>
            {c.teamName && <p className="mt-2 text-lg text-white/85">Équipe menée par {c.firstName} {c.lastName}</p>}
            <p className="mt-3 text-lg text-white/85">
              {c.level ? `${c.level}, ` : ""}
              {c.schoolSlug ? <Link href={`/etablissements/${c.schoolSlug}`} className="lien">{c.schoolName}</Link> : c.schoolName}
              {c.schoolCity ? ` (${c.schoolCity})` : ""}
            </p>
            {c.quote && <blockquote className="t-citation mt-8 max-w-2xl border-l-4 border-or pl-5 text-xl text-white sm:text-2xl">« {c.quote} »</blockquote>}
            <div className="mt-8 flex flex-wrap gap-3">
              {canVote && (
                <Link href={`/vote?candidat=${c.slug}`} className="btn btn-or btn-fleche">
                  Voter pour {c.teamName ? "cette équipe" : c.firstName}
                </Link>
              )}
              {c.schoolSlug && (
                <Link href={`/candidats/par-etablissement?edition=${c.editionSlug}#${c.schoolSlug}`} className="btn btn-blanc">
                  Les candidats de son école
                </Link>
              )}
            </div>
          </div>
        </div>
        </div>
      </header>

      <div className="papier">
        <div className="conteneur grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="t-titre mb-5 text-3xl">Présentation</h2>
            <div className="prose-gdl">
              {c.shortBio && <p className="text-lg font-medium">{c.shortBio}</p>}
              {c.presentation ? c.presentation.split("\n").map((p, i) => <p key={i}>{p}</p>) : <p className="text-gris">La présentation sera publiée prochainement.</p>}
            </div>
          </section>
          <section>
            <h2 className="t-titre mb-5 text-3xl">Parcours</h2>
            {c.journey ? (
              <ol className="space-y-3 border-l-4 border-tribune/30 pl-5">
                {c.journey.split("\n").filter(Boolean).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            ) : (
              <p className="text-gris">Le parcours se complète au fil de la compétition.</p>
            )}
          </section>
        </div>

        {(c.videos.length > 0 || c.photos.length > 0) && (
          <div className="border-t border-ivoire-3">
            <div className="conteneur space-y-12 py-14 sm:py-20">
              {c.videos.length > 0 && (
                <section>
                  <h2 className="t-titre mb-6 text-4xl">Vidéos</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    {c.videos.map((v) => v.youtubeId && <YouTube key={v.id} id={v.youtubeId} title={v.title} />)}
                  </div>
                </section>
              )}
              {c.photos.length > 0 && (
                <section>
                  <h2 className="t-titre mb-6 text-4xl">Galerie</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {c.photos.map((p) => (
                      <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-ivoire-2">
                        <SmartImage src={p.thumbUrl ?? p.url} alt={p.alt} fill sizes="25vw" className="object-cover" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
        <div className="conteneur border-t border-ivoire-3 py-8">
          <ShareLinks url={`${siteUrl}/candidats/${c.slug}`} text={`${name} — Génie des Lycées ORATHON, ${c.editionTitle}`} />
        </div>
      </div>
    </article>
  );
}

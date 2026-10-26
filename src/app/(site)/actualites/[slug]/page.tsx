import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SmartImage } from "@/components/ui/SmartImage";
import { Markdown } from "@/components/ui/Markdown";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { ShareLinks } from "@/components/ui/ShareLinks";
import { getArticleBySlug } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await getArticleBySlug((await params).slug);
  return a ? { title: a.title, description: a.excerpt ?? undefined, openGraph: { type: "article", images: a.coverUrl ? [a.coverUrl] : undefined, publishedTime: a.publishedAt?.toISOString() } } : {};
}

export default async function ArticlePage({ params }: P) {
  const a = await getArticleBySlug((await params).slug);
  if (!a) notFound();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return (
    <article className="papier">
      <header className="conteneur pb-8 pt-28 sm:pt-32">
        <Link href="/actualites" className="lien text-sm text-gris">Actualités</Link>
        <p className="mt-6 flex items-center gap-2 text-sm text-gris">{a.category} · {formatDate(a.publishedAt)}{a.author ? ` · ${a.author}` : ""} {a.isDemo && <DemoBadge />}</p>
        <h1 className="t-titre mt-3 max-w-5xl text-[clamp(2.6rem,7vw,5.5rem)]">{a.title}</h1>
        {a.excerpt && <p className="mt-5 max-w-[60ch] text-xl text-gris">{a.excerpt}</p>}
      </header>
      {a.coverUrl && (
        <div className="conteneur">
          <div className="relative aspect-[16/8] overflow-hidden rounded-[1.75rem] bg-ivoire-2">
            <SmartImage src={a.coverUrl} alt={a.coverAlt ?? ""} fill priority sizes="100vw" className="object-cover" fallback={<div className="absolute inset-0 bg-ivoire-2" />} />
          </div>
        </div>
      )}
      <div className="conteneur py-12">
        <Markdown className="mx-auto">{a.body}</Markdown>
        <div className="mx-auto mt-12 max-w-[68ch] border-t border-ivoire-3 pt-6">
          <ShareLinks url={`${siteUrl}/actualites/${a.slug}`} text={a.title} />
        </div>
      </div>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartImage } from "@/components/ui/SmartImage";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { listArticles } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Actualités" };

export default async function NewsPage() {
  const [first, ...rest] = await listArticles();
  return (
    <>
      <PageHeader title="Actualités" />
      <div className="papier">
        <div className="conteneur py-14">
          {!first ? (
            <EmptyState title="Aucune actualité publiée" />
          ) : (
            <>
              <article className="group relative grid gap-8 border-b border-ivoire-3 pb-14 lg:grid-cols-[1.4fr_1fr] lg:items-end">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-ivoire-2">
                  <SmartImage src={first.coverUrl} alt={first.coverAlt ?? ""} fill priority sizes="(min-width:1024px) 60vw, 100vw" className="object-cover" fallback={<div className="absolute inset-0 bg-ivoire-2" />} />
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm text-gris">{first.category} · {formatDate(first.publishedAt)} {first.isDemo && <DemoBadge />}</p>
                  <h2 className="t-titre mt-2 text-[clamp(2.2rem,4.5vw,3.6rem)]">
                    <Link href={`/actualites/${first.slug}`} className="after:absolute after:inset-0 group-hover:text-tribune">{first.title}</Link>
                  </h2>
                  {first.excerpt && <p className="mt-4 text-lg text-gris">{first.excerpt}</p>}
                </div>
              </article>
              <ul className="divide-y divide-ivoire-3">
                {rest.map((a) => (
                  <li key={a.id} className="group relative grid gap-5 py-8 sm:grid-cols-[14rem_1fr]">
                    <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-ivoire-2">
                      <SmartImage src={a.coverUrl} alt={a.coverAlt ?? ""} fill sizes="14rem" className="object-cover" fallback={<div className="absolute inset-0 bg-ivoire-2" />} />
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-sm text-gris">{a.category} · {formatDate(a.publishedAt)} {a.isDemo && <DemoBadge />}</p>
                      <h2 className="t-sous-titre mt-1 text-2xl sm:text-3xl">
                        <Link href={`/actualites/${a.slug}`} className="after:absolute after:inset-0 group-hover:text-tribune">{a.title}</Link>
                      </h2>
                      {a.excerpt && <p className="mt-2 max-w-[65ch] text-gris">{a.excerpt}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditionView } from "@/components/edition/EditionView";
import { getEditionBySlug } from "@/lib/queries";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const e = await getEditionBySlug((await params).slug);
  return e ? { title: e.title, description: e.summary ?? undefined, openGraph: e.coverUrl ? { images: [e.coverUrl] } : undefined } : {};
}

export default async function EditionPage({ params }: P) {
  const edition = await getEditionBySlug((await params).slug);
  if (!edition) notFound();
  return <EditionView edition={edition} isCurrent={edition.status === "en_cours"} />;
}

import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { listFaqs } from "@/lib/queries";

export const metadata: Metadata = { title: "Questions fréquentes" };

export default async function FaqPage() {
  const faqs = await listFaqs();
  const topics = [...new Set(faqs.map((f) => f.topic ?? "Général"))];
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) };
  return (
    <>
      <PageHeader title="Questions fréquentes" />
      <div className="papier">
        <div className="conteneur py-14">
          {topics.map((t) => (
            <section key={t} className="mb-12 grid gap-6 lg:grid-cols-[14rem_1fr]">
              <h2 className="t-titre text-3xl">{t}</h2>
              <div className="divide-y divide-ivoire-3 border-y border-ivoire-3">
                {faqs.filter((f) => (f.topic ?? "Général") === t).map((f) => (
                  <details key={f.id} className="group py-1">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold">
                      {f.question}
                      <span aria-hidden className="text-2xl text-tribune transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="max-w-[65ch] pb-5 text-gris">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
          <p className="text-gris">Pas de réponse ? <Link href="/contact" className="lien text-tribune">Posez votre question</Link>.</p>
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}

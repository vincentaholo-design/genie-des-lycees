import Link from "next/link";
import type { ReactNode } from "react";

export function AdminHeader({ title, children, back }: { title: ReactNode; children?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-8">
      {back && <Link href={back.href} className="lien text-sm text-gris">{back.label}</Link>}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="t-titre text-[clamp(2.2rem,4vw,3.4rem)]">{title}</h1>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </header>
  );
}

export function Notice({ tone = "ok", children }: { tone?: "ok" | "err" | "info"; children: ReactNode }) {
  const cls = tone === "ok" ? "bg-[#e3f3e6] text-[#14532d]" : tone === "err" ? "bg-[#fbe4e1] text-[#7a1a12]" : "bg-ivoire-2";
  return <div role={tone === "err" ? "alert" : "status"} className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${cls}`}>{children}</div>;
}

export function Pill({ children, tone = "neutre" }: { children: ReactNode; tone?: "neutre" | "vert" | "rouge" | "or" | "bleu" }) {
  const t = { neutre: "bg-ivoire-2 text-encre", vert: "bg-[#e3f3e6] text-[#14532d]", rouge: "bg-[#fbe4e1] text-[#7a1a12]", or: "bg-[#fbecc8] text-[#6b4708]", bleu: "bg-[#e1e9fd] text-[#163d9e]" }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${t}`}>{children}</span>;
}

export function Stat({ label, value, href, sub }: { label: string; value: ReactNode; href?: string; sub?: ReactNode }) {
  const inner = (
    <>
      <p className="text-sm text-gris">{label}</p>
      <p className="t-chiffre mt-1 text-5xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-gris">{sub}</p>}
    </>
  );
  return href ? <Link href={href} className="block rounded-xl bg-[#fffaf0] p-5 ring-1 ring-ivoire-3 hover:ring-tribune">{inner}</Link> : <div className="rounded-xl bg-[#fffaf0] p-5 ring-1 ring-ivoire-3">{inner}</div>;
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl ring-1 ring-ivoire-3">
      <table className="w-full min-w-[40rem] border-collapse bg-[#fffaf0] text-sm">
        <thead>
          <tr className="border-b border-ivoire-3 text-left text-xs text-gris">
            {head.map((h, i) => <th key={i} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-ivoire-2">{children}</tbody>
      </table>
      {empty && <p className="bg-[#fffaf0] p-8 text-center text-gris">Rien à afficher pour le moment.</p>}
    </div>
  );
}

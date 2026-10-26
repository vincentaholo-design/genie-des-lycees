import Link from "next/link";
import { and, desc, sql, eq, ilike, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { AdminHeader, Pill, Table } from "@/components/admin/ui";
import { INSCRIPTION_STATUS_LABELS } from "@/lib/inscriptions/validation";
import { formatDateTime } from "@/lib/utils";

const TONES = { soumis: "or", en_verification: "bleu", incomplet: "or", accepte: "vert", refuse: "rouge" } as const;

export default async function InscriptionsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser("inscriptions");
  const db = await getDb();
  const editions = await db.select().from(s.editions).orderBy(sql`${s.editions.number} desc nulls last`);
  const categories = await db.select().from(s.categories);
  const edition = editions.find((e) => e.id === sp.edition) ?? editions.find((e) => e.status === "en_cours") ?? editions[0];
  const where = [eq(s.inscriptions.editionId, edition?.id ?? "00000000-0000-0000-0000-000000000000")];
  if (sp.statut) where.push(eq(s.inscriptions.status, sp.statut as never));
  if (sp.categorie) where.push(eq(s.inscriptions.categoryId, sp.categorie));
  if (sp.q) {
    const q = `%${sp.q.slice(0, 60)}%`;
    where.push(or(ilike(s.inscriptions.firstName, q), ilike(s.inscriptions.lastName, q), ilike(s.inscriptions.dossierNumber, q), ilike(s.inscriptions.email, q), ilike(s.inscriptions.city, q))!);
  }
  const rows = await db
    .select({ i: s.inscriptions, cat: s.categories.name, school: s.schools.name })
    .from(s.inscriptions)
    .innerJoin(s.categories, eq(s.categories.id, s.inscriptions.categoryId))
    .leftJoin(s.schools, eq(s.schools.id, s.inscriptions.schoolId))
    .where(and(...where))
    .orderBy(desc(s.inscriptions.createdAt))
    .limit(500);
  const exportQs = new URLSearchParams(Object.entries({ edition: edition?.id, statut: sp.statut, categorie: sp.categorie }).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <AdminHeader title="Inscriptions">
        {can(user.role, "inscriptions", "export") && (
          <>
            <a href={`/admin/export/inscriptions?${exportQs}`} className="btn btn-contour">Exporter en CSV</a>
            <a href={`/admin/export/inscriptions-acceptees?${exportQs}`} className="btn btn-contour">Liste des acceptés</a>
          </>
        )}
      </AdminHeader>
      <form className="mb-6 grid gap-3 rounded-xl bg-ivoire-2 p-4 md:grid-cols-5">
        <input name="q" type="search" defaultValue={sp.q} placeholder="Nom, dossier, e-mail, ville" aria-label="Recherche" className="champ md:col-span-2" />
        <select name="edition" defaultValue={edition?.id} aria-label="Édition" className="champ">
          {editions.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
        <select name="statut" defaultValue={sp.statut ?? ""} aria-label="Statut" className="champ">
          <option value="">Tous les statuts</option>
          {Object.entries(INSCRIPTION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="categorie" defaultValue={sp.categorie ?? ""} aria-label="Catégorie" className="champ">
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-tribune md:col-span-5 md:justify-self-start">Filtrer</button>
      </form>
      <p className="mb-3 text-sm text-gris">{rows.length} dossier(s)</p>
      <Table head={["Dossier", "Candidat", "Catégorie", "Établissement", "Mineur", "Statut", "Reçu le"]} empty={!rows.length}>
        {rows.map(({ i, cat, school }) => (
          <tr key={i.id} className="hover:bg-ivoire">
            <td className="whitespace-nowrap px-4 py-3"><Link href={`/admin/inscriptions/${i.id}`} className="font-semibold hover:text-tribune">{i.dossierNumber}</Link></td>
            <td className="px-4 py-3">{i.firstName} {i.lastName}{i.teamName ? <span className="block text-xs text-gris">{i.teamName}</span> : null}</td>
            <td className="px-4 py-3">{cat}</td>
            <td className="px-4 py-3">{school ?? i.schoolNameFree}</td>
            <td className="px-4 py-3">{i.isMinor ? <Pill tone="or">Oui</Pill> : "Non"}</td>
            <td className="px-4 py-3"><Pill tone={TONES[i.status]}>{INSCRIPTION_STATUS_LABELS[i.status]}</Pill></td>
            <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(i.createdAt)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

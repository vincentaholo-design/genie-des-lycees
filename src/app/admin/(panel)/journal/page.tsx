import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { AdminHeader, Table } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entite?: string }> }) {
  await requireUser("audit");
  const { entite } = await searchParams;
  const db = await getDb();
  const rows = await db.select().from(s.auditLogs).where(entite ? eq(s.auditLogs.entity, entite) : undefined).orderBy(desc(s.auditLogs.createdAt)).limit(300);
  return (
    <>
      <AdminHeader title="Journal d'audit">
        <form className="flex gap-2">
          <input name="entite" defaultValue={entite} placeholder="Filtrer par module (ex. inscriptions)" aria-label="Module" className="champ !min-h-10 !py-2" />
          <button className="btn btn-contour !min-h-10 !py-2">Filtrer</button>
        </form>
      </AdminHeader>
      <p className="mb-4 text-sm text-gris">Journal en insertion seule : il ne peut être ni modifié ni effacé depuis l'application.</p>
      <Table head={["Date", "Utilisateur", "Action", "Module", "Élément", "Détails"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap px-4 py-2">{formatDateTime(r.createdAt)}</td>
            <td className="px-4 py-2">{r.userEmail ?? "—"}</td>
            <td className="px-4 py-2 font-medium">{r.action.replaceAll("_", " ")}</td>
            <td className="px-4 py-2">{r.entity}</td>
            <td className="px-4 py-2 font-mono text-xs">{r.entityId?.slice(0, 8) ?? ""}</td>
            <td className="px-4 py-2 font-mono text-xs">{r.details ? JSON.stringify(r.details).slice(0, 140) : ""}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

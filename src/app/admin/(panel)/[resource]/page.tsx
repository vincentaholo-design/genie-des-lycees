import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getResource } from "@/lib/admin/resources";
import { allRelationOptions, listRows } from "@/lib/admin/crud";
import { AdminHeader, Notice, Pill, Table } from "@/components/admin/ui";
import { formatDate, formatDateTime } from "@/lib/utils";
import { BulkUpload } from "@/components/admin/BulkUpload";

export default async function ResourceList({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<{ q?: string; page?: string; supprime?: string }> }) {
  const { resource } = await params;
  const sp = await searchParams;
  const def = getResource(resource);
  if (!def) notFound();
  const user = await requireUser(def.permission, "read");
  const { rows, total, page, pages } = await listRows(def, { q: sp.q, page: Number(sp.page) || 1 });
  const rel = await allRelationOptions(def);
  const fieldOf = (name: string) => def.fields.find((f) => f.name === name);
  const canWrite = can(user.role, def.permission, "write");

  const cell = (name: string, row: Record<string, unknown>) => {
    const f = fieldOf(name);
    const v = row[name];
    if (v === null || v === undefined || v === "") return <span className="text-gris">—</span>;
    if (f?.type === "image" || name === "url") return /* eslint-disable-next-line @next/next/no-img-element */ <img src={String(v)} alt="" className="size-12 rounded object-cover" loading="lazy" />;
    if (typeof v === "boolean") return v ? <Pill tone="vert">Oui</Pill> : <Pill>Non</Pill>;
    if (f?.type === "relation") return rel[f.relation!]?.find((o) => o.value === v)?.label ?? "—";
    if (f?.type === "select") {
      const label = f.options?.find((o) => o.value === v)?.label ?? String(v);
      return <Pill tone={v === "publie" || v === "en_cours" ? "vert" : v === "brouillon" ? "or" : "neutre"}>{label}</Pill>;
    }
    if (v instanceof Date) return f?.type === "date" ? formatDate(v) : formatDateTime(v);
    if (f?.type === "date") return formatDate(String(v));
    return String(v).slice(0, 80);
  };

  return (
    <>
      <AdminHeader title={def.label}>
        {canWrite && def.key === "videos" && <Link href="/admin/televerser-video" className="btn btn-tribune">Mettre en ligne un fichier</Link>}
        {canWrite && <Link href={`/admin/${def.key}/nouveau`} className="btn btn-tribune">Ajouter {def.singular.startsWith("é") || def.singular.startsWith("a") ? "une" : "un"} {def.singular}</Link>}
      </AdminHeader>
      {sp.supprime && <Notice>Élément supprimé. L'action est inscrite au journal.</Notice>}
      {def.key === "media" && canWrite && <BulkUpload albums={rel.albums ?? []} />}
      <form className="mb-4 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Rechercher</label>
        <input id="q" name="q" type="search" defaultValue={sp.q} placeholder="Rechercher…" className="champ max-w-sm !min-h-10 !py-2" />
        <button className="btn btn-contour !min-h-10 !py-2">Rechercher</button>
      </form>
      <p className="mb-3 text-sm text-gris">{total} élément(s)</p>
      <Table head={[...def.list.map((n) => (n === "url" ? "Aperçu" : fieldOf(n)?.label ?? n).split(" (")[0]), ""]} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={String(r.id)} className="hover:bg-ivoire">
            {def.list.map((n, i) => (
              <td key={n} className="px-4 py-3 align-middle">
                {i === (def.list[0] === "portraitUrl" || def.list[0] === "coverUrl" || def.list[0] === "logoUrl" || def.list[0] === "url" ? 1 : 0) ? (
                  <Link href={`/admin/${def.key}/${r.id}`} className="font-semibold hover:text-tribune">{cell(n, r)}</Link>
                ) : (
                  cell(n, r)
                )}
              </td>
            ))}
            <td className="px-4 py-3 text-right">
              <Link href={`/admin/${def.key}/${r.id}`} className="lien text-tribune">{canWrite ? "Modifier" : "Voir"}</Link>
            </td>
          </tr>
        ))}
      </Table>
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center gap-2 text-sm">
          {page > 1 && <Link className="btn btn-contour !min-h-10 !py-2" href={`?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(page - 1) })}`}>Précédent</Link>}
          <span>Page {page} / {pages}</span>
          {page < pages && <Link className="btn btn-contour !min-h-10 !py-2" href={`?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(page + 1) })}`}>Suivant</Link>}
        </nav>
      )}
    </>
  );
}

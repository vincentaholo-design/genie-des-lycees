import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getResource } from "@/lib/admin/resources";
import { allRelationOptions, getRow, toFormValue } from "@/lib/admin/crud";
import { deleteResource, saveResource } from "@/lib/actions/admin";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { AdminHeader, Notice } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/utils";

export default async function ResourceEdit({ params, searchParams }: { params: Promise<{ resource: string; id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const { resource, id } = await params;
  const sp = await searchParams;
  const def = getResource(resource);
  if (!def) notFound();
  const isNew = id === "nouveau";
  const user = await requireUser(def.permission, isNew ? "write" : "read");
  const row = isNew ? null : await getRow(def, id);
  if (!isNew && !row) notFound();
  const options = await allRelationOptions(def);
  const values: Record<string, string> = {};
  for (const f of def.fields) {
    const v = row?.[f.name];
    values[f.name] = f.type === "boolean" ? String(v ?? (isNew && (f.name === "published" || f.name === "voteEnabled"))) : toFormValue(f, v);
  }
  if (isNew) {
    for (const f of def.fields) if (f.type === "select" && f.required && !values[f.name]) values[f.name] = f.options?.[0]?.value ?? "";
  }
  const canWrite = can(user.role, def.permission, "write");
  const publicPath = row && def.publicPath ? def.publicPath(row) : null;
  const title = isNew ? `Nouveau : ${def.singular}` : String(row?.[def.titleField] ?? def.singular);

  return (
    <>
      <AdminHeader title={title} back={{ href: `/admin/${def.key}`, label: def.label }}>
        {publicPath && <Link href={publicPath} target="_blank" className="btn btn-contour">Voir sur le site</Link>}
      </AdminHeader>
      {sp.cree && <Notice>Élément créé.</Notice>}
      {row?.isDemo && <Notice tone="info">Contenu de démonstration : remplacez-le par l'information officielle, puis décochez « Contenu de démonstration ».</Notice>}
      {canWrite ? (
        <ResourceForm
          action={saveResource.bind(null, def.key, isNew ? null : id)}
          fields={def.fields}
          values={values}
          options={options}
          isSuper={user.role === "super_admin"}
          submitLabel={isNew ? "Créer" : "Enregistrer"}
        />
      ) : (
        <dl className="grid gap-4 md:grid-cols-2">
          {def.fields.map((f) => (
            <div key={f.name}>
              <dt className="text-sm text-gris">{f.label}</dt>
              <dd className="whitespace-pre-wrap">{values[f.name] || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
      {row && (
        <div className="mt-10 flex flex-col gap-4 border-t border-ivoire-3 pt-6 text-sm text-gris">
          <p>
            {row.createdAt ? `Créé le ${formatDateTime(row.createdAt as Date)}` : ""}
            {row.updatedAt ? ` · modifié le ${formatDateTime(row.updatedAt as Date)}` : ""}
          </p>
          {can(user.role, def.permission, "delete") && <DeleteForm action={deleteResource.bind(null, def.key, id)} label={`cet élément (${def.singular})`} />}
        </div>
      )}
    </>
  );
}

import { desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { AdminHeader, Pill } from "@/components/admin/ui";
import { toggleMessageHandled } from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/utils";

export default async function MessagesPage() {
  const user = await requireUser("messages");
  const db = await getDb();
  const rows = await db.select().from(s.messages).orderBy(desc(s.messages.createdAt)).limit(200);
  return (
    <>
      <AdminHeader title="Messages">
        {can(user.role, "messages", "export") && <a href="/admin/export/messages" className="btn btn-contour">Exporter en CSV</a>}
      </AdminHeader>
      {rows.length === 0 && <p className="text-gris">Aucun message reçu.</p>}
      <ul className="space-y-4">
        {rows.map((m) => (
          <li key={m.id} className={`rounded-xl p-5 ring-1 ${m.handled ? "bg-ivoire ring-ivoire-3" : "bg-[#fffaf0] ring-tribune/40"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{m.name} <span className="font-normal text-gris">· <a className="lien" href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ""}</span></p>
              <div className="flex items-center gap-2">
                <Pill tone={m.type === "partenariat" ? "or" : "neutre"}>{m.type === "partenariat" ? "Partenariat" : "Contact"}</Pill>
                <span className="text-xs text-gris">{formatDateTime(m.createdAt)}</span>
              </div>
            </div>
            {(m.organisation || m.subject) && <p className="mt-1 text-sm font-medium">{m.organisation ?? m.subject}</p>}
            <p className="mt-2 whitespace-pre-wrap text-[0.95rem]">{m.body}</p>
            {can(user.role, "messages", "write") && (
              <form action={toggleMessageHandled.bind(null, m.id)} className="mt-3">
                <button className="text-sm text-tribune underline">{m.handled ? "Rouvrir" : "Marquer comme traité"}</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { AdminHeader, Notice, Pill } from "@/components/admin/ui";
import { ReviewForm } from "@/components/admin/ReviewForm";
import { promoteInscription, reviewInscription } from "@/lib/actions/admin";
import { INSCRIPTION_STATUS_LABELS } from "@/lib/inscriptions/validation";
import { ageAt, formatDate, formatDateTime } from "@/lib/utils";

export default async function InscriptionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("inscriptions");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const [row] = await db
    .select({ i: s.inscriptions, cat: s.categories.name, school: s.schools.name, edition: s.editions.title })
    .from(s.inscriptions)
    .innerJoin(s.categories, eq(s.categories.id, s.inscriptions.categoryId))
    .innerJoin(s.editions, eq(s.editions.id, s.inscriptions.editionId))
    .leftJoin(s.schools, eq(s.schools.id, s.inscriptions.schoolId))
    .where(eq(s.inscriptions.id, id));
  if (!row) notFound();
  const { i } = row;
  const docs = await db.select().from(s.documents).where(eq(s.documents.inscriptionId, id));
  const [candidate] = await db.select({ id: s.candidates.id }).from(s.candidates).where(eq(s.candidates.inscriptionId, id));
  const [reviewer] = i.reviewedBy ? await db.select({ name: s.users.name }).from(s.users).where(eq(s.users.id, i.reviewedBy)) : [];

  const Item = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <dt className="text-xs text-gris">{label}</dt>
      <dd className="font-medium">{children || "—"}</dd>
    </div>
  );

  return (
    <>
      <AdminHeader title={`Dossier ${i.dossierNumber}`} back={{ href: "/admin/inscriptions", label: "Inscriptions" }}>
        <Pill tone="bleu">{INSCRIPTION_STATUS_LABELS[i.status]}</Pill>
      </AdminHeader>
      {i.isDemo && <Notice tone="info">Dossier fictif de démonstration.</Notice>}
      <div className="grid gap-10 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <section className="rounded-xl bg-[#fffaf0] p-6 ring-1 ring-ivoire-3">
            <h2 className="t-sous-titre mb-4 text-xl">Candidat</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Item label="Nom">{i.firstName} {i.lastName}</Item>
              <Item label="Naissance">{formatDate(i.birthDate)} ({ageAt(i.birthDate)} ans)</Item>
              <Item label="Catégorie">{row.cat} · {row.edition}</Item>
              <Item label="Classe / niveau">{i.level}</Item>
              <Item label="Établissement">{row.school ?? `${i.schoolNameFree} (saisi librement)`}</Item>
              <Item label="Ville">{i.city}</Item>
              <Item label="Téléphone"><a href={`tel:${i.phone}`} className="lien">{i.phone}</a></Item>
              <Item label="E-mail"><a href={`mailto:${i.email}`} className="lien">{i.email}</a></Item>
            </dl>
            {i.teamName && (
              <div className="mt-6">
                <p className="text-xs text-gris">Équipe « {i.teamName} »</p>
                <ul className="mt-1 list-disc pl-5">
                  {(i.teamMembers ?? []).map((m, k) => <li key={k}>{m.firstName} {m.lastName}{m.level ? `, ${m.level}` : ""}</li>)}
                </ul>
              </div>
            )}
            {i.motivation && <p className="mt-6 whitespace-pre-wrap rounded-lg bg-ivoire p-4 text-[0.95rem]">{i.motivation}</p>}
          </section>
          {i.isMinor && (
            <section className="rounded-xl bg-[#fffaf0] p-6 ring-1 ring-ivoire-3">
              <h2 className="t-sous-titre mb-4 text-xl">Parent ou tuteur</h2>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Item label="Nom">{i.guardianName}</Item>
                <Item label="Lien">{i.guardianRelation}</Item>
                <Item label="Téléphone">{i.guardianPhone}</Item>
              </dl>
            </section>
          )}
          <section className="rounded-xl bg-[#fffaf0] p-6 ring-1 ring-ivoire-3">
            <h2 className="t-sous-titre mb-4 text-xl">Accords et pièces</h2>
            <ul className="space-y-1 text-sm">
              <li>Règlement accepté : {i.consentRules ? "oui" : "non"}</li>
              <li>Traitement des données : {i.consentData ? "oui" : "non"}</li>
              {i.isMinor && <li>Accord parental : {i.consentGuardian ? "oui" : <strong className="text-[#b42318]">non</strong>}</li>}
              <li>Diffusion de l'image : {i.consentImage ? "autorisée" : <strong>non autorisée (ne pas publier de photo)</strong>}</li>
            </ul>
            <h3 className="mb-2 mt-5 text-sm font-semibold">Pièces justificatives (privées)</h3>
            {docs.length ? (
              <ul className="space-y-1 text-sm">
                {docs.map((d) => (
                  <li key={d.id}><a href={`/admin/documents/${d.id}`} className="lien text-tribune">{d.kind.replace("_", " ")} — {d.originalName}</a> <span className="text-gris">({Math.round(d.size / 1024)} Ko)</span></li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gris">Aucune pièce jointe.</p>
            )}
          </section>
        </div>
        <aside className="space-y-6">
          {can(user.role, "inscriptions", "write") && (
            <section className="rounded-xl bg-[#fffaf0] p-6 ring-1 ring-ivoire-3">
              <h2 className="t-sous-titre mb-4 text-xl">Décision</h2>
              <ReviewForm action={reviewInscription.bind(null, i.id)} status={i.status} reviewNote={i.reviewNote ?? ""} publicNote={i.publicNote ?? ""} />
              {i.reviewedAt && <p className="mt-3 text-xs text-gris">Dernière revue : {formatDateTime(i.reviewedAt)}{reviewer ? ` par ${reviewer.name}` : ""}</p>}
            </section>
          )}
          {i.status === "accepte" && can(user.role, "candidates", "write") && (
            <section className="rounded-xl bg-[#fffaf0] p-6 ring-1 ring-ivoire-3">
              <h2 className="t-sous-titre mb-2 text-xl">Fiche publique</h2>
              {candidate ? (
                <a href={`/admin/candidates/${candidate.id}`} className="btn btn-contour">Ouvrir la fiche candidat</a>
              ) : (
                <form action={promoteInscription.bind(null, i.id)}>
                  <p className="mb-3 text-sm text-gris">Crée la fiche candidat (non publiée) à partir du dossier. Aucune coordonnée n'y est copiée.</p>
                  <button className="btn btn-tribune">Créer la fiche candidat</button>
                </form>
              )}
            </section>
          )}
          <p className="text-xs text-gris">Reçu le {formatDateTime(i.createdAt)}.</p>
        </aside>
      </div>
    </>
  );
}

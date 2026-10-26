import { requireUser } from "@/lib/auth/session";
import { getSetting } from "@/lib/queries";
import { AdminHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { saveSettings } from "@/lib/actions/admin";
import { services } from "@/lib/env";

export default async function SettingsPage() {
  await requireUser("settings");
  const [hero, about, contact] = await Promise.all([getSetting("hero"), getSetting("about"), getSetting("contact")]);
  const svc: [string, string, boolean][] = [
    ["Base de données", services.database === "postgres" ? "PostgreSQL (DATABASE_URL)" : "PGlite embarquée (démo / local)", services.database === "postgres"],
    ["Stockage des médias", services.storage === "supabase" ? "Supabase Storage" : "Dossier local .data/uploads", services.storage === "supabase"],
    ["E-mails", services.email === "resend" ? "Resend" : "Non configuré", services.email === "resend"],
    ["SMS", services.sms === "webhook" ? "Webhook fournisseur" : "Non configuré", services.sms === "webhook"],
    ["Anti-robot", services.captcha === "turnstile" ? "Cloudflare Turnstile" : "Non configuré", services.captcha === "turnstile"],
  ];
  return (
    <>
      <AdminHeader title="Paramètres du site" />
      <section className="mb-10 rounded-xl bg-[#fffaf0] p-5 ring-1 ring-ivoire-3">
        <h2 className="mb-3 font-semibold">Services connectés</h2>
        <ul className="grid gap-2 text-sm md:grid-cols-2">
          {svc.map(([k, v, ok]) => (
            <li key={k} className="flex justify-between gap-3 border-b border-ivoire-2 py-1.5">
              <span>{k}</span>
              <span className={ok ? "font-semibold text-[#14532d]" : "text-gris"}>{v}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gris">Ces services se configurent par variables d'environnement côté serveur (voir README). Aucune clé n'est visible ici.</p>
      </section>
      <div className="space-y-10">
        <SettingsForm
          title="Accueil"
          action={saveSettings.bind(null, "hero")}
          fields={[
            { name: "headline", label: "Titre d'accroche", value: hero.headline ?? "", help: "Le premier mot passe sur la première ligne, la suite en or." },
            { name: "intro", label: "Texte d'introduction", value: hero.intro ?? "", textarea: true },
            { name: "imageFile", label: "Photo principale (orateur sur scène)", value: "", file: true, preview: hero.imageUrl },
            { name: "imageUrl", label: "ou adresse de la photo", value: hero.imageUrl ?? "" },
            { name: "imageAlt", label: "Description de la photo", value: hero.imageAlt ?? "" },
            { name: "imageCredit", label: "Crédit photo", value: hero.imageCredit ?? "" },
          ]}
        />
        <SettingsForm
          title="À propos"
          action={saveSettings.bind(null, "about")}
          fields={[
            { name: "mission", label: "Mission", value: about.mission ?? "", textarea: true },
            { name: "motto", label: "Devise", value: about.motto ?? "" },
            { name: "vision", label: "Vision", value: about.vision ?? "", textarea: true },
            { name: "objectives", label: "Objectifs (un par ligne)", value: (about.objectives ?? []).join("\n"), textarea: true },
            { name: "history", label: "Histoire", value: about.history ?? "", textarea: true },
          ]}
        />
        <SettingsForm
          title="Coordonnées publiques"
          action={saveSettings.bind(null, "contact")}
          fields={[
            { name: "email", label: "E-mail de contact", value: contact.email ?? "" },
            { name: "phone", label: "Téléphone", value: contact.phone ?? "" },
            { name: "whatsapp", label: "Numéro WhatsApp", value: contact.whatsapp ?? "" },
            { name: "address", label: "Adresse", value: contact.address ?? "" },
          ]}
        />
      </div>
    </>
  );
}

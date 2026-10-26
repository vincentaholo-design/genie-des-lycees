import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { photos } from "@/config/media";
import { ContactForm } from "@/components/forms/ContactForm";
import { getSetting } from "@/lib/queries";
import { socials } from "@/config/media";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const contact = await getSetting("contact");
  return (
    <>
      <PageHeader title="Contact" intro="Une question sur l'inscription, le vote, une photo à retirer ? Écrivez-nous." image={photos.publicApplaudit} />
      <div className="papier">
        <div className="conteneur grid gap-12 py-14 lg:grid-cols-[1.5fr_1fr]">
          <ContactForm type="contact" />
          <aside className="space-y-5">
            <h2 className="font-semibold">Autres moyens</h2>
            <ul className="space-y-2 text-gris">
              {contact.email && <li><a className="lien" href={`mailto:${contact.email}`}>{contact.email}</a></li>}
              {contact.phone && <li><a className="lien" href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a></li>}
              {contact.whatsapp && <li><a className="lien" href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
              {contact.address && <li>{contact.address}</li>}
              <li><a className="lien" href={socials.facebook} target="_blank" rel="noopener noreferrer">Page Facebook de l'AJ3C</a></li>
              <li><a className="lien" href={socials.tiktok} target="_blank" rel="noopener noreferrer">TikTok @geniedeslycees</a></li>
              <li><a className="lien" href={socials.youtube} target="_blank" rel="noopener noreferrer">YouTube @geniedeslycees</a></li>
            </ul>
            {!contact.email && !contact.phone && <p className="text-sm text-gris">Les coordonnées officielles se renseignent dans l'administration (Paramètres du site).</p>}
          </aside>
        </div>
      </div>
    </>
  );
}

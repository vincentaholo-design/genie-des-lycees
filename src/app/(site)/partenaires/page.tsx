import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContactForm } from "@/components/forms/ContactForm";
import { SponsorsWall } from "@/components/ui/SponsorsWall";
import { listPartners } from "@/lib/queries";
import { photos } from "@/config/media";

export const metadata: Metadata = { title: "Partenaires & sponsors" };

export default async function PartnersPage() {
  const { tiers, untiered, total } = await listPartners();
  const groups = [...tiers.map((t) => ({ name: t.name, partners: t.partners })), ...(untiered.length ? [{ name: "Ils nous soutiennent", partners: untiered }] : [])];
  return (
    <>
      <PageHeader title="Partenaires & sponsors" intro="Ils rendent possibles la scène, les déplacements des candidats et la remise des prix. Merci à eux." image={photos.remiseDesPrix} />
      <div className="papier">
        <div className="conteneur py-14">
          {total === 0 ? (
            <p className="max-w-2xl text-lg text-gris">Les partenaires de l'édition seront présentés ici.</p>
          ) : (
            groups.map((g) => (
              <section key={g.name} className="mb-14 rounded-[2rem] bg-gradient-to-b from-ivoire-2 to-[#e3ecff] px-4 py-10 sm:p-10">
                <div className="mb-8 text-center">
                  <p className="t-marque texte-degrade-fonce text-4xl sm:text-5xl">Merci</p>
                  <h2 className="t-titre mt-1 text-3xl">{g.name}</h2>
                  <p className="mt-2 text-gris">{g.partners.length} partenaires</p>
                </div>
                <SponsorsWall partners={g.partners} />
              </section>
            ))
          )}
        </div>
        <section id="devenir-partenaire" className="scroll-mt-28 pb-20">
          <div className="conteneur grid gap-12 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <h2 className="t-titre text-[clamp(2rem,4.5vw,3rem)]">Devenir partenaire</h2>
              <p className="mt-4 text-gris">Dotation des prix, logistique, diffusion, mécénat de compétences : décrivez votre projet, l'équipe de l'AJ3C vous recontacte.</p>
              <p className="mt-6 text-sm text-gris">Ou directement : <a className="lien text-tribune" href="mailto:aj3c2013@gmail.com">aj3c2013@gmail.com</a> · <a className="lien text-tribune" href="tel:+22897075707">+228 97 07 57 07</a></p>
            </div>
            <div className="carte p-6 sm:p-8">
              <ContactForm type="partenariat" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

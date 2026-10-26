import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getCurrentEdition, getSetting } from "@/lib/queries";
import { voteState } from "@/lib/vote/service";
import { env } from "@/lib/env";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [edition, about, contact] = await Promise.all([getCurrentEdition(), getSetting("about"), getSetting("contact")]);
  const voteOpen = edition ? voteState(edition, new Date()) === "ouvert" : false;
  return (
    <>
      {env.demoMode && (
        <div className="bg-encre px-4 py-1.5 text-center text-[0.78rem] font-medium text-white">
          Version de démonstration : photos et partenaires réels ; candidats, dates et résultats marqués « Démo » fictifs.
        </div>
      )}
      <Header voteOpen={voteOpen} />
      <main id="contenu" className="-mt-[4.75rem] sm:-mt-[5rem] lg:-mt-[5.5rem]">{children}</main>
      <Footer about={about} contact={contact} />
    </>
  );
}

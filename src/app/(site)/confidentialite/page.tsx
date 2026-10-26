import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Markdown } from "@/components/ui/Markdown";

export const metadata: Metadata = { title: "Confidentialité, données et droit à l'image" };

const TEXT = `
> Modèle à faire valider par l'AJ3C (et, si besoin, par un juriste) avant la mise en ligne. Les durées ci-dessous sont des propositions.

## Qui traite vos données
L'AJ3C (Association des Jeunes Communicateurs pour le Changement de Comportement), organisatrice du concours Génie des Lycées ORATHON.

## Quelles données, pour quoi faire
- **Inscription** : identité, date de naissance, établissement, classe, téléphone, e-mail, et pour un mineur le nom, le lien et le téléphone d'un parent ou tuteur. Elles servent uniquement à gérer la candidature et à joindre le candidat.
- **Pièces justificatives** : stockées dans un espace privé, consultables par la seule équipe des candidatures.
- **Vote du public** : l'adresse e-mail ou le numéro saisi n'est jamais conservé en clair. Seule une empreinte chiffrée est gardée, pour empêcher les votes multiples. L'adresse IP est elle aussi conservée sous forme d'empreinte, pour détecter les abus.
- **Messages** : nom, e-mail et contenu du message, pour y répondre.

## Ce qui est public
Sur le site ne paraissent que le nom, l'établissement, la classe, la présentation et, avec autorisation, la photo du candidat. **Les coordonnées ne sont jamais publiées.**

## Photos et vidéos des mineurs
- Le portrait d'un candidat ne s'affiche que si l'autorisation de diffusion a été donnée à l'inscription.
- Pour un mineur, cette autorisation relève du parent ou tuteur.
- Elle peut être retirée à tout moment depuis la page Contact : la photo est alors retirée du site dans les meilleurs délais.
- Les photos de groupe prises pendant les événements publics sont publiées avec légende et crédit. Toute personne peut en demander le retrait.

## Durées de conservation proposées
- Dossiers non retenus : supprimés 6 mois après la fin de l'édition.
- Dossiers retenus : coordonnées supprimées 12 mois après la fin de l'édition. Le nom, l'établissement et le palmarès restent dans les archives publiques, sauf opposition.
- Empreintes de vote et journaux d'audit : 12 mois après la clôture du vote, pour traiter d'éventuelles contestations.
- Messages : 24 mois.

## Vos droits
Vous pouvez demander l'accès à vos données, leur rectification ou leur suppression, et retirer une autorisation de diffusion d'image, depuis la page Contact. Pour un mineur, le parent ou tuteur peut exercer ces droits.

## Sécurité
Connexions chiffrées, accès à l'administration par rôle, journalisation des actions sensibles, documents privés hors de l'espace public.
`;

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Confidentialité" intro="Données personnelles, vote et droit à l'image." />
      <div className="papier">
        <div className="conteneur py-14">
          <Markdown>{TEXT}</Markdown>
        </div>
      </div>
    </>
  );
}

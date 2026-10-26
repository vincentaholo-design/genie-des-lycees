"use client";

import { useSubmit } from "@/components/forms/useSubmit";
import { useActionState } from "react";
import { trackDossier, type TrackState } from "@/lib/actions/public";

const TONE: Record<string, string> = {
  soumis: "bg-ivoire-2",
  en_verification: "bg-ivoire-2",
  incomplet: "bg-[#fff1d6]",
  accepte: "bg-[#e3f3e6]",
  refuse: "bg-[#fbe4e1]",
};

export function TrackForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackDossier, {});
  const onSubmit = useSubmit(action);
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form action={action} onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="dossier" className="etiquette">Numéro de dossier</label>
          <input id="dossier" name="dossier" defaultValue={state.values?.dossier} placeholder="GDL26-XXXXXX" autoCapitalize="characters" className="champ uppercase" required />
        </div>
        <div>
          <label htmlFor="email" className="etiquette">Adresse e-mail utilisée à l'inscription</label>
          <input id="email" name="email" type="email" defaultValue={state.values?.email} className="champ" required />
        </div>
        {state.message && !state.ok && <p role="alert" className="erreur !text-sm">{state.message}</p>}
        <button className="btn btn-tribune" disabled={pending}>{pending ? "Recherche…" : "Voir le statut"}</button>
      </form>
      <div aria-live="polite">
        {state.result && (
          <div className={`rounded-2xl p-6 ${TONE[state.result.status] ?? "bg-ivoire-2"}`}>
            <p className="text-sm text-gris">Dossier {state.result.dossier} · {state.result.edition} · {state.result.category}</p>
            <p className="t-sous-titre mt-2 text-3xl">{state.result.label}</p>
            {state.result.note && <p className="mt-3">{state.result.note}</p>}
            <p className="mt-4 text-sm text-gris">Reçu le {new Date(state.result.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        )}
      </div>
    </div>
  );
}

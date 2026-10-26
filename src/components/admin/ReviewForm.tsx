"use client";

import { useSubmit } from "@/components/forms/useSubmit";
import { useActionState } from "react";
import type { AdminState } from "@/lib/actions/admin";
import { INSCRIPTION_STATUS_LABELS } from "@/lib/inscriptions/validation";

export function ReviewForm({ action, status, reviewNote, publicNote }: { action: (s: AdminState, fd: FormData) => Promise<AdminState>; status: string; reviewNote: string; publicNote: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const onSubmit = useSubmit(formAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="status" className="etiquette">Statut</label>
        <select id="status" name="status" defaultValue={status} className="champ">
          {Object.entries(INSCRIPTION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="publicNote" className="etiquette">Message au candidat (visible au suivi)</label>
        <textarea id="publicNote" name="publicNote" rows={3} defaultValue={publicNote} className="champ" placeholder="ex. Merci d'apporter votre carte scolaire au casting." />
      </div>
      <div>
        <label htmlFor="reviewNote" className="etiquette">Note interne</label>
        <textarea id="reviewNote" name="reviewNote" rows={3} defaultValue={reviewNote} className="champ" />
      </div>
      {state.message && <p role="status" className={state.ok ? "text-sm font-medium text-[#14532d]" : "erreur"}>{state.message}</p>}
      <button className="btn btn-tribune w-full" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer la décision"}</button>
    </form>
  );
}

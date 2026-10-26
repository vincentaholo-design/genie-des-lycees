"use client";

import { useActionState, useState } from "react";
import type { AdminState } from "@/lib/actions/admin";

/** Suppression en deux temps : ouverture explicite, puis saisie du mot SUPPRIMER. */
export function DeleteForm({ action, label }: { action: (s: AdminState, fd: FormData) => Promise<AdminState>; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-[#b42318] underline underline-offset-4">
        Supprimer {label}
      </button>
    );
  return (
    <form action={formAction} className="space-y-3 rounded-xl border-2 border-[#b42318]/40 bg-[#fff1ef] p-4">
      <p className="text-sm font-semibold text-[#7a1a12]">Suppression définitive de {label}. Pour un contenu déjà publié, dépublier est souvent préférable.</p>
      <label htmlFor="confirm" className="etiquette">Tapez SUPPRIMER pour confirmer</label>
      <input id="confirm" name="confirm" autoComplete="off" className="champ max-w-xs" />
      {state.message && <p role="alert" className="erreur">{state.message}</p>}
      <div className="flex gap-3">
        <button className="btn !min-h-10 bg-[#b42318] !py-2 text-white" disabled={pending}>{pending ? "Suppression…" : "Supprimer définitivement"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-contour !min-h-10 !py-2">Annuler</button>
      </div>
    </form>
  );
}

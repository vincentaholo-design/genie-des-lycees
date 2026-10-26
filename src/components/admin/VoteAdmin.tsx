"use client";

import { useSubmit } from "@/components/forms/useSubmit";
import { useActionState, useState } from "react";
import type { AdminState } from "@/lib/actions/admin";

type Action = (s: AdminState, fd: FormData) => Promise<AdminState>;

function Msg({ state }: { state: AdminState }) {
  if (!state.message) return null;
  return <p role="status" className={`mt-3 text-sm font-medium ${state.ok ? "text-[#14532d]" : "text-[#b42318]"}`}>{state.message}</p>;
}

export function VoteControls({ action, state: vstate }: { action: Action; state: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [op, setOp] = useState<string | null>(null);
  return (
    <section className="mt-8 rounded-xl bg-[#fffaf0] p-5 ring-1 ring-ivoire-3">
      <h2 className="mb-3 font-semibold">Pilotage</h2>
      <div className="flex flex-wrap gap-2">
        {(vstate === "ferme" || vstate === "a_venir") && <button type="button" onClick={() => setOp("ouvrir")} className="btn btn-tribune !min-h-10 !py-2">Ouvrir le vote</button>}
        {vstate === "ouvert" && <button type="button" onClick={() => setOp("suspendre")} className="btn btn-contour !min-h-10 !py-2">Suspendre</button>}
        {vstate === "suspendu" && <button type="button" onClick={() => setOp("reprendre")} className="btn btn-tribune !min-h-10 !py-2">Reprendre</button>}
        {vstate !== "clos" && <button type="button" onClick={() => setOp("clore")} className="btn !min-h-10 bg-[#b42318] !py-2 text-white">Clore maintenant</button>}
      </div>
      {op && (
        <form action={formAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <input type="hidden" name="op" value={op} />
          <div>
            <label htmlFor="note" className="etiquette">Motif {op === "suspendre" ? "(obligatoire, journalisé)" : "(journalisé)"}</label>
            <input id="note" name="note" className="champ" />
          </div>
          {op === "clore" && (
            <div>
              <label htmlFor="confirm-clore" className="etiquette">Tapez CLORE</label>
              <input id="confirm-clore" name="confirm" className="champ" autoComplete="off" />
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn btn-tribune" disabled={pending}>Confirmer</button>
            <button type="button" className="btn btn-contour" onClick={() => setOp(null)}>Annuler</button>
          </div>
        </form>
      )}
      <Msg state={state} />
    </section>
  );
}

export function VoteSettingsForm({ action, values }: { action: Action; values: Record<string, string | boolean> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const onSubmit = useSubmit(formAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-4 rounded-xl bg-[#fffaf0] p-5 ring-1 ring-ivoire-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="voteMethod" className="etiquette">Vérification</label>
          <select id="voteMethod" name="voteMethod" defaultValue={String(values.voteMethod)} className="champ">
            <option value="code_email">Code par e-mail</option>
            <option value="code_sms">Code par SMS</option>
            <option value="leger">Léger : appareil + anti-robot</option>
          </select>
        </div>
        <div>
          <label htmlFor="voteScope" className="etiquette">Fréquence</label>
          <select id="voteScope" name="voteScope" defaultValue={String(values.voteScope)} className="champ">
            <option value="une_fois_par_edition">Un vote par édition</option>
            <option value="une_fois_par_jour">Un vote par jour</option>
          </select>
        </div>
        <div>
          <label htmlFor="voteOpensAt" className="etiquette">Ouverture (heure de Lomé)</label>
          <input id="voteOpensAt" name="voteOpensAt" type="datetime-local" defaultValue={String(values.voteOpensAt)} className="champ" />
        </div>
        <div>
          <label htmlFor="voteClosesAt" className="etiquette">Clôture automatique</label>
          <input id="voteClosesAt" name="voteClosesAt" type="datetime-local" defaultValue={String(values.voteClosesAt)} className="champ" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="resultsVisibility" className="etiquette">Publication des résultats du vote</label>
          <select id="resultsVisibility" name="resultsVisibility" defaultValue={String(values.resultsVisibility)} className="champ">
            <option value="jamais">Jamais (résultats officiels uniquement)</option>
            <option value="apres_cloture">Après la clôture</option>
            <option value="en_direct">En direct (résultats partiels visibles)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="voteInstructions" className="etiquette">Instructions affichées aux votants</label>
          <textarea id="voteInstructions" name="voteInstructions" rows={3} defaultValue={String(values.voteInstructions)} className="champ" />
        </div>
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <input type="checkbox" name="voteRequireCaptcha" defaultChecked={Boolean(values.voteRequireCaptcha)} className="size-5" />
          Exiger la vérification anti-robot (toujours exigée en mode léger)
        </label>
      </div>
      <p className="text-xs text-gris">Une fois des votes enregistrés, la méthode et la fréquence sont verrouillées pour l'édition. Chaque modification est journalisée.</p>
      <button className="btn btn-tribune" disabled={pending}>Enregistrer les règles</button>
      <Msg state={state} />
    </form>
  );
}

export function InvalidateForm({ action, voteId }: { action: Action; voteId: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-[#b42318] underline">Invalider</button>;
  return (
    <form action={formAction} className="flex min-w-72 flex-col gap-2">
      <input type="hidden" name="voteId" value={voteId} />
      <label htmlFor={`r-${voteId}`} className="text-xs font-semibold">Motif documenté (10 caractères min.)</label>
      <input id={`r-${voteId}`} name="reason" className="champ !min-h-9 !py-1.5 text-sm" required minLength={10} />
      <div className="flex gap-2">
        <button className="text-xs font-semibold text-[#b42318] underline" disabled={pending}>Confirmer l'invalidation</button>
        <button type="button" className="text-xs underline" onClick={() => setOpen(false)}>Annuler</button>
      </div>
      {state.message && <p className="text-xs">{state.message}</p>}
    </form>
  );
}

"use client";

import { useSubmit } from "@/components/forms/useSubmit";
import { useActionState } from "react";
import type { AdminState } from "@/lib/actions/admin";
import { ROLE_LABELS, ROLES } from "@/lib/auth/permissions";

export function UserForm({ action, values, isNew }: { action: (s: AdminState, fd: FormData) => Promise<AdminState>; values: { email: string; name: string; role: string; active: boolean }; isNew?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  const onSubmit = useSubmit(formAction);
  const e = state.errors ?? {};
  const id = (n: string) => `${n}-${values.email || "nouveau"}`;
  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor={id("name")} className="etiquette">Nom</label>
        <input id={id("name")} name="name" defaultValue={values.name} className="champ" />
        {e.name && <p className="erreur">{e.name}</p>}
      </div>
      <div>
        <label htmlFor={id("email")} className="etiquette">E-mail</label>
        <input id={id("email")} name="email" type="email" defaultValue={values.email} className="champ" />
        {e.email && <p className="erreur">{e.email}</p>}
      </div>
      <div>
        <label htmlFor={id("role")} className="etiquette">Rôle</label>
        <select id={id("role")} name="role" defaultValue={values.role} className="champ">
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={id("password")} className="etiquette">{isNew ? "Mot de passe initial" : "Nouveau mot de passe (laisser vide pour garder)"}</label>
        <input id={id("password")} name="password" type="password" autoComplete="new-password" minLength={12} className="champ" />
        {e.password ? <p className="erreur">{e.password}</p> : <p className="aide">12 caractères minimum. Le changer ferme les sessions ouvertes.</p>}
      </div>
      <label className="flex items-center gap-3 text-sm md:col-span-2">
        <input type="checkbox" name="active" defaultChecked={values.active} className="size-5" /> Compte actif
      </label>
      <div className="md:col-span-2 flex items-center gap-3">
        <button className="btn btn-tribune" disabled={pending}>{isNew ? "Créer le compte" : "Enregistrer"}</button>
        {state.message && <p role="status" className={state.ok ? "text-sm text-[#14532d]" : "erreur"}>{state.message}</p>}
      </div>
    </form>
  );
}

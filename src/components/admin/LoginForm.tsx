"use client";

import { useSubmit } from "@/components/forms/useSubmit";
import { useActionState } from "react";
import { loginAction, type AdminState } from "@/lib/actions/admin";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(loginAction, {});
  const onSubmit = useSubmit(action);
  return (
    <form action={action} onSubmit={onSubmit} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="etiquette">Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="champ" />
      </div>
      <div>
        <label htmlFor="password" className="etiquette">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="champ" />
      </div>
      {state.message && <p role="alert" className="erreur !text-sm">{state.message}</p>}
      <button className="btn btn-tribune w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}

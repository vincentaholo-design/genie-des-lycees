"use client";

import { useSubmit } from "@/components/forms/useSubmit";
import { useActionState } from "react";
import type { AdminState } from "@/lib/actions/admin";

type F = { name: string; label: string; value: string; textarea?: boolean; file?: boolean; help?: string; preview?: string };

export function SettingsForm({ title, action, fields }: { title: string; action: (s: AdminState, fd: FormData) => Promise<AdminState>; fields: F[] }) {
  const [state, formAction, pending] = useActionState(action, {});
  const onSubmit = useSubmit(formAction);
  return (
    <form action={formAction} onSubmit={onSubmit} className="rounded-xl bg-[#fffaf0] p-5 ring-1 ring-ivoire-3">
      <h2 className="t-sous-titre mb-5 text-2xl">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={f.textarea || f.file ? "md:col-span-2" : ""}>
            <label htmlFor={`${title}-${f.name}`} className="etiquette">{f.label}</label>
            {f.file ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {f.preview && <img src={f.preview} alt="" className="size-20 rounded-lg object-cover" />}
                <input id={`${title}-${f.name}`} name={f.name} type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
              </div>
            ) : f.textarea ? (
              <textarea id={`${title}-${f.name}`} name={f.name} defaultValue={f.value} rows={4} className="champ" />
            ) : (
              <input id={`${title}-${f.name}`} name={f.name} defaultValue={f.value} className="champ" />
            )}
            {(state.errors?.[f.name] && <p className="erreur">{state.errors[f.name]}</p>) || (f.help && <p className="aide">{f.help}</p>)}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button className="btn btn-tribune" disabled={pending}>Enregistrer</button>
        {state.message && <p role="status" className={state.ok ? "text-sm text-[#14532d]" : "erreur"}>{state.message}</p>}
      </div>
    </form>
  );
}

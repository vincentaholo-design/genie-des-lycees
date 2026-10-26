"use client";

import { useSubmit } from "@/components/forms/useSubmit";
import { useActionState } from "react";
import { submitContact, type FormState } from "@/lib/actions/public";
import { Field, Honeypot, a11y } from "./Field";

export function ContactForm({ type }: { type: "contact" | "partenariat" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitContact, {});
  const onSubmit = useSubmit(action);
  const e = state.errors ?? {};
  const v = state.values ?? {};
  if (state.ok)
    return (
      <div role="status" className="rounded-2xl bg-[#e3f3e6] p-6">
        <p className="t-sous-titre text-2xl">{state.message}</p>
      </div>
    );
  return (
    <form action={action} onSubmit={onSubmit} className="relative grid gap-5 sm:grid-cols-2" noValidate>
      <Honeypot />
      <input type="hidden" name="type" value={type} />
      <Field id="name" label={type === "partenariat" ? "Votre nom" : "Nom"} error={e.name}>
        <input {...a11y("name", e.name)} defaultValue={v.name} autoComplete="name" className="champ" />
      </Field>
      <Field id="email" label="E-mail" error={e.email}>
        <input {...a11y("email", e.email)} type="email" defaultValue={v.email} autoComplete="email" className="champ" />
      </Field>
      <Field id="phone" label="Téléphone (facultatif)" error={e.phone}>
        <input {...a11y("phone", e.phone)} type="tel" defaultValue={v.phone} autoComplete="tel" className="champ" />
      </Field>
      {type === "partenariat" ? (
        <Field id="organisation" label="Entreprise ou organisation" error={e.organisation}>
          <input {...a11y("organisation", e.organisation)} defaultValue={v.organisation} autoComplete="organization" className="champ" />
        </Field>
      ) : (
        <Field id="subject" label="Objet" error={e.subject}>
          <input {...a11y("subject", e.subject)} defaultValue={v.subject} className="champ" />
        </Field>
      )}
      <Field id="body" label={type === "partenariat" ? "Votre projet de soutien" : "Message"} error={e.body} className="sm:col-span-2">
        <textarea {...a11y("body", e.body)} rows={6} defaultValue={v.body} className="champ" />
      </Field>
      {state.message && <p role="alert" className="erreur sm:col-span-2">{state.message}</p>}
      <div className="sm:col-span-2">
        <button className="btn btn-tribune" disabled={pending}>{pending ? "Envoi…" : type === "partenariat" ? "Envoyer ma demande" : "Envoyer le message"}</button>
      </div>
    </form>
  );
}

"use client";

import { useSubmit } from "@/components/forms/useSubmit";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { submitInscription, type FormState } from "@/lib/actions/public";
import { Check, Field, Honeypot, a11y } from "./Field";

type Category = { slug: string; name: string; shortDescription: string | null; teamMode: boolean; teamSizeMin: number | null; teamSizeMax: number | null };
type School = { id: string; name: string; city: string | null; kind: string };

function age(birth: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const b = new Date(`${birth}T00:00:00`);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

export function InscriptionForm({ categories, schools, initialCategory }: { categories: Category[]; schools: School[]; initialCategory?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitInscription, {});
  const onSubmit = useSubmit(action);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [cat, setCat] = useState(v.categorySlug ?? initialCategory ?? categories[0]?.slug);
  const [birth, setBirth] = useState(v.birthDate ?? "");
  const [school, setSchool] = useState(v.schoolId ?? "");
  const category = categories.find((c) => c.slug === cat);
  const a = age(birth);
  const minor = a !== null && a < 18;
  const filteredSchools = useMemo(() => schools.filter((s) => (cat === "universites" ? s.kind !== "lycee" : s.kind !== "universite")), [schools, cat]);
  const extraMembers = category?.teamMode ? Math.max(1, (category.teamSizeMax ?? 3) - 1) : 0;

  return (
    <form action={action} onSubmit={onSubmit} className="relative space-y-12" noValidate>
      <Honeypot />
      {state.message && !state.ok && (
        <div role="alert" className="rounded-xl border-2 border-[#b42318] bg-[#fff1ef] p-4 font-medium text-[#7a1a12]">
          {state.message}
          {Object.keys(e).length > 0 && <span className="block text-sm font-normal">Les champs concernés sont signalés plus bas.</span>}
        </div>
      )}

      <fieldset>
        <legend className="t-sous-titre mb-4 text-2xl">Catégorie</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((c) => (
            <label key={c.slug} className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition-colors ${cat === c.slug ? "border-tribune bg-[#fffaf0]" : "border-ivoire-3"}`}>
              <input type="radio" name="categorySlug" value={c.slug} checked={cat === c.slug} onChange={() => setCat(c.slug)} className="mt-1 size-5 accent-[var(--color-tribune)]" />
              <span>
                <span className="block font-semibold">{c.name}</span>
                <span className="text-sm text-gris">{c.shortDescription}</span>
              </span>
            </label>
          ))}
        </div>
        {e.categorySlug && <p className="erreur">{e.categorySlug}</p>}
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="t-sous-titre mb-4 text-2xl">{category?.teamMode ? "Responsable de l'équipe" : "Candidat"}</legend>
        <Field id="firstName" label="Prénom(s)" error={e.firstName}>
          <input {...a11y("firstName", e.firstName)} defaultValue={v.firstName} autoComplete="given-name" className="champ" required />
        </Field>
        <Field id="lastName" label="Nom" error={e.lastName}>
          <input {...a11y("lastName", e.lastName)} defaultValue={v.lastName} autoComplete="family-name" className="champ" required />
        </Field>
        <Field id="birthDate" label="Date de naissance" error={e.birthDate} help={a !== null ? `${a} ans${minor ? " : accord parental requis" : ""}` : undefined}>
          <input {...a11y("birthDate", e.birthDate, a !== null)} type="date" value={birth} onChange={(ev) => setBirth(ev.target.value)} className="champ" required />
        </Field>
        <Field id="level" label={cat === "universites" ? "Niveau d'études" : "Classe"} error={e.level} help={cat === "universites" ? "ex. Licence 2 Droit" : "ex. Première A4"}>
          <input {...a11y("level", e.level, true)} defaultValue={v.level} className="champ" required />
        </Field>
        <Field id="schoolId" label="Établissement" error={e.schoolId}>
          <select {...a11y("schoolId", e.schoolId)} value={school} onChange={(ev) => setSchool(ev.target.value)} className="champ" required>
            <option value="">Choisir…</option>
            {filteredSchools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.city ? ` (${s.city})` : ""}
              </option>
            ))}
            <option value="autre">Mon établissement n'est pas dans la liste</option>
          </select>
        </Field>
        {school === "autre" ? (
          <Field id="schoolNameFree" label="Nom de l'établissement" error={e.schoolNameFree}>
            <input {...a11y("schoolNameFree", e.schoolNameFree)} defaultValue={v.schoolNameFree} className="champ" />
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field id="city" label="Ville" error={e.city}>
          <input {...a11y("city", e.city)} defaultValue={v.city} autoComplete="address-level2" className="champ" required />
        </Field>
        <Field id="phone" label="Téléphone" error={e.phone} help="8 chiffres, ex. 90 12 34 56">
          <input {...a11y("phone", e.phone, true)} type="tel" inputMode="tel" defaultValue={v.phone} autoComplete="tel" className="champ" required />
        </Field>
        <Field id="email" label="Adresse e-mail" error={e.email} help="Pour recevoir le numéro de dossier et suivre la candidature." className="sm:col-span-2">
          <input {...a11y("email", e.email, true)} type="email" inputMode="email" defaultValue={v.email} autoComplete="email" className="champ" required />
        </Field>
      </fieldset>

      {category?.teamMode && (
        <fieldset className="space-y-5">
          <legend className="t-sous-titre mb-1 text-2xl">L'équipe</legend>
          <p className="text-gris">
            De {category.teamSizeMin ?? 1} à {category.teamSizeMax ?? 3} membres, vous compris.
          </p>
          <Field id="teamName" label="Nom de l'équipe" error={e.teamName}>
            <input {...a11y("teamName", e.teamName)} defaultValue={v.teamName} className="champ" />
          </Field>
          {Array.from({ length: extraMembers }, (_, i) => (
            <div key={i} className="grid gap-3 rounded-xl bg-ivoire-2 p-4 sm:grid-cols-3">
              <p className="text-sm font-semibold sm:col-span-3">Membre {i + 2}</p>
              <input name={`member${i}_first`} aria-label={`Prénom du membre ${i + 2}`} placeholder="Prénom" defaultValue={v[`member${i}_first`]} className="champ" />
              <input name={`member${i}_last`} aria-label={`Nom du membre ${i + 2}`} placeholder="Nom" defaultValue={v[`member${i}_last`]} className="champ" />
              <input name={`member${i}_level`} aria-label={`Niveau du membre ${i + 2}`} placeholder="Niveau" defaultValue={v[`member${i}_level`]} className="champ" />
            </div>
          ))}
          {e.teamMembers && <p className="erreur">{e.teamMembers}</p>}
        </fieldset>
      )}

      {minor && (
        <fieldset className="grid gap-5 rounded-2xl border-2 border-tribune/30 p-5 sm:grid-cols-2 sm:p-6">
          <legend className="t-sous-titre px-2 text-2xl">Parent ou tuteur</legend>
          <p className="text-gris sm:col-span-2">Le candidat a moins de 18 ans : un parent ou tuteur doit donner son accord et rester joignable.</p>
          <Field id="guardianName" label="Nom complet" error={e.guardianName}>
            <input {...a11y("guardianName", e.guardianName)} defaultValue={v.guardianName} className="champ" />
          </Field>
          <Field id="guardianRelation" label="Lien avec le candidat" error={e.guardianRelation} help="ex. mère, père, tuteur">
            <input {...a11y("guardianRelation", e.guardianRelation, true)} defaultValue={v.guardianRelation} className="champ" />
          </Field>
          <Field id="guardianPhone" label="Téléphone" error={e.guardianPhone}>
            <input {...a11y("guardianPhone", e.guardianPhone)} type="tel" inputMode="tel" defaultValue={v.guardianPhone} className="champ" />
          </Field>
          <div className="sm:col-span-2">
            <Check id="consentGuardian" error={e.consentGuardian} defaultChecked={v.consentGuardian === "on"}>
              Je suis le parent ou tuteur légal, ou j'ai son accord, et j'autorise la participation du candidat au concours.
            </Check>
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-5">
        <legend className="t-sous-titre mb-1 text-2xl">Motivation et pièces</legend>
        <Field id="motivation" label="Pourquoi voulez-vous prendre la parole ? (facultatif)" error={e.motivation} help="1 200 caractères maximum.">
          <textarea {...a11y("motivation", e.motivation, true)} rows={4} maxLength={1200} defaultValue={v.motivation} className="champ" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="justificatif_scolaire" label="Justificatif de scolarité (facultatif)" help="Carte scolaire ou certificat. PDF, JPEG ou PNG, 5 Mo max.">
            <input id="justificatif_scolaire" name="justificatif_scolaire" type="file" accept="application/pdf,image/jpeg,image/png" className="champ !py-2.5 text-sm" />
          </Field>
          {minor && (
            <Field id="autorisation_parentale" label="Autorisation parentale signée (facultatif)" help="Si le règlement de l'édition l'exige.">
              <input id="autorisation_parentale" name="autorisation_parentale" type="file" accept="application/pdf,image/jpeg,image/png" className="champ !py-2.5 text-sm" />
            </Field>
          )}
        </div>
        {e.documents && <p className="erreur">{e.documents}</p>}
        <p className="aide">Les pièces restent privées : seule l'équipe des candidatures peut les consulter.</p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="t-sous-titre mb-3 text-2xl">Accords</legend>
        <Check id="consentRules" error={e.consentRules} defaultChecked={v.consentRules === "on"}>
          J'ai lu et j'accepte le <Link href="/edition-en-cours#reglement" target="_blank" className="lien">règlement de l'édition</Link>.
        </Check>
        <Check id="consentData" error={e.consentData} defaultChecked={v.consentData === "on"}>
          J'accepte que l'AJ3C traite ces informations pour gérer ma candidature, selon la <Link href="/confidentialite" target="_blank" className="lien">politique de confidentialité</Link>.
        </Check>
        <Check id="consentImage" defaultChecked={v.consentImage === "on"}>
          J'autorise la publication de photos et vidéos {minor ? "du candidat" : "me représentant"} sur le site et les réseaux du concours (facultatif, révocable à tout moment).
        </Check>
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-ivoire-3 pt-8 sm:flex-row sm:items-center">
        <button type="submit" className="btn btn-tribune" disabled={pending}>
          {pending ? "Envoi en cours…" : "Envoyer mon inscription"}
        </button>
        <p className="text-sm text-gris">Un numéro de dossier s'affiche à l'écran et vous est envoyé par e-mail.</p>
      </div>
    </form>
  );
}

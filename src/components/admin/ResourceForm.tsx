"use client";

import { useSubmit } from "@/components/forms/useSubmit";
import { useActionState, useState } from "react";
import type { FieldDef } from "@/lib/admin/resources";
import type { AdminState } from "@/lib/actions/admin";

type Props = {
  action: (state: AdminState, fd: FormData) => Promise<AdminState>;
  fields: FieldDef[];
  values: Record<string, string>;
  options: Record<string, { value: string; label: string }[]>;
  isSuper: boolean;
  submitLabel: string;
};

export function ResourceForm({ action, fields, values, options, isSuper, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const onSubmit = useSubmit(formAction);
  const e = state.errors ?? {};
  return (
    <form action={formAction} onSubmit={onSubmit} className="space-y-6">
      {state.message && (
        <p role={state.ok ? "status" : "alert"} className={`rounded-xl px-4 py-3 text-sm font-medium ${state.ok ? "bg-[#e3f3e6] text-[#14532d]" : "bg-[#fbe4e1] text-[#7a1a12]"}`}>
          {state.message}
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((f) => (
          <FieldInput key={f.name} f={f} value={values[f.name] ?? ""} error={e[f.name]} options={f.relation ? options[f.relation] : f.options} disabled={f.superOnly && !isSuper} />
        ))}
      </div>
      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-ivoire-3 bg-ivoire/95 px-4 py-4 backdrop-blur">
        <button className="btn btn-tribune" disabled={pending}>{pending ? "Enregistrement…" : submitLabel}</button>
        {Object.keys(e).length > 0 && <span className="text-sm font-semibold text-[#b42318]">{Object.keys(e).length} champ(s) à corriger</span>}
      </div>
    </form>
  );
}

function FieldInput({ f, value, error, options, disabled }: { f: FieldDef; value: string; error?: string; options?: { value: string; label: string }[]; disabled?: boolean }) {
  const wide = f.wide || ["markdown", "steps", "criteria", "lines", "image"].includes(f.type);
  const common = { id: f.name, name: f.name, "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${f.name}-err` : f.help ? `${f.name}-help` : undefined, disabled };
  let input: React.ReactNode;
  switch (f.type) {
    case "boolean":
      return (
        <div className={wide ? "md:col-span-2" : ""}>
          <label htmlFor={f.name} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-[#fffaf0] px-4 ring-1 ring-ivoire-3">
            <input type="checkbox" {...common} defaultChecked={value === "true"} className="size-5 accent-[var(--color-tribune)]" />
            <span className="text-sm font-medium">{f.label}</span>
          </label>
          {f.help && <p id={`${f.name}-help`} className="aide">{f.help}</p>}
          {disabled && <p className="aide">Réservé au super-administrateur.</p>}
        </div>
      );
    case "textarea":
      input = <textarea {...common} defaultValue={value} rows={f.wide ? 6 : 3} maxLength={f.max} className="champ" />;
      break;
    case "markdown":
    case "steps":
    case "criteria":
    case "lines":
      input = <textarea {...common} defaultValue={value} rows={f.type === "markdown" ? 12 : 6} className="champ font-mono text-sm" />;
      break;
    case "number":
      input = <input type="number" inputMode="numeric" {...common} defaultValue={value} className="champ" />;
      break;
    case "date":
      input = <input type="date" {...common} defaultValue={value} className="champ" />;
      break;
    case "datetime":
      input = <input type="datetime-local" {...common} defaultValue={value} className="champ" />;
      break;
    case "select":
    case "relation":
      input = (
        <select {...common} defaultValue={value} className="champ">
          <option value="">{f.required ? "Choisir…" : "Aucun"}</option>
          {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case "image":
      return <ImageField f={f} value={value} error={error} />;
    default:
      input = <input type={f.type === "url" ? "url" : "text"} {...common} defaultValue={value} maxLength={f.max} className="champ" />;
  }
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <label htmlFor={f.name} className="etiquette">{f.label}{f.required && <span className="text-[#b42318]"> *</span>}</label>
      {input}
      {f.type === "datetime" && !f.help && <p className="aide">Heure de Lomé (GMT).</p>}
      {f.help && !error && <p id={`${f.name}-help`} className="aide">{f.help}</p>}
      {error && <p id={`${f.name}-err`} className="erreur">{error}</p>}
    </div>
  );
}

function ImageField({ f, value, error }: { f: FieldDef; value: string; error?: string }) {
  const [preview, setPreview] = useState<string | null>(value || null);
  return (
    <div className="md:col-span-2">
      <p className="etiquette">{f.label}{f.required && <span className="text-[#b42318]"> *</span>}</p>
      <div className="flex flex-col gap-4 rounded-xl bg-[#fffaf0] p-4 ring-1 ring-ivoire-3 sm:flex-row">
        <div className="grid size-32 shrink-0 place-items-center overflow-hidden rounded-lg bg-ivoire-2 text-xs text-gris">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : "Aucune image"}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <label htmlFor={`${f.name}__file`} className="text-sm font-medium">Envoyer un fichier (JPEG, PNG ou WebP, 8 Mo max.)</label>
            <input id={`${f.name}__file`} name={`${f.name}__file`} type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" onChange={(e) => { const file = e.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)); }} />
            <p className="aide">L'image est convertie en WebP, redimensionnée et débarrassée de ses métadonnées (dont la géolocalisation).</p>
          </div>
          <div>
            <label htmlFor={f.name} className="text-sm font-medium">ou adresse d'une image existante</label>
            <input id={f.name} name={f.name} defaultValue={value} className="champ mt-1 !min-h-10 !py-2 text-sm" />
          </div>
          {value && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={`${f.name}__remove`} className="size-4" /> Retirer l'image
            </label>
          )}
        </div>
      </div>
      {error && <p className="erreur">{error}</p>}
    </div>
  );
}

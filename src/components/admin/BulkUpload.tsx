"use client";

import { useSubmit } from "@/components/forms/useSubmit";
import { useActionState } from "react";
import { bulkUploadPhotos, type AdminState } from "@/lib/actions/admin";

export function BulkUpload({ albums }: { albums: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(bulkUploadPhotos, {});
  const onSubmit = useSubmit(action);
  return (
    <details className="mb-6 rounded-xl bg-[#fffaf0] p-4 ring-1 ring-ivoire-3">
      <summary className="cursor-pointer font-semibold">Ajouter plusieurs photos à un album</summary>
      <form action={action} onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="albumId" className="etiquette">Album</label>
          <select id="albumId" name="albumId" className="champ" required>
            <option value="">Choisir…</option>
            {albums.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="credit" className="etiquette">Crédit photo</label>
          <input id="credit" name="credit" className="champ" placeholder="ex. Photo : Studio X / AJ3C" />
        </div>
        <div>
          <label htmlFor="files" className="etiquette">Photos (30 max.)</label>
          <input id="files" name="files" type="file" multiple accept="image/jpeg,image/png,image/webp" className="champ !py-2.5 text-sm" required />
        </div>
        <div className="md:col-span-3 flex items-center gap-3">
          <button className="btn btn-tribune" disabled={pending}>{pending ? "Envoi et optimisation…" : "Importer"}</button>
          {state.message && <p role="status" className={state.ok ? "text-sm text-[#14532d]" : "erreur"}>{state.message}</p>}
        </div>
      </form>
    </details>
  );
}

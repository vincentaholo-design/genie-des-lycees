"use client";

import Link from "next/link";
import Script from "next/script";
import { useRef, useState } from "react";

type Props = {
  mode: "admin" | "public";
  editions: { id: string; title: string }[];
  maxMb: number;
  turnstileSiteKey?: string;
};

const TYPES = [
  ["discours", "Discours"],
  ["moments_forts", "Moments forts"],
  ["interview", "Interview"],
  ["temoignage", "Témoignage"],
  ["ceremonie", "Cérémonie"],
  ["autre", "Autre"],
];

type Phase = { step: "form" } | { step: "upload"; pct: number } | { step: "done"; slug: string; published: boolean } | { step: "error"; message: string };

/**
 * Mise en ligne d'une vidéo avec barre de progression.
 * Le fichier part directement vers le stockage (pas de limite de taille du serveur web).
 */
export function VideoUploader({ mode, editions, maxMb, turnstileSiteKey }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState<Phase>({ step: "form" });
  const formRef = useRef<HTMLFormElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(f.type)) return setPhase({ step: "error", message: "Format non accepté : MP4, WebM ou MOV uniquement." });
    if (f.size > maxMb * 1024 * 1024) return setPhase({ step: "error", message: `Vidéo trop lourde : ${maxMb} Mo maximum.` });
    setFile(f);
    setPhase({ step: "form" });
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setPhase({ step: "error", message: "Choisissez d'abord une vidéo." });
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    try {
      setPhase({ step: "upload", pct: 0 });
      const prep = await fetch("/api/videos/preparer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, fileName: file.name, fileSize: file.size, mimeType: file.type, captchaToken: get("cf-turnstile-response") }),
      }).then((r) => r.json());
      if (!prep.ok) throw new Error(prep.error ?? "Préparation impossible.");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("PUT", prep.target.url);
        xhr.upload.onprogress = (ev) => ev.lengthComputable && setPhase({ step: "upload", pct: Math.round((ev.loaded / ev.total) * 100) });
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("L'envoi du fichier a échoué. Vérifiez votre connexion et réessayez.")));
        xhr.onerror = () => reject(new Error("Connexion interrompue pendant l'envoi."));
        xhr.onabort = () => reject(new Error("Envoi annulé."));
        if (prep.target.kind === "supabase") {
          const body = new FormData();
          body.append("cacheControl", "3600");
          body.append("", file);
          xhr.setRequestHeader("x-upsert", "false");
          xhr.send(body);
        } else {
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.send(file);
        }
      });

      const fin = await fetch("/api/videos/finaliser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          ticket: prep.ticket,
          title: get("title"),
          description: get("description"),
          type: get("type"),
          editionId: get("editionId"),
          submitterName: get("submitterName"),
          submitterEmail: get("submitterEmail"),
          submitterNote: get("submitterNote"),
          rightsConsent: fd.get("rightsConsent") === "on",
          downloadable: fd.get("downloadable") === "on",
          publish: fd.get("publish") === "on",
        }),
      }).then((r) => r.json());
      if (!fin.ok) throw new Error(fin.error ?? "Enregistrement impossible.");
      setPhase({ step: "done", slug: fin.video.slug, published: fin.video.status === "publie" });
      formRef.current?.reset();
      setFile(null);
    } catch (err) {
      setPhase({ step: "error", message: (err as Error).message });
    }
  }

  if (phase.step === "done")
    return (
      <div role="status" className="carte p-8 text-center">
        <p className="t-titre text-3xl text-tribune">Vidéo reçue</p>
        <p className="mx-auto mt-3 max-w-md text-gris">
          {mode === "public"
            ? "Merci ! L'équipe la regarde avant de la publier dans la vidéothèque."
            : phase.published
              ? "Elle est publiée dans la vidéothèque."
              : "Elle est enregistrée en brouillon. Publiez-la depuis la liste des vidéos."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {phase.published && <Link href={`/videos/${phase.slug}`} className="btn btn-tribune btn-fleche">Voir la vidéo</Link>}
          <button type="button" className="btn btn-contour" onClick={() => setPhase({ step: "form" })}>Envoyer une autre vidéo</button>
        </div>
      </div>
    );

  const busy = phase.step === "upload";
  return (
    <form ref={formRef} onSubmit={submit} className="space-y-6">
      <label
        htmlFor="video-file"
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border-2 border-dashed px-6 py-10 text-center transition-colors ${drag ? "border-tribune bg-ivoire-2" : "border-ivoire-3 bg-white hover:border-tribune"}`}
      >
        <span className="grid size-14 place-items-center rounded-full bg-ivoire-2 text-tribune">
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>
        </span>
        {file ? (
          <span>
            <span className="block font-bold">{file.name}</span>
            <span className="text-sm text-gris">{(file.size / 1024 / 1024).toFixed(1)} Mo · cliquez pour changer</span>
          </span>
        ) : (
          <span>
            <span className="block font-bold">Glissez une vidéo ici ou cliquez pour la choisir</span>
            <span className="text-sm text-gris">MP4, WebM ou MOV · {maxMb} Mo maximum</span>
          </span>
        )}
        <input id="video-file" type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="etiquette">Titre de la vidéo</label>
          <input id="title" name="title" required minLength={3} maxLength={160} className="champ" placeholder="ex. Finale — discours de la lauréate" />
        </div>
        <div>
          <label htmlFor="type" className="etiquette">Type</label>
          <select id="type" name="type" className="champ" defaultValue="discours">
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="editionId" className="etiquette">Édition</label>
          <select id="editionId" name="editionId" className="champ" defaultValue={editions[1]?.id ?? ""}>
            <option value="">Je ne sais pas</option>
            {editions.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="description" className="etiquette">Description (facultatif)</label>
          <textarea id="description" name="description" rows={3} maxLength={2000} className="champ" placeholder="Qui parle, à quelle étape, sur quel sujet…" />
        </div>
        {mode === "public" ? (
          <>
            <div>
              <label htmlFor="submitterName" className="etiquette">Votre nom</label>
              <input id="submitterName" name="submitterName" required maxLength={120} autoComplete="name" className="champ" />
            </div>
            <div>
              <label htmlFor="submitterEmail" className="etiquette">Votre e-mail</label>
              <input id="submitterEmail" name="submitterEmail" type="email" required autoComplete="email" className="champ" />
              <p className="aide">Pour vous prévenir de la publication. Jamais affiché.</p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="submitterNote" className="etiquette">Un mot pour l'équipe (facultatif)</label>
              <input id="submitterNote" name="submitterNote" maxLength={1000} className="champ" />
            </div>
            <label className="flex items-start gap-3 sm:col-span-2">
              <input type="checkbox" name="rightsConsent" required className="mt-1 size-5 shrink-0 accent-[var(--color-tribune)]" />
              <span className="text-[0.95rem]">J'ai filmé cette vidéo ou j'ai le droit de la partager, et les personnes qu'on y voit (ou leurs parents pour les mineurs) acceptent sa diffusion.</span>
            </label>
            {turnstileSiteKey && (
              <>
                <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
                <div className="cf-turnstile sm:col-span-2" data-sitekey={turnstileSiteKey} data-language="fr" />
              </>
            )}
          </>
        ) : (
          <>
            <label className="flex items-center gap-3 rounded-xl bg-ivoire-2 px-4 py-3">
              <input type="checkbox" name="publish" defaultChecked className="size-5" />
              <span className="text-sm font-semibold">Publier tout de suite</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl bg-ivoire-2 px-4 py-3">
              <input type="checkbox" name="downloadable" defaultChecked className="size-5" />
              <span className="text-sm font-semibold">Autoriser le téléchargement</span>
            </label>
          </>
        )}
      </div>

      {phase.step === "error" && <p role="alert" className="rounded-xl bg-[#fde8e6] px-4 py-3 text-sm font-semibold text-[#9b1c13]">{phase.message}</p>}

      {busy ? (
        <div role="status" aria-live="polite" className="space-y-2">
          <div className="h-3 overflow-hidden rounded-full bg-ivoire-2">
            <div className="h-full rounded-full bg-gradient-to-r from-or to-rose transition-[width]" style={{ width: `${phase.pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{phase.pct < 100 ? `Envoi en cours… ${phase.pct} %` : "Vérification du fichier…"}</span>
            <button type="button" className="text-gris underline" onClick={() => xhrRef.current?.abort()}>Annuler</button>
          </div>
        </div>
      ) : (
        <button type="submit" className="btn btn-tribune btn-fleche">{mode === "public" ? "Envoyer la vidéo" : "Mettre en ligne"}</button>
      )}
    </form>
  );
}

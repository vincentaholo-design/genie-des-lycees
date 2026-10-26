"use client";

import Script from "next/script";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { voteAction, type VoteState } from "@/lib/actions/public";
import { Portrait } from "@/components/ui/Portrait";

type Cand = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  teamName: string | null;
  portraitUrl: string | null;
  portraitFocus: string | null;
  imageConsent: boolean;
  schoolName: string | null;
  schoolSlug: string | null;
  categoryName: string;
};

type Props = {
  editionId: string;
  method: "code_email" | "code_sms" | "leger";
  open: boolean;
  candidates: Cand[];
  initialSlug?: string;
  turnstileSiteKey?: string;
};

const name = (c: Cand) => c.teamName ?? `${c.firstName} ${c.lastName}`;

export function VoteBoard({ editionId, method, open, candidates, initialSlug, turnstileSiteKey }: Props) {
  const [selected, setSelected] = useState<string | undefined>(() => candidates.find((c) => c.slug === initialSlug)?.id);
  const [filter, setFilter] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const current = candidates.find((c) => c.id === selected);

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = candidates.filter((c) => !q || `${name(c)} ${c.firstName} ${c.lastName} ${c.schoolName ?? ""}`.toLowerCase().includes(q));
    const map = new Map<string, Cand[]>();
    for (const c of list) map.set(c.schoolName ?? "Autres", [...(map.get(c.schoolName ?? "Autres") ?? []), c]);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, [candidates, filter]);

  useEffect(() => {
    if (initialSlug && selected) panelRef.current?.scrollIntoView({ block: "nearest" });
  }, [initialSlug, selected]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
      <div>
        <label htmlFor="recherche-vote" className="etiquette">Trouver un candidat ou une école</label>
        <input id="recherche-vote" type="search" value={filter} onChange={(e) => setFilter(e.target.value)} className="champ mb-8 max-w-md" placeholder="Nom, prénom, établissement…" />
        {groups.map(([school, list]) => (
          <section key={school} className="mb-10">
            <h3 className="t-sous-titre mb-4 text-xl">{school}</h3>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
              {list.map((c) => {
                const active = c.id === selected;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(c.id);
                        if (window.innerWidth < 1024) setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                      }}
                      aria-pressed={active}
                      disabled={!open}
                      className={`group block w-full rounded-lg p-1 text-left transition ${active ? "bg-tribune text-white" : "hover:bg-ivoire-2"}`}
                    >
                      <Portrait {...c} sizes="(min-width:1024px) 12vw, 30vw" className="rounded-md" />
                      <span className="mt-2 block px-1 pb-1 text-sm font-semibold leading-tight">{name(c)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {!groups.length && <p className="text-gris">Aucun candidat ne correspond à « {filter} ».</p>}
      </div>

      <div ref={panelRef} className="scroll-mt-24 lg:sticky lg:top-28">
        <div className="scene rounded-[1.5rem] p-6">
          {!open ? (
            <p>Le vote n'est pas ouvert. Les candidats restent consultables.</p>
          ) : current ? (
            <VoteForm key={current.id} editionId={editionId} method={method} candidate={current} turnstileSiteKey={turnstileSiteKey} />
          ) : (
            <>
              <p className="t-sous-titre text-2xl">Choisissez un candidat</p>
              <p className="mt-2 text-fumee">Touchez un portrait pour le sélectionner. Vous confirmez ensuite votre vote ici.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function VoteForm({ editionId, method, candidate, turnstileSiteKey }: { editionId: string; method: Props["method"]; candidate: Cand; turnstileSiteKey?: string }) {
  const [state, action, pending] = useActionState<VoteState, FormData>(voteAction, { step: "identifier" });
  const identifierLabel = method === "code_sms" ? "Numéro de téléphone" : "Adresse e-mail";

  if (state.step === "done")
    return (
      <div role="status" className="space-y-3">
        <p className="t-voix text-4xl text-or-clair">Merci !</p>
        <p>Votre vote pour <strong>{name(candidate)}</strong> est enregistré.</p>
        <p className="text-sm text-fumee">Il est compté côté serveur et ne peut plus être modifié.</p>
      </div>
    );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="editionId" value={editionId} />
      <input type="hidden" name="candidateId" value={candidate.id} />
      <div>
        <p className="text-sm text-fumee">Votre choix</p>
        <p className="t-sous-titre text-2xl">{name(candidate)}</p>
        <p className="text-sm text-fumee">{candidate.schoolName}</p>
      </div>

      {state.error && <p role="alert" className="rounded-lg bg-[#3a1216] p-3 text-sm text-[#ffb4ae]">{state.error}</p>}

      {method === "leger" ? (
        <>
          <input type="hidden" name="intent" value="leger" />
          <Turnstile siteKey={turnstileSiteKey} />
          <button type="submit" className="btn btn-or w-full" disabled={pending}>
            {pending ? "Enregistrement…" : "Confirmer mon vote"}
          </button>
          <p className="text-xs text-fumee">Un vote par appareil et par période. Ce mode ne vérifie pas l'identité des votants.</p>
        </>
      ) : state.step === "code" ? (
        <>
          <input type="hidden" name="intent" value="confirm" />
          <input type="hidden" name="identifier" value={state.identifier} />
          <p className="text-sm">
            {state.delivered ? `Code envoyé à ${state.identifier}.` : "Aucun service d'envoi n'est configuré sur cette version de démonstration."}
          </p>
          {state.demoCode && (
            <p className="rounded-lg border border-dashed border-or p-3 text-sm">
              Mode démo, code affiché à la place de l'envoi : <strong className="t-chiffre ml-1 text-2xl tracking-widest text-or-clair">{state.demoCode}</strong>
            </p>
          )}
          <div>
            <label htmlFor="code" className="etiquette">Code à 6 chiffres</label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="champ t-chiffre text-center text-3xl tracking-[0.4em]" />
          </div>
          <button type="submit" className="btn btn-or w-full" disabled={pending}>
            {pending ? "Vérification…" : "Valider mon vote"}
          </button>
        </>
      ) : (
        <>
          <input type="hidden" name="intent" value="code" />
          <div>
            <label htmlFor="identifier" className="etiquette">{identifierLabel}</label>
            <input
              id="identifier"
              name="identifier"
              type={method === "code_sms" ? "tel" : "email"}
              inputMode={method === "code_sms" ? "tel" : "email"}
              autoComplete={method === "code_sms" ? "tel" : "email"}
              defaultValue={state.identifier}
              required
              className="champ"
            />
            <p className="aide">Elle sert uniquement à vérifier le vote. Elle n'est ni publiée ni conservée en clair.</p>
          </div>
          <Turnstile siteKey={turnstileSiteKey} />
          <button type="submit" className="btn btn-or w-full" disabled={pending}>
            {pending ? "Envoi du code…" : "Recevoir mon code"}
          </button>
        </>
      )}
    </form>
  );
}

function Turnstile({ siteKey }: { siteKey?: string }) {
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="dark" data-language="fr" />
    </>
  );
}

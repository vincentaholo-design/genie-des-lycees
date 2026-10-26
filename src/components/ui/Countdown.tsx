"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { j: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Compte à rebours configurable depuis l'administration (date de l'édition). */
export function Countdown({ target, serverNow, compact }: { target: string; serverNow: string; compact?: boolean }) {
  // On part de l'heure serveur pour un premier rendu identique, puis on suit l'horloge locale.
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = new Date(target).getTime() - now;
  const p = parts(diff);
  if (diff <= 0) return <p className="t-sous-titre text-2xl">C'est aujourd'hui !</p>;
  const cells: Array<[number, string]> = [
    [p.j, p.j > 1 ? "jours" : "jour"],
    [p.h, "h"],
    [p.m, "min"],
    [p.s, "s"],
  ];
  return (
    <div role="timer" aria-live="off" aria-label={`${p.j} jours, ${p.h} heures et ${p.m} minutes restantes`} className={`flex items-end ${compact ? "gap-2.5" : "gap-3 sm:gap-4"}`}>
      {cells.map(([v, l], i) => (
        <div key={l} className="flex items-baseline gap-1">
          <span className={`t-chiffre tabular-nums ${compact ? (i === 0 ? "text-4xl" : "text-2xl") : i === 0 ? "text-6xl sm:text-7xl" : "text-4xl sm:text-5xl"}`}>{i === 0 ? v : String(v).padStart(2, "0")}</span>
          <span className="text-xs font-semibold opacity-70">{l}</span>
        </div>
      ))}
    </div>
  );
}

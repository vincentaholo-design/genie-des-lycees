import type { EditionStep } from "@/lib/db/schema";
import { cx, formatDate } from "@/lib/utils";

/** Étapes de l'édition (vraie séquence : la numérotation a un sens ici). */
export function Timeline({ steps, now = new Date() }: { steps: EditionStep[]; now?: Date }) {
  const today = now.toISOString().slice(0, 10);
  const currentIndex = steps.reduce((acc, s, i) => (s.date && s.date <= today ? i : acc), -1);
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
      {steps.map((step, i) => {
        const state = i < currentIndex ? "passe" : i === currentIndex ? "en_cours" : "a_venir";
        const current = state === "en_cours";
        return (
          <li key={i} aria-current={current ? "step" : undefined} className={cx("relative flex flex-col gap-3 rounded-[1.5rem] p-5 sm:p-6", current ? "scene shadow-[0_20px_40px_-20px_rgba(3,92,252,0.8)]" : "carte")}>
            <div className="flex items-center justify-between">
              <span className={cx("t-chiffre grid size-11 place-items-center rounded-full text-lg", current ? "bg-white text-tribune" : state === "passe" ? "bg-ivoire-2 text-gris" : "bg-ivoire-2 text-tribune")}>{i + 1}</span>
              <span className={cx("pastille !px-2.5 !py-1", current ? "bg-or text-encre" : state === "passe" ? "bg-ivoire-2 text-gris" : "bg-ivoire-2 text-tribune")}>
                {state === "passe" ? "Terminé" : current ? "En ce moment" : "À venir"}
              </span>
            </div>
            <div>
              <h3 className="t-sous-titre text-lg">{step.label}</h3>
              {step.date && <p className={cx("mt-0.5 text-sm font-semibold", current ? "text-white/85" : "text-tribune")}>{formatDate(step.date)}</p>}
            </div>
            {step.description && <p className={cx("text-[0.93rem] leading-snug", current ? "text-white/85" : "text-gris")}>{step.description}</p>}
          </li>
        );
      })}
    </ol>
  );
}

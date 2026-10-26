import { cx } from "@/lib/utils";

/** Signale un contenu fictif de démonstration. */
export function DemoBadge({ className, label = "Démo" }: { className?: string; label?: string }) {
  return (
    <span title="Contenu fictif de démonstration, à remplacer par les informations officielles" className={cx("inline-flex items-center rounded-full border border-dashed border-current px-2 py-0.5 text-[0.68rem] font-bold leading-none opacity-70", className)}>
      {label}
    </span>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Filtres en formulaire GET : fonctionnent sans JavaScript, l'URL se partage telle quelle.
 */
export function Filters({ action, children, resetHref, active }: { action: string; children: ReactNode; resetHref: string; active: boolean }) {
  return (
    <form action={action} method="get" role="search" className="grid gap-3 rounded-xl bg-ivoire-2 p-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
      {children}
      <div className="flex gap-2 lg:ml-auto">
        <button type="submit" className="btn btn-tribune flex-1 lg:flex-none">
          Filtrer
        </button>
        {active && (
          <Link href={resetHref} className="btn btn-contour">
            Effacer
          </Link>
        )}
      </div>
    </form>
  );
}

export function FilterField({ label, name, children, grow }: { label: string; name: string; children: ReactNode; grow?: boolean }) {
  return (
    <label htmlFor={`f-${name}`} className={grow ? "lg:min-w-64 lg:flex-1" : "lg:w-48"}>
      <span className="etiquette">{label}</span>
      {children}
    </label>
  );
}

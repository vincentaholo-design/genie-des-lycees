import type { ReactNode } from "react";

export function Field({ id, label, error, help, children, className }: { id: string; label: ReactNode; error?: string; help?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="etiquette">
        {label}
      </label>
      {children}
      {help && !error && <p id={`${id}-aide`} className="aide">{help}</p>}
      {error && <p id={`${id}-erreur`} className="erreur" role="alert">{error}</p>}
    </div>
  );
}

/** Attributs d'accessibilité pour relier un champ à son aide ou à son erreur. */
export function a11y(id: string, error?: string, help?: boolean) {
  return {
    id,
    name: id,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? `${id}-erreur` : help ? `${id}-aide` : undefined,
  };
}

export function Check({ id, children, error, defaultChecked }: { id: string; children: ReactNode; error?: string; defaultChecked?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="flex min-h-12 cursor-pointer items-start gap-3 py-1">
        <input type="checkbox" id={id} name={id} defaultChecked={defaultChecked} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-erreur` : undefined} className="mt-1 size-5 shrink-0 accent-[var(--color-tribune)]" />
        <span className="text-[0.97rem] leading-snug">{children}</span>
      </label>
      {error && <p id={`${id}-erreur`} className="erreur" role="alert">{error}</p>}
    </div>
  );
}

export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label htmlFor="site_web">Ne pas remplir</label>
      <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

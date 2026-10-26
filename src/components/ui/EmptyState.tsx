import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export function EmptyState({ title, children, action, className }: { title: string; children?: ReactNode; action?: { href: string; label: string }; className?: string }) {
  return (
    <div className={cx("rounded-[1.5rem] bg-ivoire-2 px-6 py-12 text-center sm:px-12", className)}>
      <p className="t-sous-titre text-2xl">{title}</p>
      {children && <div className="mx-auto mt-3 max-w-prose text-[0.98rem] text-gris">{children}</div>}
      {action && (
        <Link href={action.href} className="btn btn-tribune btn-fleche mt-6">
          {action.label}
        </Link>
      )}
    </div>
  );
}

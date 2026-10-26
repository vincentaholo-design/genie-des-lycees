"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const path = usePathname();
  const active = path === href || (href !== "/" && path.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center rounded-full px-3.5 py-2 text-[0.9rem] font-semibold transition-colors",
        active ? "bg-ivoire-2 text-tribune" : "text-encre/80 hover:bg-ivoire-2 hover:text-encre",
      )}
    >
      {children}
    </Link>
  );
}

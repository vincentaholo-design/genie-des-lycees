"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/utils";

export type NavGroup = { title: string; items: { href: string; label: string; badge?: number }[] };

export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-contour !min-h-10 w-full !py-2 lg:hidden" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Fermer le menu" : "Menu de l'administration"}
      </button>
      <nav aria-label="Administration" className={cx("mt-4 space-y-6 lg:mt-0 lg:block", !open && "hidden")}>
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1 px-3 text-xs text-fumee">{g.title}</p>
            <ul>
              {g.items.map((i) => {
                const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
                return (
                  <li key={i.href}>
                    <Link href={i.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={cx("flex items-center justify-between rounded-lg px-3 py-2 text-[0.93rem]", active ? "bg-salle-3 text-or" : "text-ivoire/85 hover:bg-salle-2")}>
                      {i.label}
                      {i.badge ? <span className="rounded-full bg-or px-2 text-xs font-bold text-salle">{i.badge}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

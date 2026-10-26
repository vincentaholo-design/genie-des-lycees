import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Administration", template: "%s · Administration GDL" }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="papier min-h-dvh">{children}</div>;
}

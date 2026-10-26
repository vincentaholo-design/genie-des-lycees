import "server-only";
import { headers } from "next/headers";
import { ipFingerprint, sha256 } from "@/lib/crypto";

/** Adresse IP du client (derrière un proxy de confiance : Vercel, Netlify, Nginx…). */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? null;
}

export async function requestFingerprint() {
  const h = await headers();
  const ip = await clientIp();
  return {
    ip,
    ipHash: ipFingerprint(ip),
    uaHash: h.get("user-agent") ? sha256(h.get("user-agent")!).slice(0, 32) : null,
  };
}

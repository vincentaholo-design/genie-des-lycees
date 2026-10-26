"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";

/**
 * Image optimisée (AVIF/WebP, tailles adaptées, chargement différé) avec solution de repli
 * si le fichier manque ou ne se charge pas (connexion coupée, lien cassé).
 */
export function SmartImage({ fallback, src, ...props }: Omit<ImageProps, "src"> & { src?: string | null; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback ?? <div aria-hidden className="absolute inset-0 bg-ivoire-2" />}</>;
  return <Image {...props} src={src} onError={() => setFailed(true)} />;
}

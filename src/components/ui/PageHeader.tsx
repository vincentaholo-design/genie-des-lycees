import type { ReactNode } from "react";
import Image from "next/image";
import { cx } from "@/lib/utils";

/** En-tête des pages intérieures : bandeau bleu GDL arrondi, photo facultative à droite. */
export function PageHeader({
  title,
  intro,
  children,
  className,
  aside,
  image,
}: {
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  className?: string;
  image?: { src: string; alt: string; focus?: string };
}) {
  return (
    <header className={cx("px-3 sm:px-4", className)}>
      <div className="scene relative overflow-hidden rounded-b-[2rem] rounded-t-[2rem]">
        <div className={cx("conteneur grid gap-10 pb-12 pt-28 sm:pb-16 sm:pt-32 lg:items-end", Boolean(image || aside) && "lg:grid-cols-[1.25fr_1fr]")}>
          <div className="entree">
            <h1 className="t-voix text-[clamp(2.4rem,6.5vw,4.6rem)]">{title}</h1>
            {intro && <div className="mt-5 max-w-[58ch] text-lg text-white/85">{intro}</div>}
            {children}
          </div>
          {image ? (
            <div className="entree-2 relative hidden aspect-[4/3] overflow-hidden rounded-[1.75rem] ring-4 ring-white/15 lg:block">
              <Image src={image.src} alt={image.alt} fill sizes="40vw" className="object-cover" style={{ objectPosition: image.focus }} priority />
            </div>
          ) : (
            aside && <div className="lg:justify-self-end">{aside}</div>
          )}
          {image && aside && <div className="lg:col-span-2">{aside}</div>}
        </div>
      </div>
    </header>
  );
}

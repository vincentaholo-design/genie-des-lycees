import Image from "next/image";

type Partner = { id: string; name: string; logoUrl: string | null; website: string | null; isDemo?: boolean };

/** Mur des partenaires : logos sur pilules blanches, comme le visuel officiel. */
export function SponsorsWall({ partners, compact }: { partners: Partner[]; compact?: boolean }) {
  return (
    <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 ${compact ? "lg:grid-cols-6" : "lg:grid-cols-4 xl:grid-cols-5"}`}>
      {partners.map((p) => {
        const inner = p.logoUrl ? (
          <Image src={p.logoUrl} alt={p.name} fill sizes="(min-width:1024px) 16vw, 45vw" className="object-contain p-3 sm:p-4" />
        ) : (
          <span className="t-sous-titre px-3 text-center text-sm">{p.name}</span>
        );
        return (
          <li key={p.id} className="relative grid h-20 place-items-center rounded-full bg-white shadow-[0_6px_18px_-10px_rgba(16,51,139,0.35)] ring-1 ring-ivoire-3 transition-transform hover:-translate-y-0.5 sm:h-24">
            {p.website ? (
              <a href={p.website} target="_blank" rel="noopener noreferrer" className="absolute inset-0 grid place-items-center" aria-label={p.name}>
                {inner}
              </a>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

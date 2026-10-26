import { SmartImage } from "./SmartImage";
import { cx, initials } from "@/lib/utils";

type P = {
  firstName: string;
  lastName: string;
  portraitUrl?: string | null;
  portraitFocus?: string | null;
  imageConsent?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
};

/**
 * Portrait au recadrage constant (4:5). Sans photo autorisée, une carte aux couleurs GDL
 * affiche les initiales : la photo d'un mineur ne s'affiche que si le consentement est enregistré.
 */
export function Portrait({ firstName, lastName, portraitUrl, portraitFocus, imageConsent, sizes = "(min-width: 1024px) 20vw, 45vw", className, priority }: P) {
  const name = `${firstName} ${lastName}`;
  const fallback = <Monogram text={initials({ firstName, lastName })} />;
  return (
    <div className={cx("relative aspect-[4/5] overflow-hidden bg-ivoire-2", className)}>
      {portraitUrl && imageConsent ? (
        <SmartImage src={portraitUrl} alt={`Portrait de ${name}`} fill sizes={sizes} priority={priority} className="object-cover" style={{ objectPosition: portraitFocus ?? "50% 30%" }} fallback={fallback} />
      ) : (
        fallback
      )}
    </div>
  );
}

function Monogram({ text }: { text: string }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-gradient-to-b from-ivoire-2 to-ivoire-3">
      <svg viewBox="0 0 100 125" className="absolute bottom-0 left-1/2 h-[66%] w-auto -translate-x-1/2 text-tribune/15" fill="currentColor">
        <circle cx="50" cy="40" r="19" />
        <path d="M10 125c0-27 18-46 40-46s40 19 40 46z" />
      </svg>
      <span className="t-marque absolute bottom-3 left-3 rounded-full bg-tribune px-3 py-1 text-sm text-white">{text}</span>
    </div>
  );
}

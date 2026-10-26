const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IconLycee = (p: { className?: string }) => (
  <svg {...base} className={p.className}><path d="M3 10l9-5 9 5-9 5-9-5z" /><path d="M7 12v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4" /></svg>
);
export const IconUniversite = (p: { className?: string }) => (
  <svg {...base} className={p.className}><path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M2 10l10-6 10 6" /></svg>
);
export const IconVote = (p: { className?: string }) => (
  <svg {...base} className={p.className}><path d="M4 13l4 4L20 5" /><rect x="3" y="3" width="18" height="18" rx="4" /></svg>
);
export const IconMicro = (p: { className?: string }) => (
  <svg {...base} className={p.className}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
export const IconUpload = (p: { className?: string }) => (
  <svg {...base} className={p.className}><path d="M12 16V4M6 10l6-6 6 6M4 20h16" /></svg>
);

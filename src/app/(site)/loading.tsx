export default function Loading() {
  return (
    <div className="conteneur py-24" role="status" aria-live="polite">
      <div className="h-16 w-2/3 animate-pulse rounded-[1.25rem] bg-ivoire-2" />
      <div className="mt-6 h-5 w-1/2 animate-pulse rounded bg-ivoire-2" />
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-[1.25rem] bg-ivoire-2" />
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

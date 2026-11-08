/** Instant skeleton while a logged-in page streams in (pages are dynamic, so this is what prefetch shows). */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-64 max-w-full rounded-lg bg-surface-container" />
        <div className="h-4 w-80 max-w-full rounded bg-surface-container-low" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className={`h-36 rounded-2xl border border-hairline bg-surface-container-lowest ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-96 rounded-2xl border border-hairline bg-surface-container-lowest lg:col-span-8" />
        <div className="h-96 rounded-2xl border border-hairline bg-surface-container-lowest lg:col-span-4" />
      </div>
    </div>
  );
}

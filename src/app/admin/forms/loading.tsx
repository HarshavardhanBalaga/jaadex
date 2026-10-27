export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-106px)] bg-[#f3f6fd] md:min-h-[calc(100vh-114px)]">
      <main className="mx-auto w-full max-w-[1180px] px-6 py-10 md:px-10" aria-busy="true" aria-label="Loading forms">
        <div className="h-4 w-24 animate-pulse rounded bg-line" />
        <div className="mt-4 h-8 w-40 animate-pulse rounded bg-line" />
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
              <div className="h-12 w-16 shrink-0 animate-pulse rounded-lg bg-line" />
              <div className="h-4 flex-1 animate-pulse rounded bg-line" />
              <div className="h-4 w-24 animate-pulse rounded bg-line" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

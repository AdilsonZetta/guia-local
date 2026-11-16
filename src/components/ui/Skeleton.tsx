export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="business-card overflow-hidden">
          <div className="business-cover animate-pulse bg-zinc-100" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function RouteFallback() {
  return (
    <div className="site-container space-y-4 py-6" role="status" aria-label="Carregando">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-100" />
      <CardSkeleton />
    </div>
  )
}

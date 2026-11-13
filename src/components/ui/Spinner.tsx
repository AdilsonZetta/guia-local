export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <div aria-hidden="true" className="loading-skeleton"><span /><span /><span /></div>
      <div aria-hidden="true" className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-brand" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

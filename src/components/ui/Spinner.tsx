export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-line border-t-brand" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white p-8">
      <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
      <p className="mt-2 text-muted">Esta tela será preenchida em seguida com dados reais do Supabase.</p>
    </div>
  )
}

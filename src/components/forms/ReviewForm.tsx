import { useState } from 'react'
import type { FormEvent } from 'react'
import { Star } from 'lucide-react'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/PageContent'
export type ReviewContent = {
  rating: number
  title: string | null
  body: string
}
export function ReviewForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: ReviewContent
  onSubmit: (content: ReviewContent) => Promise<void>
  onCancel?: () => void
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [body, setBody] = useState(initial?.body ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!rating || !body.trim()) {
      setError('Escolha uma nota e conte como foi sua experiência.')
      return
    }
    setBusy(true)
    try {
      await onSubmit({
        rating,
        title: title.trim() || null,
        body: body.trim(),
      })
    } catch {
      setError('Não foi possível salvar a avaliação. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="space-y-5" onSubmit={submit}>
      {error && <Notice error>{error}</Notice>}
      <fieldset>
        <legend className="mb-2 text-sm font-bold">
          Como foi sua experiência? *
        </legend>
        <div
          className="flex gap-2"
          role="radiogroup"
          aria-label="Nota da avaliação"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
              className="rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-brand"
              onClick={() => setRating(n)}
            >
              <Star
                className={`h-9 w-9 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`}
              />
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">
          {rating ? `${rating} de 5 estrelas` : 'Selecione uma nota de 1 a 5.'}
        </p>
      </fieldset>
      <Field label="Título (opcional)">
        <Input
          aria-label="Título"
          value={title}
          maxLength={160}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field
        label="Sua avaliação *"
        hint="Conte sua experiência com respeito e evite compartilhar dados pessoais."
      >
        <Textarea
          aria-label="Sua avaliação"
          required
          rows={5}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <p className="text-sm text-muted">
        As avaliações passam por moderação antes de aparecer no perfil.
      </p>
      <div className="flex gap-2">
        <Button disabled={busy} type="submit">
          {busy
            ? 'Salvando…'
            : initial
              ? 'Salvar alterações'
              : 'Enviar avaliação'}
        </Button>
        {onCancel && (
          <Button
            disabled={busy}
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}

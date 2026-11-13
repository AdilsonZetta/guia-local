import { useState } from 'react'
import type { FormEvent } from 'react'
import { ImagePlus, Send, Star } from 'lucide-react'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/PageContent'
import type { Tables } from '@/lib/database.types'
import { useAuth } from '@/context/AuthProvider'
export type ReviewContent = {
  rating: number
  title: string | null
  body: string
  service_id?: string | null
  experience_month?: string | null
}
export function ReviewForm({
  initial,
  services = [],
  onSubmit,
  onCancel,
}: {
  initial?: ReviewContent
  services?: Tables<'services'>[]
  onSubmit: (content: ReviewContent, photos: File[]) => Promise<void>
  onCancel?: () => void
}) {
  const { profile } = useAuth()
  const [currentMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [body, setBody] = useState(initial?.body ?? '')
  const [service, setService] = useState(initial?.service_id ?? '')
  const [month, setMonth] = useState(
    initial?.experience_month?.slice(0, 7) ?? '',
  )
  const [files, setFiles] = useState<File[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!rating || !body.trim() || !confirmed) {
      setError(
        'Escolha sua nota, conte sua experiência e confirme que ela é real.',
      )
      return
    }
    setBusy(true)
    try {
      await onSubmit(
        {
          rating,
          title: initial?.title || null,
          body: body.trim(),
          service_id: service || null,
          experience_month: month ? `${month}-01` : null,
        },
        files,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar a avaliação. Tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="space-y-5" onSubmit={submit}>
      {error && <Notice error>{error}</Notice>}
      <fieldset>
        <legend className="mb-2 font-bold">
          Sua nota <span className="text-red-500">*</span>
        </legend>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex gap-1"
            role="radiogroup"
            aria-label="Nota da avaliação"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} estrelas`}
                onClick={() => setRating(n)}
                className="rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-brand"
              >
                <Star
                  className={`h-10 w-10 md:h-12 md:w-12 ${n <= rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`}
                />
              </button>
            ))}
          </div>
          <strong className="ml-3 text-lg">
            {rating
              ? `${rating} — ${['Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'][rating - 1]}`
              : 'Selecione sua nota'}
          </strong>
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Serviço utilizado *">
          <Select
            aria-label="Serviço utilizado"
            required={services.length > 0}
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            <option value="">Selecione o serviço</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mês da experiência *">
          <Input
            aria-label="Mês da experiência"
            type="month"
            required
            value={month}
            max={currentMonth}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Conte sua experiência *">
        <Textarea
          aria-label="Conte sua experiência"
          placeholder="Como foi o serviço e o atendimento?"
          required
          rows={4}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <Field label="Adicionar fotos (opcional)">
        <label className="flex cursor-pointer items-center justify-center gap-4 rounded-xl border border-dashed border-line px-4 py-6 text-muted">
          <ImagePlus size={32} />
          <span className="text-sm">
            <strong className="block text-ink">
              Clique para adicionar fotos
            </strong>
            JPG, PNG. Até 2 MB por foto, máximo de 5 fotos.
          </span>
          <input
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png"
            multiple
            onChange={(e) => {
              const selected = Array.from(e.target.files || [])
              if (
                selected.length > 5 ||
                selected.some(
                  (f) =>
                    f.size > 2 * 1024 * 1024 ||
                    !['image/jpeg', 'image/png'].includes(f.type),
                )
              ) {
                setError('Escolha até 5 fotos JPG ou PNG de até 2 MB cada.')
                e.target.value = ''
                setFiles([])
                return
              }
              setError('')
              setFiles(selected)
            }}
          />
        </label>
        {files.length > 0 && (
          <p className="mt-2 text-sm text-brand">
            {files.map((f) => f.name).join(', ')}
          </p>
        )}
      </Field>
      <label className="flex items-center gap-3 text-sm text-muted">
        <input
          type="checkbox"
          required
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        Confirmo que esta avaliação descreve uma experiência real.{' '}
        <span className="text-red-500">*</span>
      </label>
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-soft p-3">
        <span className="avatar">
          {profile?.full_name
            ?.split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('') || 'EU'}
        </span>
        <div className="mr-auto text-sm">
          <strong>
            Você está avaliando como {profile?.full_name || 'morador'}.
          </strong>
          <p className="text-muted">
            Sua avaliação será publicada com seu nome.
          </p>
        </div>
        {onCancel && (
          <Button
            variant="outline"
            type="button"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        )}
        <Button disabled={busy} type="submit">
          <Send size={20} />
          {busy
            ? 'Enviando…'
            : initial
              ? 'Salvar alterações'
              : 'Enviar avaliação'}
        </Button>
      </div>
    </form>
  )
}

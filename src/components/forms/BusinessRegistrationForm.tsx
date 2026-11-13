import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { catalog, useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { LoadError, Notice } from '@/components/PageContent'
export function BusinessRegistrationForm({
  onComplete,
}: {
  onComplete: () => void
}) {
  const { user, refreshProfile } = useAuth()
  const refs = useResource(catalog)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name')).trim()
    const whatsapp = String(data.get('whatsapp')).replace(/\D/g, '')
    const description = String(data.get('description')).trim()
    if (!name || !description || whatsapp.length < 10 || whatsapp.length > 13) {
      setError('Informe o nome, uma descrição e um WhatsApp válido com DDD.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error } = await supabase.from('businesses').insert({
        owner_id: user.id,
        name,
        slug: `${slugify(name) || 'empresa'}-${crypto.randomUUID().slice(0, 8)}`,
        category_id: String(data.get('category_id')),
        neighborhood_id: String(data.get('neighborhood_id')),
        whatsapp,
        description,
      })
      if (error) throw error
      await refreshProfile()
      onComplete()
    } catch {
      setError(
        'Não foi possível cadastrar a empresa. Seus dados de acesso já estão salvos; tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }
  if (refs.loading) return <Spinner />
  if (refs.error) return <LoadError message={refs.error} retry={refs.reload} />
  return (
    <form onSubmit={submit} className="space-y-4">
      <Notice>
        Agora apresente seu negócio. O cadastro será analisado antes de aparecer
        no guia.
      </Notice>
      {error && <Notice error>{error}</Notice>}
      <Field label="Nome da empresa *">
        <Input
          aria-label="Nome da empresa"
          name="name"
          required
          maxLength={160}
        />
      </Field>
      <Field label="Categoria *">
        <Select
          aria-label="Categoria"
          name="category_id"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Selecione
          </option>
          {refs.data?.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Bairro *">
        <Select
          aria-label="Bairro"
          name="neighborhood_id"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Selecione
          </option>
          {refs.data?.neighborhoods.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="WhatsApp com DDD *">
        <Input
          aria-label="WhatsApp com DDD"
          name="whatsapp"
          type="tel"
          required
          maxLength={25}
        />
      </Field>
      <Field label="Descrição *">
        <Textarea
          aria-label="Descrição da empresa"
          name="description"
          required
          rows={4}
          maxLength={5000}
        />
      </Field>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Cadastrando…' : 'Enviar cadastro da empresa'}
      </Button>
    </form>
  )
}

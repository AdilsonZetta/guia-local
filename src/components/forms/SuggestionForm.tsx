import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { catalog, useResource } from '@/lib/public-data'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { LoadError, Notice } from '@/components/PageContent'

export function SuggestionForm() {
  const { user, profile } = useAuth()
  const refs = useResource(catalog)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  useEffect(() => {
    setName((current) => current || profile?.full_name || '')
    setContact((current) => current || profile?.phone || user?.email || '')
  }, [profile, user])
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const businessName = String(form.get('business_name') ?? '').trim()
    if (!businessName || !name.trim() || !contact.trim()) {
      setError('Preencha o nome da empresa e seus dados de contato.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error } = await supabase.from('suggestions').insert({
        suggested_by: user?.id ?? null,
        business_name: businessName,
        category_id: String(form.get('category_id')) || null,
        neighborhood_id: String(form.get('neighborhood_id')) || null,
        phone: String(form.get('phone')).trim() || null,
        notes: String(form.get('notes')).trim() || null,
        suggester_name: name.trim(),
        suggester_contact: contact.trim(),
      })
      if (error) throw error
      setSuccess(true)
    } catch {
      setError(
        'Não foi possível enviar a indicação. Confira os dados e tente novamente.',
      )
    } finally {
      setBusy(false)
    }
  }
  if (refs.loading) return <Spinner />
  if (refs.error) return <LoadError message={refs.error} retry={refs.reload} />
  if (success)
    return (
      <Card className="space-y-4 p-8">
        <Notice>
          Indicação enviada! Nossa equipe vai analisar os dados e conhecer esse
          negócio. Obrigado por fortalecer o comércio local.
        </Notice>
        <Button onClick={() => setSuccess(false)} variant="outline">
          Fazer outra indicação
        </Button>
      </Card>
    )
  return (
    <Card className="max-w-2xl p-6">
      <form className="space-y-5" onSubmit={submit}>
        {error && <Notice error>{error}</Notice>}
        <Field label="Nome da empresa *">
          <Input
            name="business_name"
            aria-label="Nome da empresa"
            required
            maxLength={160}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            <Select name="category_id" aria-label="Categoria">
              <option value="">Selecione uma categoria</option>
              {refs.data?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bairro">
            <Select name="neighborhood_id" aria-label="Bairro">
              <option value="">Selecione um bairro</option>
              {refs.data?.neighborhoods.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Telefone da empresa">
          <Input
            name="phone"
            aria-label="Telefone da empresa"
            type="tel"
            maxLength={25}
          />
        </Field>
        <Field label="Observações">
          <Textarea
            name="notes"
            aria-label="Observações"
            rows={4}
            maxLength={3000}
          />
        </Field>
        <div className="border-t border-line pt-5">
          <h2 className="mb-4 font-bold">Quem está indicando?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Seu nome *">
              <Input
                aria-label="Seu nome"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Seu telefone ou e-mail *">
              <Input
                aria-label="Seu telefone ou e-mail"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={200}
              />
            </Field>
          </div>
        </div>
        <Button disabled={busy} type="submit">
          {busy ? 'Enviando…' : 'Enviar indicação'}
        </Button>
      </form>
    </Card>
  )
}

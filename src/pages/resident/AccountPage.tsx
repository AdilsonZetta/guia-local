import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { PageContent, Notice } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
export function AccountPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [review, setReview] = useState(true)
  const [suggestion, setSuggestion] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? '')
      setPhone(profile.phone ?? '')
      setReview(profile.notify_review_email)
      setSuggestion(profile.notify_suggestion_email)
      setMarketing(profile.notify_marketing_email)
    }
  }, [profile])
  async function save(e: FormEvent) {
    e.preventDefault()
    if (!user || !name.trim()) {
      setError('Informe seu nome.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: name.trim(),
          phone: phone.trim() || null,
          notify_review_email: review,
          notify_suggestion_email: suggestion,
          notify_marketing_email: marketing,
        })
        .eq('id', user.id)
        .select('id')
        .single()
      if (error || !data) throw error
      await refreshProfile()
      setMessage('Seus dados foram atualizados.')
    } catch {
      setError('Não foi possível atualizar seus dados. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }
  async function requestDeletion() {
    if (!user) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ deletion_requested_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('id')
        .single()
      if (error || !data) throw error
      await refreshProfile()
      setConfirmDelete(false)
      setMessage(
        'Pedido de exclusão registrado. Nossa equipe irá analisar a solicitação.',
      )
    } catch {
      setError('Não foi possível registrar seu pedido. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }
  if (loading) return <Spinner />
  return (
    <PageContent
      title="Minha conta"
      description="Cuide dos seus dados e escolha como quer receber novidades."
    >
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {!profile ? (
        <Notice error>
          Seu perfil não pôde ser carregado.{' '}
          <button
            className="underline"
            onClick={() => {
              void refreshProfile()
            }}
          >
            Tentar novamente
          </button>
        </Notice>
      ) : (
        <>
          <Card className="max-w-2xl p-6">
            <form onSubmit={save} className="space-y-5">
              <Field label="Nome completo *">
                <Input
                  aria-label="Nome completo"
                  required
                  autoComplete="name"
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Telefone">
                <Input
                  aria-label="Telefone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={25}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field
                label="E-mail"
                hint="O e-mail de acesso é somente leitura."
              >
                <Input
                  aria-label="E-mail"
                  type="email"
                  readOnly
                  value={user?.email ?? profile.email}
                  className="bg-canvas"
                />
              </Field>
              <fieldset className="space-y-3 border-t border-line pt-5">
                <legend className="font-bold">Notificações por e-mail</legend>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={review}
                    onChange={(e) => setReview(e.target.checked)}
                  />
                  Atualizações das minhas avaliações
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={suggestion}
                    onChange={(e) => setSuggestion(e.target.checked)}
                  />
                  Atualizações das minhas indicações
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                  />
                  Novidades e dicas do Guia Local
                </label>
              </fieldset>
              <Button type="submit" disabled={busy}>
                {busy ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </form>
          </Card>
          <Card className="max-w-2xl space-y-4 p-6">
            <h2 className="text-lg font-bold">Exclusão da conta</h2>
            {profile.deletion_requested_at ? (
              <Notice>
                Solicitação registrada em{' '}
                {new Date(profile.deletion_requested_at).toLocaleDateString(
                  'pt-BR',
                )}
                . Nossa equipe irá analisar o pedido.
              </Notice>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Você pode solicitar a exclusão da sua conta e dos dados
                  associados. Nossa equipe analisará o pedido.
                </p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setError('')
                    setConfirmDelete(true)
                  }}
                >
                  Solicitar exclusão da conta
                </Button>
              </>
            )}
          </Card>
        </>
      )}
      {confirmDelete && (
        <Modal
          title="Solicitar exclusão da conta?"
          onClose={() => {
            if (!busy) setConfirmDelete(false)
          }}
        >
          <p className="text-muted">
            Ao confirmar, seu pedido será registrado para análise pela equipe do
            Guia Local.
          </p>
          {error && (
            <div className="mt-4">
              <Notice error>{error}</Notice>
            </div>
          )}
          <div className="mt-5 flex gap-3">
            <Button variant="danger" disabled={busy} onClick={requestDeletion}>
              {busy ? 'Enviando…' : 'Confirmar solicitação'}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              Cancelar
            </Button>
          </div>
        </Modal>
      )}
    </PageContent>
  )
}

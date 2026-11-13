import { useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { PageContent, Notice } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { checked, useAction } from '@/lib/management'
import {
  BusinessGate,
  Feedback,
  TextField,
  Toggle,
} from '@/components/Management'

export function BusinessSettingsPage() {
  return (
    <BusinessGate>
      <Settings />
    </BusinessGate>
  )
}
function Settings() {
  const { profile: p, business: b, user, refreshProfile } = useAuth()
  const [name, setName] = useState(p?.full_name ?? '')
  const [phone, setPhone] = useState(p?.phone ?? '')
  const [review, setReview] = useState(p?.notify_review_email ?? true)
  const [suggestion, setSuggestion] = useState(
    p?.notify_suggestion_email ?? true,
  )
  const [marketing, setMarketing] = useState(p?.notify_marketing_email ?? false)
  const [confirm, setConfirm] = useState(false)
  const action = useAction()
  return (
    <PageContent title="Configurações da empresa">
      <Feedback action={action} />
      <Card className="p-5 max-w-2xl">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void action.run(async () => {
              await checked(
                supabase
                  .from('profiles')
                  .update({
                    full_name: name.trim(),
                    phone,
                    notify_review_email: review,
                    notify_suggestion_email: suggestion,
                    notify_marketing_email: marketing,
                  })
                  .eq('id', user!.id)
                  .select('id')
                  .single(),
              )
              await refreshProfile()
            })
          }}
        >
          <TextField
            label="Nome completo"
            required
            value={name}
            onChange={setName}
          />
          <TextField label="Telefone" value={phone} onChange={setPhone} />
          <Field label="E-mail de acesso">
            <Input readOnly value={user?.email ?? p?.email ?? ''} />
          </Field>
          <h2 className="font-bold">Notificações por e-mail</h2>
          <Toggle
            label="Avaliações e respostas"
            checked={review}
            onChange={setReview}
          />
          <Toggle
            label="Atualizações das indicações"
            checked={suggestion}
            onChange={setSuggestion}
          />
          <Toggle
            label="Novidades do Guia Local"
            checked={marketing}
            onChange={setMarketing}
          />
          <Button disabled={action.busy} type="submit">
            Salvar conta
          </Button>
        </form>
      </Card>
      <Card className="p-5 max-w-2xl">
        <h2 className="font-bold">Visibilidade</h2>
        <Toggle
          label="Pausar meu perfil no guia"
          disabled={action.busy}
          checked={b!.is_paused}
          onChange={(v) =>
            void action.run(async () => {
              await checked(
                supabase
                  .from('businesses')
                  .update({ is_paused: v })
                  .eq('id', b!.id)
                  .select('id')
                  .single(),
              )
              await refreshProfile()
            })
          }
        />
      </Card>
      <Card className="p-5 max-w-2xl space-y-3">
        <h2 className="font-bold">Exclusão da conta</h2>
        {p?.deletion_requested_at ? (
          <Notice>
            Solicitação registrada em{' '}
            {new Date(p.deletion_requested_at).toLocaleDateString('pt-BR')}. A
            equipe analisará seu pedido.
          </Notice>
        ) : (
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Solicitar exclusão
          </Button>
        )}
      </Card>
      {confirm && (
        <Modal
          title="Solicitar exclusão da conta?"
          onClose={() => {
            if (!action.busy) setConfirm(false)
          }}
        >
          <p className="mb-4 text-muted">
            Seu pedido será encaminhado para análise pela equipe do Guia Local.
          </p>
          <Feedback action={action} />
          <Button
            variant="danger"
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                await checked(
                  supabase
                    .from('profiles')
                    .update({ deletion_requested_at: new Date().toISOString() })
                    .eq('id', user!.id)
                    .select('id')
                    .single(),
                )
                await refreshProfile()
                setConfirm(false)
              })
            }
          >
            Confirmar solicitação
          </Button>
        </Modal>
      )}
    </PageContent>
  )
}

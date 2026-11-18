import { useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { PageContent, Notice } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { checked, useAction, publicUrl } from '@/lib/management'
import { tileTone } from '@/components/business/BusinessIdentity'
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
  const [name, setName] = useState(p?.full_name || '')
  const [review, setReview] = useState(p?.notify_review_email ?? true)
  const [availability, setAvailability] = useState(
    p?.notify_availability ?? true,
  )
  const [weekly, setWeekly] = useState(p?.notify_weekly_summary ?? false)
  const [location, setLocation] = useState(b!.location_display)
  const [whatsapp, setWhatsapp] = useState(b!.show_whatsapp)
  const [confirm, setConfirm] = useState(false)
  const action = useAction()
  return (
    <PageContent
      title="Configurações"
      description="Gerencie seu acesso e as preferências da sua conta."
    >
      <Feedback action={action} />
      <form
        className="management-page-form"
        onSubmit={(e) => {
          e.preventDefault()
          void action.run(async () => {
            await checked(
              supabase
                .from('profiles')
                .update({
                  full_name: name.trim(),
                  notify_review_email: review,
                  notify_availability: availability,
                  notify_weekly_summary: weekly,
                })
                .eq('id', user!.id)
                .select('id')
                .single(),
            )
            await checked(
              supabase
                .from('businesses')
                .update({ location_display: location, show_whatsapp: whatsapp })
                .eq('id', b!.id)
                .select('id')
                .single(),
            )
            await refreshProfile()
          })
        }}
      >
        <div className="management-actions mb-6">
          <Button type="submit" disabled={action.busy}>
            Salvar alterações
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-5 p-6">
            <h2>Conta do responsável</h2>
            <p className="text-muted">
              Estas informações são usadas para acessar sua conta.
            </p>
            <div className="flex gap-6">
              <span className="avatar h-20 w-20 text-2xl" style={tileTone(name || 'guia')}>
                {name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <div className="flex-1 space-y-5">
                <TextField
                  label="Nome"
                  required
                  value={name}
                  onChange={setName}
                />
                <Field label="E-mail de acesso">
                  <Input readOnly value={user?.email ?? p?.email ?? ''} />
                  <p className="text-sm text-muted">
                    Esse e-mail não aparece no perfil público.
                  </p>
                </Field>
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              variant="outline"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    user?.email || p!.email,
                    { redirectTo: publicUrl('/entrar?reset=1') },
                  )
                  if (error) throw error
                }, 'Enviamos um link para alterar sua senha por e-mail.')
              }
            >
              Alterar senha
            </Button>
          </Card>
          <Card className="p-6 space-y-5">
            <h2>Notificações</h2>
            <p className="text-muted">
              Escolha o que você deseja receber por e-mail ou no sistema.
            </p>
            {[
              {
                label: 'Novas avaliações',
                text: 'Receba um aviso quando um cliente avaliar.',
                value: review,
                set: setReview,
              },
              {
                label: 'Lembretes de disponibilidade',
                text: 'Saiba quando atualizar seu status.',
                value: availability,
                set: setAvailability,
              },
              {
                label: 'Resumo semanal',
                text: 'Acompanhe visitas e cliques do seu perfil.',
                value: weekly,
                set: setWeekly,
              },
            ].map((n) => (
              <div
                className="flex items-center justify-between gap-3 border-b border-line py-4"
                key={n.label}
              >
                <div>
                  <strong>{n.label}</strong>
                  <p className="text-sm text-muted">{n.text}</p>
                </div>
                <Toggle label="" checked={n.value} onChange={n.set} />
              </div>
            ))}
          </Card>
          <Card className="p-6 space-y-5">
            <h2>Privacidade do perfil</h2>
            <p className="text-muted">
              Defina o que é exibido para os clientes no seu perfil público.
            </p>
            <Field label="Localização exibida">
              <Select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="city_regions">Cidade e regiões atendidas</option>
                <option value="city_only">Somente cidade</option>
                <option value="address">Endereço do negócio</option>
              </Select>
              <p className="mt-1 text-sm text-muted">
                Seu endereço residencial não é exibido.
              </p>
            </Field>
            <div className="flex justify-between border-t border-line pt-4">
              <div>
                <strong>Exibir WhatsApp comercial</strong>
                <p className="text-sm text-muted">
                  Permita que clientes entrem em contato.
                </p>
              </div>
              <Toggle label="" checked={whatsapp} onChange={setWhatsapp} />
            </div>
          </Card>
          <Card className="p-6 space-y-7">
            <h2>Gerenciar conta</h2>
            <p className="text-muted">
              Você pode pausar a exibição do negócio e reativar depois.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await checked(
                    supabase
                      .from('businesses')
                      .update({ is_paused: !b!.is_paused })
                      .eq('id', b!.id)
                      .select('id')
                      .single(),
                  )
                  await refreshProfile()
                })
              }
            >
              {b!.is_paused ? 'Reativar perfil' : 'Ⅱ Pausar perfil'}
            </Button>
            <div className="border-t border-line pt-5">
              {p?.deletion_requested_at ? (
                <Notice>
                  Solicitação de exclusão registrada. A equipe analisará seu
                  pedido.
                </Notice>
              ) : (
                <button
                  type="button"
                  className="text-red-500"
                  onClick={() => setConfirm(true)}
                >
                  Solicitar exclusão da conta
                </button>
              )}
            </div>
          </Card>
        </div>
      </form>
      <p className="rounded-lg border border-line p-4 text-sm text-muted">
        ♙ As alterações se aplicam apenas à sua conta e ao seu negócio.
      </p>
      {confirm && (
        <Modal
          title="Solicitar exclusão da conta?"
          onClose={() => setConfirm(false)}
        >
          <p className="mb-5">
            Seu pedido será encaminhado à equipe do Guia Local.
          </p>
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

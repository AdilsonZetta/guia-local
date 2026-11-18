import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { checked } from '@/lib/management'
import { useAuth } from '@/context/AuthProvider'
import { useResource, catalog } from '@/lib/public-data'
import { PageContent } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Textarea, Input } from '@/components/ui/Input'
import { useAction, publicUrl } from '@/lib/management'
import { BusinessGate, ResourceState, Feedback } from '@/components/Management'

export function BusinessPromoPage() {
  return (
    <BusinessGate>
      <Promo />
    </BusinessGate>
  )
}
function saveCanvas(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement('a')
  a.download = filename
  a.href = canvas.toDataURL('image/png')
  a.click()
}
function Promo() {
  const { business: b } = useAuth()
  const refs = useResource(async () => ({
    ...(await catalog()),
    stats: await checked(
      supabase
        .from('business_stats')
        .select('*')
        .eq('business_id', b!.id)
        .maybeSingle(),
    ),
  }))
  const url = publicUrl(`/empresa/${b!.slug}`)
  const reviewUrl = publicUrl(`/empresa/${b!.slug}/avaliar`)
  const [message, setMessage] = useState(
    `Olá! Conheça ${b!.name} no Guia Local: ${url}\nJá conhece nosso trabalho? Deixe sua avaliação: ${reviewUrl}`,
  )
  const qr = useRef<HTMLDivElement>(null)
  const action = useAction()
  async function card() {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 680
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível gerar a imagem.')
    const token = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    ctx.fillStyle = token('--color-canvas')
    ctx.fillRect(0, 0, 1200, 680)
    ctx.beginPath()
    ctx.arc(1200, 0, 240, 0, Math.PI * 2)
    ctx.fillStyle = token('--color-green-soft')
    ctx.fill()
    ctx.fillStyle = token('--color-green')
    ctx.font = 'bold 38px sans-serif'
    ctx.fillText('● Guia Local', 60, 70)
    if (b!.logo_url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = b!.logo_url
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () =>
          reject(
            new Error(
              'Não foi possível carregar o logo. Confira a URL da imagem.',
            ),
          )
      })
      ctx.drawImage(img, 60, 65, 140, 140)
    }
    ctx.fillStyle = token('--color-ink')
    ctx.font = 'bold 46px sans-serif'
    ctx.fillText(b!.name, 60, 290, 1080)
    ctx.font = '30px sans-serif'
    ctx.fillText(
      refs.data?.categories.find((c) => c.id === b!.category_id)?.name ??
        'Empresa no Guia Local',
      60,
      350,
      1080,
    )
    ctx.fillText(
      `★ ${Number(refs.data?.stats?.avg_rating ?? 0)
        .toFixed(1)
        .replace(
          '.',
          ',',
        )} · ${refs.data?.stats?.review_count ?? 0} avaliações`,
      60,
      420,
      1080,
    )
    ctx.font = '24px sans-serif'
    ctx.fillText(url, 60, 505, 1080)
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText('Conheça nossos serviços', 60, 600)
    saveCanvas(canvas, `${b!.slug}-cartao.png`)
  }
  return (
    <PageContent
      title="Divulgação"
      description="Compartilhe seu negócio e convide clientes a avaliar."
    >
      <div className="management-actions">
        <Link className="btn-outline" to={`/empresa/${b!.slug}`}>
          Ver perfil público
        </Link>
      </div>
      <Feedback action={action} />
      <ResourceState resource={refs}>
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-bold">Seu link público</h2>
          <p className="text-sm text-muted">
            Compartilhe este link para que as pessoas conheçam seu perfil no
            Guia Local.
          </p>
          <Input aria-label="Link do perfil público" readOnly value={url} />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                void action.run(() => navigator.clipboard.writeText(url))
              }
            >
              Copiar link
            </Button>
            <a
              className="inline-flex items-center rounded-xl px-4 bg-brand-soft text-brand-dark font-semibold"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            >
              Compartilhar no WhatsApp
            </a>
          </div>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 space-y-4">
            <h2>Cartão do seu negócio</h2>
            <p className="text-sm text-muted">
              Use esta imagem para divulgar seu negócio nas redes sociais,
              WhatsApp ou materiais impressos.
            </p>
            <div className="bio-page mx-auto rounded-xl bg-brand-soft p-8 min-h-64">
              <strong className="text-xl">📍 Guia Local</strong>
              <div className="flex items-center gap-5 my-7">
                {b!.logo_url && (
                  <img
                    className="h-20 w-20 rounded-xl"
                    src={b!.logo_url}
                    alt=""
                  />
                )}
                <div>
                  <h2>{b!.name}</h2>
                  <p className="text-muted">
                    {
                      refs.data?.categories.find((c) => c.id === b!.category_id)
                        ?.name
                    }
                  </p>
                  <p className="mt-2">
                    ⭐{' '}
                    {Number(refs.data?.stats?.avg_rating ?? 0)
                      .toFixed(1)
                      .replace('.', ',')}{' '}
                    · {refs.data?.stats?.review_count ?? 0} avaliações
                  </p>
                </div>
              </div>
              <p className="border-t border-green-soft pt-4 text-center font-bold">
                Conheça nossos serviços
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => void action.run(card)}
              >
                Baixar imagem
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() =>
                  void action.run(() => navigator.clipboard.writeText(url))
                }
              >
                Copiar link
              </Button>
            </div>
          </Card>
          <Card className="p-5 space-y-4">
            <h2 className="text-lg font-bold">QR Code de avaliação</h2>
            <p className="text-sm text-muted">
              Imprima e compartilhe para que seus clientes acessem seu perfil e
              deixem uma avaliação.
            </p>
            <div
              ref={qr}
              className="mx-auto w-fit rounded-xl border border-line bg-white p-4"
            >
              <QRCodeCanvas
                value={reviewUrl}
                size={200}
                marginSize={4}
                level="M"
              />
            </div>
            <p className="break-all text-sm text-muted">{reviewUrl}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  void action.run(async () => {
                    const canvas = qr.current?.querySelector('canvas')
                    if (!canvas) throw new Error('QR Code indisponível.')
                    saveCanvas(canvas, `${b!.slug}-avaliar.png`)
                  })
                }
              >
                Baixar QR Code
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void action.run(async () => {
                    const canvas = qr.current?.querySelector('canvas')
                    if (!canvas) throw new Error('QR Code indisponível.')
                    const popup = window.open(
                      '',
                      '_blank',
                      'width=700,height=800',
                    )
                    if (!popup)
                      throw new Error(
                        'Permita a abertura da janela de impressão.',
                      )
                    popup.document.title = 'Avalie nossa empresa'
                    const heading = popup.document.createElement('h1')
                    heading.textContent = `Avalie ${b!.name}`
                    const img = popup.document.createElement('img')
                    img.src = canvas.toDataURL()
                    img.width = 350
                    const p = popup.document.createElement('p')
                    p.textContent = reviewUrl
                    popup.document.body.style.cssText =
                      'font-family:sans-serif;text-align:center;padding:40px'
                    popup.document.body.append(heading, img, p)
                    await img.decode()
                    popup.focus()
                    popup.print()
                  })
                }
              >
                Imprimir cartão
              </Button>
            </div>
          </Card>
        </div>
        <Card className="p-5 space-y-4">
          <h2>Mensagem para convidar clientes</h2>
          <Field label="Use esta mensagem ao comunicar seu perfil a clientes, por WhatsApp ou outros canais.">
            <Textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
          <Button
            onClick={() =>
              void action.run(() => navigator.clipboard.writeText(message))
            }
          >
            Copiar mensagem
          </Button>
          <p className="text-xs text-muted">
            Convide clientes a contar experiências reais, sem direcionar a nota.
          </p>
        </Card>
      </ResourceState>
    </PageContent>
  )
}

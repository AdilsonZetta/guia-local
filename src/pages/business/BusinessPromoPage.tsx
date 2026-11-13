import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '@/context/AuthProvider'
import { useResource, catalog } from '@/lib/public-data'
import { PageContent } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Textarea, Input } from '@/components/ui/Input'
import { useAction, publicUrl, share } from '@/lib/management'
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
  const refs = useResource(catalog)
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
    ctx.fillStyle = '#f5faf7'
    ctx.fillRect(0, 0, 1200, 680)
    ctx.fillStyle = '#0F7B5A'
    ctx.fillRect(0, 0, 1200, 24)
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
    ctx.fillStyle = '#164c39'
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
      `WhatsApp: ${b!.whatsapp || 'Consulte nosso perfil'}`,
      60,
      420,
      1080,
    )
    ctx.font = '24px sans-serif'
    ctx.fillText(url, 60, 505, 1080)
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText('Guia Local · Perto de você', 60, 600)
    saveCanvas(canvas, `${b!.slug}-cartao.png`)
  }
  return (
    <PageContent title="Divulgação">
      <Feedback action={action} />
      <ResourceState resource={refs}>
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-bold">Compartilhe seu perfil</h2>
          <Input aria-label="Link do perfil público" readOnly value={url} />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                void action.run(() => navigator.clipboard.writeText(url))
              }
            >
              Copiar link
            </Button>
            <Button
              variant="outline"
              onClick={() => void action.run(() => share(url, b!.name))}
            >
              Compartilhar
            </Button>
            <a
              className="inline-flex items-center rounded-xl px-4 bg-brand-soft text-brand-dark font-semibold"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            >
              Enviar no WhatsApp
            </a>
            <Button variant="outline" onClick={() => void action.run(card)}>
              Baixar cartão em PNG
            </Button>
          </div>
        </Card>
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-bold">QR Code para avaliações</h2>
          <div ref={qr} className="w-fit bg-white p-4">
            <QRCodeCanvas
              value={reviewUrl}
              size={256}
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
              Imprimir QR Code
            </Button>
          </div>
        </Card>
        <Card className="p-5 space-y-4">
          <Field label="Mensagem de convite">
            <Textarea
              rows={6}
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
        </Card>
      </ResourceState>
    </PageContent>
  )
}

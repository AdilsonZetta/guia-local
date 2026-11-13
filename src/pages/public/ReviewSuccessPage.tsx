import { Link, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
export function ReviewSuccessPage() {
  const { slug } = useParams()
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="space-y-5 p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-brand" />
        <h1 className="text-2xl font-extrabold">Avaliação enviada!</h1>
        <p className="text-muted">
          Obrigado por compartilhar sua experiência. Sua avaliação entrou em
          moderação e poderá aparecer no perfil após a análise.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white"
            to={`/empresa/${slug}`}
          >
            Voltar ao perfil
          </Link>
          <Link
            className="rounded-xl bg-brand-soft px-4 py-3 text-sm font-bold text-brand-dark"
            to="/morador/avaliacoes"
          >
            Minhas avaliações
          </Link>
        </div>
      </Card>
    </div>
  )
}

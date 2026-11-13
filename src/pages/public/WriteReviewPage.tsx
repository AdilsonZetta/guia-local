import { uploadReviewPhotos } from '@/lib/review-photos'
import { Photo } from '@/components/Photo'
import { businessLocation } from '@/lib/utils'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { publicBusiness, useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import {
  PageContent,
  LoadError,
  MissingBusiness,
  Notice,
} from '@/components/PageContent'
import { BrandTile } from '@/components/business/BusinessIdentity'
import { MessageSquare, ShieldCheck, ThumbsUp, UsersRound } from 'lucide-react'
import { ReviewForm } from '@/components/forms/ReviewForm'
export function WriteReviewPage() {
  const { slug = '' } = useParams()
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const resource = useResource(async () => {
    const business = await publicBusiness(slug)
    if (!business || !user) return { business, existing: false, services: [] }
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('business_id', business.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error
    const services = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('sort_order')
    if (services.error) throw services.error
    return { business, existing: Boolean(data), services: services.data }
  }, [slug, user?.id])
  if (loading) return <Spinner />
  if (!user)
    return (
      <Navigate
        to="/entrar"
        replace
        state={{ from: `/empresa/${slug}/avaliar` }}
      />
    )
  if (profile?.status === 'suspended')
    return (
      <PageContent title="Conta suspensa">
        <Notice error>
          {profile.suspension_reason ||
            'Entre em contato com a equipe do Guia Local.'}
        </Notice>
      </PageContent>
    )
  if (resource.loading) return <Spinner />
  if (resource.error)
    return (
      <PageContent title="Avaliar empresa">
        <LoadError message={resource.error} retry={resource.reload} />
      </PageContent>
    )
  const business = resource.data?.business
  if (!business) return <MissingBusiness />
  return (
    <div className="site-container space-y-6 py-7">
      <nav className="flex flex-wrap gap-3 text-sm text-muted">
        <Link to="/">Início</Link>
        <span>/</span>
        <Link to={`/empresa/${slug}`} className="text-brand">
          {business.name}
        </Link>
        <span>/</span>
        <span>Escrever avaliação</span>
      </nav>
      <div>
        <h1 className="text-4xl font-extrabold md:text-5xl">
          Como foi sua experiência?
        </h1>
        <p className="mt-2 text-xl text-muted md:text-2xl">
          Seu relato ajuda outras pessoas a escolher.
        </p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[1.65fr_0.9fr]">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-4">
            <BrandTile business={business} className="!h-22 !w-22" />
            <div>
              <h2 className="text-2xl font-extrabold">{business.name}</h2>
              <p className="text-muted">{business.categories?.name}</p>
              <p className="mt-2 text-sm text-muted">
                {businessLocation(business)}
              </p>
            </div>
          </div>
          {business.owner_id === user.id ? (
            <Notice error>Você não pode avaliar sua própria empresa.</Notice>
          ) : resource.data?.existing ? (
            <Notice>
              Você já avaliou esta empresa.{' '}
              <Link className="font-bold underline" to="/morador/avaliacoes">
                Edite sua avaliação na área do morador.
              </Link>
            </Notice>
          ) : (
            <ReviewForm
              services={resource.data?.services}
              onCancel={() => navigate(`/empresa/${slug}`)}
              onSubmit={async (content, photos) => {
                const { data: review, error } = await supabase
                  .from('reviews')
                  .insert({
                    ...content,
                    business_id: business.id,
                    user_id: user.id,
                  })
                  .select('id')
                  .single()
                if (error) throw error
                const photoFailed = await uploadReviewPhotos(
                  review.id,
                  user.id,
                  photos,
                )
                navigate(`/empresa/${slug}/avaliar/enviada`, {
                  replace: true,
                  state: { photoFailed },
                })
              }}
            />
          )}
        </Card>
        <Card className="space-y-6 p-6">
          <h2 className="text-3xl font-extrabold">Uma avaliação útil</h2>
          <p className="text-muted">
            Seja claro e objetivo. Seu comentário ajuda outras pessoas da sua
            cidade.
          </p>
          {[
            {
              icon: MessageSquare,
              title: 'Conte o que foi realizado.',
              body: 'Descreva o serviço que você contratou e como foi o atendimento.',
            },
            {
              icon: ThumbsUp,
              title: 'Descreva pontos positivos e o que pode melhorar.',
              body: 'Compartilhe o que você mais gostou e, se quiser, dê sugestões de melhoria.',
            },
            {
              icon: UsersRound,
              title: 'Evite dados pessoais de outras pessoas.',
              body: 'Não inclua telefones, endereços ou informações pessoais de terceiros.',
            },
          ].map((t) => (
            <div key={t.title} className="flex gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                <t.icon size={29} />
              </span>
              <div>
                <h3 className="font-bold">{t.title}</h3>
                <p className="mt-1 text-sm text-muted">{t.body}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-4 rounded-xl bg-brand-soft p-4">
            <ShieldCheck className="shrink-0 text-brand" size={30} />
            <div>
              <strong>Sua avaliação será analisada antes da publicação.</strong>
              <p className="mt-1 text-sm text-muted">
                Isso ajuda a manter um ambiente seguro e confiável para todos.
              </p>
            </div>
          </div>
          {business.cover_url && (
            <Photo
              src={business.cover_url}
              alt={business.name}
              className="aspect-video w-full rounded-xl object-cover"
            />
          )}
        </Card>
      </div>
    </div>
  )
}

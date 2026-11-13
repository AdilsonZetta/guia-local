import { Photo } from '@/components/Photo'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock, Star } from 'lucide-react'
import { publicBusiness, useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthProvider'
import { BrandTile } from '@/components/business/BusinessIdentity'
import { Spinner } from '@/components/ui/Spinner'
import { LoadError, MissingBusiness, Notice } from '@/components/PageContent'
export function ReviewSuccessPage() {
  const { slug = '' } = useParams()
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const resource = useResource(async () => {
    const business = await publicBusiness(slug)
    if (!business || !user) return null
    const review = await supabase
      .from('reviews')
      .select('*')
      .eq('business_id', business.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (review.error) throw review.error
    return { business, review: review.data }
  }, [slug, user?.id])
  if (loading || resource.loading) return <Spinner />
  if (!user)
    return (
      <Navigate
        to="/entrar"
        state={{ from: `/empresa/${slug}/avaliar/enviada` }}
        replace
      />
    )
  if (resource.error)
    return (
      <div className="site-container py-10">
        <LoadError message={resource.error} retry={resource.reload} />
      </div>
    )
  if (!resource.data) return <MissingBusiness />
  const { business, review } = resource.data
  if (!review) return <Navigate to={`/empresa/${slug}/avaliar`} replace />
  return (
    <section className="success-page px-4 py-12 text-center">
      <span className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-emerald-100 text-brand">
        <Check size={75} strokeWidth={4} />
      </span>
      <h1 className="mt-5 text-4xl font-extrabold md:text-5xl">
        Sua avaliação foi enviada!
      </h1>
      <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-amber-700">
        <Clock size={22} />
        Em análise
      </span>
      <p className="mt-3 text-xl text-muted">
        Vamos analisar seu relato antes da publicação.
        <br />
        Acompanhe o status em{' '}
        <strong className="text-ink">Minhas avaliações.</strong>
      </p>
      {location.state?.photoFailed && (
        <div className="mx-auto mt-4 max-w-3xl">
          <Notice>
            Seu relato foi enviado, mas algumas fotos não puderam ser anexadas.
          </Notice>
        </div>
      )}
      <article className="mx-auto my-8 max-w-3xl rounded-xl border border-line bg-white p-6 text-left">
        <div className="flex flex-wrap gap-5">
          <BrandTile business={business} className="!h-24 !w-24" />
          <div>
            <h2 className="text-2xl font-extrabold">{business.name}</h2>
            <p className="text-muted">{business.categories?.name}</p>
            <p className="my-1 text-2xl text-amber-500">
              {'★'.repeat(review.rating)}
            </p>
            <p className="text-sm text-muted">
              {review.experience_month
                ? new Date(
                    `${review.experience_month.slice(0, 7)}-15T12:00:00`,
                  ).toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  })
                : ''}
            </p>
          </div>
          {business.cover_url && (
            <Photo
              src={business.cover_url}
              alt={business.name}
              className="ml-auto h-32 w-full rounded-lg object-cover sm:w-2/5"
            />
          )}
        </div>
        <blockquote className="mt-4 border-t border-line pt-3 text-lg">
          “{review.body}”
        </blockquote>
        <p className="mt-3 flex items-center gap-3">
          <span className="avatar">
            {profile?.full_name
              ?.split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')}
          </span>
          {profile?.full_name}
        </p>
      </article>
      <div className="mx-auto flex max-w-2xl flex-wrap gap-4">
        <Link className="btn-primary flex-1" to="/morador/avaliacoes">
          <Star size={20} />
          Minhas avaliações
        </Link>
        <Link className="btn-outline flex-1" to={`/empresa/${slug}`}>
          <ArrowLeft size={21} />
          Voltar ao perfil
        </Link>
      </div>
      <p className="mt-5 text-sm text-muted">
        Você pode editar sua avaliação na sua área.
      </p>
    </section>
  )
}

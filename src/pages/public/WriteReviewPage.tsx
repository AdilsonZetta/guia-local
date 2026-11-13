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
import { ReviewForm } from '@/components/forms/ReviewForm'
export function WriteReviewPage() {
  const { slug = '' } = useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const resource = useResource(async () => {
    const business = await publicBusiness(slug)
    if (!business || !user) return { business, existing: false }
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('business_id', business.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error
    return { business, existing: Boolean(data) }
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
    <PageContent
      title={`Avaliar ${business.name}`}
      description="Sua experiência ajuda outras pessoas a escolher com confiança."
    >
      <Card className="max-w-2xl p-6">
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
            onSubmit={async (content) => {
              const { error } = await supabase.from('reviews').insert({
                ...content,
                business_id: business.id,
                user_id: user.id,
              })
              if (error) throw error
              navigate(`/empresa/${slug}/avaliar/enviada`, { replace: true })
            }}
          />
        )}
      </Card>
    </PageContent>
  )
}

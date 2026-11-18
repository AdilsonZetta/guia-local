import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Building2, MapPin, Send, Star, UsersRound } from 'lucide-react'
import { loadHomeSnapshot } from '@/lib/business-search'
import { useCatalog } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { CategoryIcon } from '@/components/CategoryIcon'
import { BusinessCard } from '@/components/business/BusinessCard'
import { BrandTile, Rating, ratingView } from '@/components/business/BusinessIdentity'
import { SearchBar } from '@/components/SearchBar'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, LoadError } from '@/components/PageContent'

function StatValue({
  loading,
  value,
}: {
  loading: boolean
  value: number
}) {
  if (loading) {
    return <span className="inline-block h-4 w-10 animate-pulse rounded bg-zinc-200 align-middle" />
  }
  return <strong>{value.toLocaleString('pt-BR')}</strong>
}

export function HomePage() {
  const catalog = useCatalog()
  const settings = useQuery({
    queryKey: ['site-city'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('city_name')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      return data?.city_name || 'Uberaba'
    },
  })
  const home = useQuery({
    queryKey: ['home-snapshot'],
    queryFn: loadHomeSnapshot,
    staleTime: 2 * 60_000,
  })
  const city = settings.data || 'Uberaba'
  const snapshot = home.data
  const highlighted = snapshot?.highlighted ?? []
  const featuredCards = highlighted.filter((business) => business.cover_url).slice(0, 2)
  const businessCount = snapshot?.business_count ?? 0
  const reviewCount =
    snapshot && snapshot.review_count > 0
      ? snapshot.review_count
      : (snapshot?.google_review_count ?? 0)
  const avgRating =
    snapshot && snapshot.review_count > 0
      ? snapshot.platform_avg_rating
      : snapshot?.google_avg_rating
  return (
    <>
      <section className="home-hero">
        <div className="hero-texture" aria-hidden="true" />
        <div className="site-container home-hero-layout">
          <div className="home-hero-copy">
            <p className="hero-eyebrow">
              <MapPin size={14} />
              Guia de {city}
            </p>
            <h1 className="hero-title">
              Encontre quem <span className="hero-highlight">resolve</span>, perto de você.
            </h1>
            <p className="hero-description">
              Empresas e profissionais em {city}, com avaliações de quem já contratou.
            </p>
          </div>
          <div className="home-hero-search">
            <SearchBar neighborhoods={catalog.data?.neighborhoods || []} />
            <ul className="hero-trust">
              <li>
                <Building2 size={16} />
                <span>
                  <StatValue loading={home.isLoading} value={businessCount} />{' '}
                  {businessCount === 1 ? 'negócio' : 'negócios'}
                </span>
              </li>
              <li>
                <Star size={16} className="fill-current" />
                <span>
                  {home.isLoading ? (
                    <span className="inline-block h-4 w-16 animate-pulse rounded bg-zinc-200" />
                  ) : avgRating != null && avgRating > 0 ? (
                    <>
                      <strong>
                        {avgRating.toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </strong>{' '}
                      de média
                    </>
                  ) : (
                    <strong>Novas avaliações</strong>
                  )}
                </span>
              </li>
              <li>
                <UsersRound size={16} />
                <span>
                  <StatValue loading={home.isLoading} value={reviewCount} />{' '}
                  {reviewCount === 1 ? 'avaliação' : 'avaliações'}
                </span>
              </li>
            </ul>
          </div>
          {featuredCards.length > 0 && (
            <aside className="hero-card-stack" aria-label="Negócios em destaque">
              {featuredCards.map((business) => {
                const viewed = ratingView(business)
                return (
                  <Link
                    key={business.id}
                    to={`/empresa/${business.slug}`}
                    className="hero-stack-card"
                  >
                    <img src={business.cover_url!} alt="" className="hero-stack-cover" />
                    <div className="hero-stack-body">
                      <BrandTile business={business} className="!h-12 !w-12" />
                      <div>
                        <h3>{business.name}</h3>
                        <p>{business.categories?.name}</p>
                        <Rating
                          rating={viewed.rating}
                          count={viewed.count}
                          source={viewed.source}
                        />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </aside>
          )}
        </div>
      </section>
      <div className="site-container space-y-5 py-4">
        {home.isError ? (
          <LoadError
            message="Não foi possível carregar os dados. Tente novamente."
            retry={() => void home.refetch()}
          />
        ) : (
          <>
            <section
              className="category-grid grid grid-cols-4 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6"
              aria-label="Categorias"
            >
              {(catalog.data?.categories ?? [])
                .filter((category) => category.show_on_home)
                .slice(0, 6)
                .map((category) => (
                  <Link
                    key={category.id}
                    to={`/busca?categoria=${category.slug}`}
                    className="category-chip"
                  >
                    <span className="category-chip-icon">
                      <CategoryIcon name={category.icon} className="h-5 w-5 text-ink sm:h-6 sm:w-6" />
                    </span>
                    <span>{category.name}</span>
                  </Link>
                ))}
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="min-w-0 text-xl font-extrabold sm:text-2xl md:text-3xl">
                  Conheça negócios da sua região
                </h2>
                <Link to="/busca" className="flex min-h-11 shrink-0 items-center gap-1 text-sm text-brand underline">
                  Ver empresas <ArrowRight size={18} />
                </Link>
              </div>
              {home.isLoading ? (
                <CardSkeleton count={3} />
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {highlighted.slice(0, 3).map((business) => (
                    <BusinessCard
                      key={business.id}
                      business={business}
                      source="home"
                      city={city}
                    />
                  ))}
                </div>
              )}
              {!home.isLoading && !highlighted.length && (
                <EmptyState title="Novos negócios estão chegando">
                  <Link to="/indicar" className="text-brand">
                    Indique uma empresa da sua região.
                  </Link>
                </EmptyState>
              )}
            </section>
          </>
        )}
        <section className="glass-card flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5 sm:px-6">
          <UsersRound aria-hidden="true" className="h-6 w-6 text-brand sm:h-10 sm:w-10" />
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">
              Conhece um negócio que ainda não está aqui?
            </h2>
            <p className="text-muted">Ajude a sua cidade a ficar mais completa.</p>
          </div>
          <Link to="/indicar" className="btn-outline w-full sm:ml-auto sm:w-auto">
            <Send size={20} />
            Indicar empresa
          </Link>
        </section>
      </div>
    </>
  )
}

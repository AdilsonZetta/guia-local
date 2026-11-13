import { Link } from 'react-router-dom'
import { ArrowRight, Building2, MapPin, Send, Star, UsersRound } from 'lucide-react'
import { catalog, publicBusinesses, useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { CategoryIcon } from '@/components/CategoryIcon'
import { BusinessCard } from '@/components/business/BusinessCard'
import {
  BrandTile,
  Rating,
} from '@/components/business/BusinessIdentity'
import { SearchBar } from '@/components/SearchBar'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, LoadError } from '@/components/PageContent'
export function HomePage() {
  const resource = useResource(async () => {
    const [refs, businesses, settings] = await Promise.all([
      catalog(),
      publicBusinesses(),
      supabase
        .from('site_settings')
        .select('city_name')
        .eq('id', 1)
        .maybeSingle(),
    ])
    if (settings.error) throw settings.error
    return {
      ...refs,
      businesses: businesses.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          Number(b.slug === 'juliana-limpeza') -
            Number(a.slug === 'juliana-limpeza'),
      ),
      city: settings.data?.city_name || 'Uberaba',
    }
  })
  const data = resource.data
  const city = data?.city || 'Uberaba'
  const businesses = data?.businesses || []
  const featuredCards = businesses.filter((b) => b.cover_url).slice(0, 2)
  const businessCount = businesses.length
  const reviewCount = businesses.reduce(
    (sum, b) => sum + (b.business_stats?.review_count || 0),
    0,
  )
  const avgRating = (() => {
    const rated = businesses.filter((b) => (b.business_stats?.review_count || 0) > 0 && b.business_stats?.avg_rating)
    if (!rated.length) return null
    const total = rated.reduce((sum, b) => sum + Number(b.business_stats?.avg_rating || 0), 0)
    return total / rated.length
  })()
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
            <SearchBar neighborhoods={data?.neighborhoods || []} />
            <ul className="hero-trust">
              <li>
                <Building2 size={16} />
                <span>
                  <strong>{businessCount}</strong> {businessCount === 1 ? 'negócio' : 'negócios'}
                </span>
              </li>
              <li>
                <Star size={16} className="fill-current" />
                <span>
                  {avgRating != null ? (
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
                  <strong>{reviewCount}</strong> {reviewCount === 1 ? 'avaliação' : 'avaliações'}
                </span>
              </li>
            </ul>
          </div>
          {featuredCards.length > 0 && (
            <aside className="hero-card-stack" aria-label="Negócios em destaque">
              {featuredCards.map((b) => (
                <Link
                  key={b.id}
                  to={`/empresa/${b.slug}`}
                  className="hero-stack-card"
                >
                  <img
                    src={b.cover_url!}
                    alt=""
                    className="hero-stack-cover"
                  />
                  <div className="hero-stack-body">
                    <BrandTile business={b} className="!h-12 !w-12" />
                    <div>
                      <h3>{b.name}</h3>
                      <p>{b.categories?.name}</p>
                      <Rating
                        rating={b.business_stats?.avg_rating}
                        count={b.business_stats?.review_count}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </aside>
          )}
        </div>
      </section>
      <div className="site-container space-y-5 py-4">
        {resource.loading ? (
          <Spinner />
        ) : resource.error ? (
          <LoadError message={resource.error} retry={resource.reload} />
        ) : (
          <>
            <section
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
              aria-label="Categorias"
            >
              {data?.categories
                .filter((c) => c.show_on_home)
                .slice(0, 6)
                .map((c) => (
                  <Link
                    key={c.id}
                    to={`/busca?categoria=${c.slug}`}
                    className="category-chip"
                  >
                    <span className="category-chip-icon">
                      <CategoryIcon
                        name={c.icon}
                        className="h-6 w-6 text-ink"
                      />
                    </span>
                    <span>{c.name}</span>
                  </Link>
                ))}
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-extrabold md:text-3xl">
                  Conheça negócios da sua região
                </h2>
                <Link
                  to="/busca"
                  className="flex shrink-0 items-center gap-2 text-sm text-brand underline"
                >
                  Ver empresas <ArrowRight size={18} />
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {data?.businesses.slice(0, 3).map((b) => (
                  <BusinessCard
                    key={b.id}
                    business={b}
                    source="home"
                    city={data.city}
                  />
                ))}
              </div>
              {!data?.businesses.length && (
                <EmptyState title="Novos negócios estão chegando">
                  <Link to="/indicar" className="text-brand">
                    Indique uma empresa da sua região.
                  </Link>
                </EmptyState>
              )}
            </section>
          </>
        )}
        <section className="glass-card flex flex-wrap items-center gap-5 px-6 py-4">
          <UsersRound size={40} className="text-brand" />
          <div>
            <h2 className="text-lg font-extrabold">
              Conhece um negócio que ainda não está aqui?
            </h2>
            <p className="text-muted">
              Ajude a sua cidade a ficar mais completa.
            </p>
          </div>
          <Link to="/indicar" className="btn-outline ml-auto">
            <Send size={20} />
            Indicar empresa
          </Link>
        </section>
      </div>
    </>
  )
}

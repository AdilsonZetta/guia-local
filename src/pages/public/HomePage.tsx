import { Link } from 'react-router-dom'
import { ArrowRight, Send, UsersRound } from 'lucide-react'
import { catalog, publicBusinesses, useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { CategoryIcon } from '@/components/CategoryIcon'
import { BusinessCard } from '@/components/business/BusinessCard'
import {
  BrandTile,
  Rating,
  ReceivingChip,
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
  const featured = data?.businesses[0]
  return (
    <>
      <section className="home-hero">
        {featured?.cover_url && (
          <img
            src={featured.cover_url}
            alt="Serviços e profissionais da sua cidade"
            className="hero-photo"
          />
        )}
        <div className="site-container home-hero-panel">
          <h1 className="hero-title">
            Encontre quem
            <br className="hidden md:block" /> resolve, perto de você.
          </h1>
          <p className="hero-description">
            Empresas e profissionais em {data?.city || 'Uberaba'},
            <br className="hidden md:block" /> com avaliações de clientes.
          </p>
          {featured && (
            <div className="featured-float">
              <BrandTile business={featured} className="!h-16 !w-16" />
              <div>
                <h3 className="font-extrabold">{featured.name}</h3>
                <p className="text-xs text-muted">
                  {featured.categories?.name}
                </p>
                <div className="my-1">
                  <Rating
                    rating={featured.business_stats?.avg_rating}
                    count={featured.business_stats?.review_count}
                  />
                </div>
                <ReceivingChip business={featured} />
              </div>
            </div>
          )}
          <SearchBar neighborhoods={data?.neighborhoods || []} />
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

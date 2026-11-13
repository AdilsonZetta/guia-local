import { Link, useNavigate } from 'react-router-dom'
import { Search, ArrowRight, MapPin } from 'lucide-react'
import { useState } from 'react'
import { catalog, publicBusinesses, useResource } from '@/lib/public-data'
import { CategoryIcon } from '@/components/CategoryIcon'
import { BusinessCard } from '@/components/business/BusinessCard'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, LoadError } from '@/components/PageContent'

export function HomePage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [bairro, setBairro] = useState('')
  const resource = useResource(async () => {
    const [refs, businesses] = await Promise.all([
      catalog(),
      publicBusinesses(true),
    ])
    return { ...refs, businesses }
  })
  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 md:py-12">
      <section className="rounded-3xl bg-brand-soft px-6 py-10 md:p-12">
        <p className="mb-4 flex items-center gap-2 font-bold text-brand">
          <MapPin size={18} /> Perto de você, em Uberaba
        </p>
        <h1 className="max-w-3xl text-4xl leading-tight font-extrabold text-brand-dark md:text-5xl">
          Encontre empresas e prestadores de confiança em Uberaba
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Descubra serviços no seu bairro, conheça avaliações e fale diretamente
          com quem faz acontecer.
        </p>
        <form
          className="mt-8 grid gap-3 rounded-2xl bg-white p-3 shadow-sm md:grid-cols-[1fr_240px_auto]"
          onSubmit={(e) => {
            e.preventDefault()
            const params = new URLSearchParams()
            if (q.trim()) params.set('q', q.trim())
            if (bairro) params.set('bairro', bairro)
            navigate(`/busca?${params}`)
          }}
        >
          <Input
            aria-label="Serviço ou nome da empresa"
            placeholder="Qual serviço você procura?"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            aria-label="Bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
          >
            <option value="">Todos os bairros</option>
            {resource.data?.neighborhoods.map((n) => (
              <option key={n.id} value={n.slug}>
                {n.name}
              </option>
            ))}
          </Select>
          <Button type="submit">
            <Search size={18} /> Buscar
          </Button>
        </form>
      </section>
      {resource.loading ? (
        <Spinner />
      ) : resource.error ? (
        <LoadError message={resource.error} retry={resource.reload} />
      ) : (
        <>
          <section>
            <h2 className="mb-5 text-2xl font-extrabold">
              O que você precisa hoje?
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {resource.data?.categories
                .filter((c) => c.show_on_home)
                .map((c) => (
                  <Link
                    key={c.id}
                    to={`/busca?categoria=${encodeURIComponent(c.slug)}`}
                  >
                    <Card className="flex h-full flex-col items-center gap-3 p-5 text-center transition hover:border-brand hover:shadow-md">
                      <span className="rounded-2xl bg-brand-soft p-3 text-brand">
                        <CategoryIcon name={c.icon} />
                      </span>
                      <span className="text-sm font-bold">{c.name}</span>
                    </Card>
                  </Link>
                ))}
            </div>
            {!resource.data?.categories.some((c) => c.show_on_home) && (
              <p className="text-muted">
                Explore todos os serviços pela busca.
              </p>
            )}
          </section>
          <section>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-extrabold">Destaques da região</h2>
              <Link
                to="/busca"
                className="flex items-center gap-1 text-sm font-bold text-brand"
              >
                Ver todos <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {resource.data?.businesses.map((b) => (
                <BusinessCard key={b.id} business={b} source="home" />
              ))}
            </div>
            {!resource.data?.businesses.length && (
              <EmptyState title="Conheça os negócios da cidade">
                <Link to="/busca" className="text-brand">
                  Encontre empresas e serviços na busca.
                </Link>
              </EmptyState>
            )}
          </section>
        </>
      )}
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-brand p-8 text-white">
        <div>
          <h2 className="text-2xl font-extrabold">
            Seu bairro tem uma boa indicação?
          </h2>
          <p className="mt-2 text-white/85">
            Ajude mais pessoas a descobrir os negócios locais.
          </p>
        </div>
        <Link
          to="/indicar"
          className="rounded-xl bg-white px-5 py-3 font-bold text-brand"
        >
          Indicar empresa
        </Link>
      </section>
    </div>
  )
}

import { MapPin, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Tables } from '@/lib/database.types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { NeighborhoodSelect } from '@/components/ui/NeighborhoodSelect'

export function SearchBar({
  neighborhoods,
  query = '',
  neighborhood = '',
  live = false,
  onSearch,
}: {
  neighborhoods: Pick<Tables<'neighborhoods'>, 'id' | 'name' | 'slug'>[]
  query?: string
  neighborhood?: string
  live?: boolean
  onSearch?: (next: { q: string; bairro: string }) => void
}) {
  const [q, setQ] = useState(query)
  const [bairro, setBairro] = useState(neighborhood)
  const [prevQuery, setPrevQuery] = useState(query)
  const [prevNeighborhood, setPrevNeighborhood] = useState(neighborhood)
  const debouncedQ = useDebouncedValue(q, 350)
  const [emitted, setEmitted] = useState(query)
  const navigate = useNavigate()
  if (query !== prevQuery) {
    setPrevQuery(query)
    if (query !== emitted) {
      setEmitted(query)
      setQ(query)
    }
  }
  if (neighborhood !== prevNeighborhood) {
    setPrevNeighborhood(neighborhood)
    setBairro(neighborhood)
  }
  function go(nextQ: string, nextBairro: string) {
    const trimmed = nextQ.trim()
    setEmitted(trimmed)
    if (onSearch) onSearch({ q: trimmed, bairro: nextBairro })
    else navigate(`/busca?${new URLSearchParams({ q: trimmed, bairro: nextBairro })}`)
  }
  useEffect(() => {
    if (!live) return
    if (debouncedQ.trim() === query) return
    const trimmed = debouncedQ.trim()
    setEmitted(trimmed)
    if (onSearch) onSearch({ q: trimmed, bairro })
    else navigate(`/busca?${new URLSearchParams({ q: trimmed, bairro })}`)
  }, [debouncedQ, live, query, bairro, onSearch, navigate])
  return (
    <form
      className="search-bar"
      onSubmit={(event) => {
        event.preventDefault()
        go(q, bairro)
      }}
    >
      <label className="search-field">
        <Search className="shrink-0" size={24} />
        <input
          aria-label="Qual serviço você procura?"
          placeholder="Qual serviço você procura?"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </label>
      <label className="search-field">
        <MapPin className="shrink-0" size={23} />
        <NeighborhoodSelect
          bare
          neighborhoods={neighborhoods}
          value={bairro}
          ariaLabel="Bairro atendido"
          onChange={(slug) => {
            setBairro(slug)
            if (live) go(q, slug)
          }}
        />
      </label>
      <button className="btn-primary text-lg" type="submit">
        <Search size={25} />
        Buscar
      </button>
    </form>
  )
}

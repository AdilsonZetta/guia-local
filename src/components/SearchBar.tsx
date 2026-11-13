import { MapPin, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Tables } from '@/lib/database.types'
export function SearchBar({
  neighborhoods,
  query = '',
  neighborhood = '',
}: {
  neighborhoods: Tables<'neighborhoods'>[]
  query?: string
  neighborhood?: string
}) {
  const [q, setQ] = useState(query)
  const [bairro, setBairro] = useState(neighborhood)
  const navigate = useNavigate()
  return (
    <form
      className="search-bar"
      onSubmit={(e) => {
        e.preventDefault()
        navigate(`/busca?${new URLSearchParams({ q: q.trim(), bairro })}`)
      }}
    >
      <label className="search-field">
        <Search className="shrink-0" size={24} />
        <input
          aria-label="Qual serviço você procura?"
          placeholder="Qual serviço você procura?"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <label className="search-field">
        <MapPin className="shrink-0" size={23} />
        <select
          aria-label="Bairro atendido"
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
        >
          <option value="">Todos os bairros</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.slug}>
              {n.name}
            </option>
          ))}
        </select>
      </label>
      <button className="btn-primary text-lg" type="submit">
        <Search size={25} />
        Buscar
      </button>
    </form>
  )
}

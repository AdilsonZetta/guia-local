import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Tables } from '@/lib/database.types'
import { cn } from '@/lib/utils'

function fold(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

export function NeighborhoodSelect({
  neighborhoods,
  value,
  onChange,
  name,
  placeholder = 'Todos os bairros',
  ariaLabel = 'Bairro',
  bare = false,
  required = false,
  valueKey = 'slug',
}: {
  neighborhoods: Pick<Tables<'neighborhoods'>, 'id' | 'name' | 'slug'>[]
  value: string
  onChange?: (value: string) => void
  name?: string
  placeholder?: string
  ariaLabel?: string
  bare?: boolean
  required?: boolean
  valueKey?: 'slug' | 'id'
}) {
  const identity = (item: Pick<Tables<'neighborhoods'>, 'id' | 'slug'>) =>
    valueKey === 'id' ? item.id : item.slug
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected = neighborhoods.find((item) => identity(item) === value)
  const [text, setText] = useState(selected?.name ?? '')
  const [prevSelected, setPrevSelected] = useState(selected?.name ?? '')
  if ((selected?.name ?? '') !== prevSelected) {
    setPrevSelected(selected?.name ?? '')
    setText(selected?.name ?? '')
  }
  const options = useMemo(() => {
    const query = fold(text.trim())
    const sorted = [...neighborhoods].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    const matched =
      !query || (selected && text === selected.name)
        ? sorted
        : sorted.filter((item) => fold(item.name).includes(query))
    return matched.slice(0, 40)
  }, [neighborhoods, selected, text])
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      {name && <input type="hidden" name={name} value={value} />}
      <input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        required={required}
        placeholder={placeholder}
        value={text}
        className={cn(
          bare
            ? 'w-full min-w-0 bg-transparent outline-none'
            : 'h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
        )}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          setOpen(true)
          if (!next.trim()) onChange?.('')
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === ''}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-soft"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange?.('')
                setText('')
                setOpen(false)
              }}
            >
              {placeholder}
            </button>
          </li>
          {options.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={identity(item) === value}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-brand-soft ${identity(item) === value ? 'bg-brand-soft' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange?.(identity(item))
                  setText(item.name)
                  setOpen(false)
                }}
              >
                {item.name}
              </button>
            </li>
          ))}
          {!options.length && (
            <li className="px-3 py-2 text-sm text-muted">Nenhum bairro encontrado.</li>
          )}
        </ul>
      )}
    </div>
  )
}

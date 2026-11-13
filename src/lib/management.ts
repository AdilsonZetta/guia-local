import { useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Database, Tables } from './database.types'
import { BASE_PATH, downloadTextFile } from './utils'
export async function checked<
  R extends { data: unknown; error: { message: string } | null },
>(request: PromiseLike<R>): Promise<Extract<R, { error: null }>['data']> {
  const result = await request
  if (result.error) {
    const message = result.error.message
    if (/duplicate|unique/i.test(message))
      throw new Error('Este identificador já está em uso. Escolha outro.')
    if (/foreign key/i.test(message))
      throw new Error(
        'Este registro está associado a outros dados. Desative-o ou revise os vínculos.',
      )
    if (/policy|permission|not allowed|JWT/i.test(message))
      throw new Error(
        'Sua conta não tem permissão para esta alteração. Verifique seu acesso.',
      )
    if (/size|large|maximum/i.test(message))
      throw new Error(
        'A imagem excede o tamanho permitido. Use um arquivo de até 5 MB.',
      )
    throw new Error(
      'Não foi possível concluir a operação no servidor. Tente novamente.',
    )
  }
  return result.data as Extract<R, { error: null }>['data']
}

export async function all<T extends keyof Database['public']['Tables']>(
  table: T,
): Promise<Tables<T>[]> {
  const rows: Tables<T>[] = []
  for (let offset = 0; ; offset += 500) {
    const data = await checked(
      supabase
        .from(table)
        .select('*')
        .order(table === 'business_service_areas' ? 'neighborhood_id' : table === 'favorites' ? 'user_id' : 'id')
        .range(offset, offset + 499),
    )
    rows.push(...(data as unknown as Tables<T>[]))
    if (data.length < 500) return rows
  }
}

export async function businessRows<
  T extends 'profile_visits' | 'services' | 'business_photos' | 'reviews',
>(table: T, businessId: string, since?: string): Promise<Tables<T>[]> {
  const rows: Tables<T>[] = []
  for (let offset = 0; ; offset += 500) {
    let query = supabase
      .from(
        table as 'profile_visits' | 'services' | 'business_photos' | 'reviews',
      )
      .select('*')
      .eq('business_id', businessId)
      .order('id')
      .range(offset, offset + 499)
    if (since) query = query.gte('created_at', since)
    const data = await checked(query)
    rows.push(...(data as unknown as Tables<T>[]))
    if (data.length < 500) return rows
  }
}

export function useAction() {
  const running = useRef(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  return {
    busy,
    message,
    error,
    run: async (fn: () => Promise<void>, success = 'Alterações salvas.') => {
      if (running.current) return
      running.current = true
      setBusy(true)
      setMessage('')
      setError(false)
      try {
        await fn()
        setMessage(success)
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(true)
        setMessage(
          e instanceof Error
            ? e.message
            : 'Não foi possível salvar. Tente novamente.',
        )
      } finally {
        running.current = false
        setBusy(false)
      }
    },
  }
}

export function publicUrl(path: string) {
  return `${window.location.origin}${BASE_PATH}${path}`
}

export async function share(url: string, title: string) {
  if (navigator.share) await navigator.share({ url, title })
  else await navigator.clipboard.writeText(url)
}

export async function upload(file: File, bucket: string, prefix: string) {
  if (
    !(
      bucket === 'site-assets'
        ? [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/svg+xml',
          ]
        : ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    ).includes(file.type)
  )
    throw new Error('Selecione uma imagem.')
  if (file.size > 5 * 1024 * 1024)
    throw new Error('A imagem deve ter até 5 MB.')
  const path = `${prefix}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`
  await checked(supabase.storage.from(bucket).upload(path, file))
  return {
    path,
    url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl,
  }
}

export function csv(
  filename: string,
  rows: Record<string, unknown>[],
  columns: string[],
) {
  const cell = (v: unknown) => {
    let s = String(v ?? '')
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s
    return '"' + s.replace(/"/g, '""') + '"'
  }
  downloadTextFile(
    filename,
    '\uFEFF' +
      [columns, ...rows.map((r) => columns.map((c) => r[c]))]
        .map((r) => r.map(cell).join(';'))
        .join('\r\n'),
  )
}

export async function audit(
  actor: string,
  action: string,
  entity_type: string,
  entity_id: string,
  metadata: Record<string, string> = {},
) {
  await checked(
    supabase
      .from('activity_log')
      .insert({ actor_id: actor, action, entity_type, entity_id, metadata }),
  )
}

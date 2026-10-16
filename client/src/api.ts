import { useEffect, useState } from 'react'
import type { ApiMeta, ClassSummary, SpecTalentData } from './lib/types'

const cache = new Map<string, Promise<unknown>>()

function getJson<T>(url: string): Promise<T> {
  let promise = cache.get(url) as Promise<T> | undefined
  if (!promise) {
    promise = fetch(url).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message ?? `Erreur serveur (${res.status})`)
      }
      return res.json() as Promise<T>
    })
    // Do not keep failures: the next call retries.
    promise.catch(() => cache.delete(url))
    cache.set(url, promise)
  }
  return promise
}

export const fetchMeta = () => getJson<ApiMeta>('/api/meta')

export const fetchClasses = () => getJson<ClassSummary[]>('/api/classes')

export const fetchSpecTalents = (specId: number) => getJson<SpecTalentData>(`/api/specs/${specId}/talents`)

export interface AsyncState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true })

  useEffect(() => {
    let cancelled = false
    setState({ data: null, error: null, loading: true })
    load().then(
      (data) => !cancelled && setState({ data, error: null, loading: false }),
      (err: unknown) =>
        !cancelled && setState({ data: null, error: err instanceof Error ? err.message : String(err), loading: false }),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}

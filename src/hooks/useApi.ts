import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'

/**
 * Runs `fetcher` on mount and whenever `deps` change.
 *
 * The cancellation flag matters more than it looks: changing a filter fires a
 * second request while the first is still open, and without the flag a slow
 * first response can land after the fast second one and overwrite fresh data
 * with stale rows.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setErrorStatus(null)

    fetcher()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setError(caught instanceof ApiError ? caught.detail : 'Something went wrong.')
        setErrorStatus(caught instanceof ApiError ? caught.status : null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // `fetcher` is a fresh closure every render, so it is deliberately not a
    // dependency; the caller declares what actually changes via `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, loading, error, errorStatus, reload }
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/endpoints'
import { restoreSession, setSessionLostHandler, tokenStore } from '../api/client'
import type { CurrentUser } from '../api/types'

interface AuthValue {
  user: CurrentUser | null
  /** True until the initial refresh-token exchange has settled. */
  booting: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [booting, setBooting] = useState(true)

  const signOut = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    // The client calls this when a refresh fails, which is the only way a
    // session dies without the user asking.
    setSessionLostHandler(() => setUser(null))
  }, [])

  useEffect(() => {
    // The access token lives in memory, so a page reload starts with nothing.
    // Trade the stored refresh token for a new pair before rendering routes,
    // otherwise every guarded route would bounce to /login on refresh.
    let cancelled = false
    void (async () => {
      const restored = await restoreSession()
      if (cancelled) return
      if (restored) {
        try {
          setUser(await api.me())
        } catch {
          tokenStore.clear()
        }
      }
      if (!cancelled) setBooting(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const tokens = await api.auth.login(email, password)
    tokenStore.setSession(tokens)
    setUser(await api.me())
  }, [])

  const value = useMemo(
    () => ({ user, booting, signIn, signOut }),
    [user, booting, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

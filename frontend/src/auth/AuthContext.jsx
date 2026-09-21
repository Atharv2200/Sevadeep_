import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/auth'
import { setSessionLostHandler } from '../api/client'

// The session lives in an httpOnly cookie that scripts cannot read, so the only
// way to know who is signed in is to ask the server (GET /auth/me). Nothing about
// the session is written to localStorage, sessionStorage or any other client storage.
//
// status: 'loading' (checking) | 'authenticated' | 'anonymous' | 'error' (server unreachable)

const AuthContext = createContext(null)

const SUSPENDED_NOTICE = 'This account has been suspended. Please contact an administrator.'
const EXPIRED_NOTICE = 'Your session has ended. Please sign in again.'

const anonymous = (notice = null) => ({ status: 'anonymous', user: null, error: null, notice })
const authenticated = (user) => ({ status: 'authenticated', user, error: null, notice: null })

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null, error: null, notice: null })

  const loadSession = useCallback(async (signal) => {
    setState((previous) => ({ ...previous, status: 'loading', error: null }))
    try {
      const user = await authApi.me({ signal })
      if (!signal?.aborted) setState(authenticated(user))
    } catch (error) {
      if (signal?.aborted) return
      if (error.status === 401) setState(anonymous())
      else if (error.code === 'ACCOUNT_SUSPENDED') setState(anonymous(SUSPENDED_NOTICE))
      else setState({ status: 'error', user: null, error, notice: null })
    }
  }, [])

  // Check the session once on startup.
  useEffect(() => {
    const controller = new AbortController()
    loadSession(controller.signal)
    return () => controller.abort()
  }, [loadSession])

  // Any API call that discovers the session is gone (expired, revoked, suspended)
  // lands here, so every page reacts the same way and guards redirect to sign-in.
  useEffect(() => {
    setSessionLostHandler((error) => {
      setState((previous) =>
        previous.status === 'authenticated'
          ? anonymous(error.code === 'ACCOUNT_SUSPENDED' ? SUSPENDED_NOTICE : EXPIRED_NOTICE)
          : previous
      )
    })
    return () => setSessionLostHandler(null)
  }, [])

  const login = useCallback(async (credentials) => {
    const user = await authApi.login(credentials)
    setState(authenticated(user))
    return user
  }, [])

  const register = useCallback(async (details) => {
    const user = await authApi.register(details)
    setState(authenticated(user))
    return user
  }, [])

  // Signing out is best effort on the server: if the request fails the browser is
  // still treated as signed out locally (the cookie can be cleared later or expires).
  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore: the local state is cleared either way
    }
    setState(anonymous())
  }, [])

  // Re-read the account after something changed it (profile edit). Silent: the
  // status stays 'authenticated', so the current page is not replaced by a spinner.
  const refresh = useCallback(async () => {
    const user = await authApi.me()
    setState(authenticated(user))
    return user
  }, [])

  // Try the startup check again after it failed (shows the loading state).
  const retry = useCallback(() => loadSession(), [loadSession])

  const setUser = useCallback((user) => setState(authenticated(user)), [])
  const clearNotice = useCallback(() => setState((previous) => ({ ...previous, notice: null })), [])

  const value = useMemo(
    () => ({ ...state, login, register, logout, refresh, retry, setUser, clearNotice }),
    [state, login, register, logout, refresh, retry, setUser, clearNotice]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

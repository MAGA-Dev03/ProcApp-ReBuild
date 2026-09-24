import { createContext, useContext, useState, type ReactNode } from 'react'
import type { User } from '@/types'
import { login as apiLogin, logout as apiLogout } from '@/api/client'
import { setAuthToken } from '@/api/http'
import {
  clearStoredSession,
  loadStoredSession,
  patchStoredUser,
  saveStoredSession,
} from '@/lib/authStorage'

interface AuthContextValue {
  currentUser: User | null
  token: string | null
  isAuthenticating: boolean
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => void
  /** Refreshes the session's user record after a self-service profile edit (e.g. a name
   * change) so the rest of the app - the header, this context's consumers - reflects it
   * immediately without a re-login. */
  updateCurrentUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const restored = loadStoredSession()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(restored?.user ?? null)
  const [token, setToken] = useState<string | null>(restored?.token ?? null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  async function login(email: string, password: string, remember = false) {
    setIsAuthenticating(true)
    try {
      const result = await apiLogin({ email, password })
      setCurrentUser(result.user)
      setToken(result.token)
      setAuthToken(result.token)
      saveStoredSession({ token: result.token, user: result.user }, remember)
    } finally {
      setIsAuthenticating(false)
    }
  }

  function logout() {
    // Best effort: revoke the token server-side, but never let a network
    // failure keep the user signed in locally. Must go out before the token
    // is cleared below, since the request needs it.
    if (token) apiLogout().catch(() => {})
    setCurrentUser(null)
    setToken(null)
    setAuthToken(null)
    clearStoredSession()
  }

  function updateCurrentUser(user: User) {
    setCurrentUser(user)
    patchStoredUser(user)
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticating,
        login,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

import type { User } from '@/types'

/** Where the session is kept between page loads.
 * - "Remember me" → localStorage: survives a full browser restart.
 * - otherwise    → sessionStorage: survives tab reloads, gone when the tab closes.
 * Every access is wrapped in try/catch: storage throws in private-mode / blocked
 * contexts, and we must still boot (just without a restored session). */

const TOKEN_KEY = 'procapp.token'
const USER_KEY = 'procapp.user'

export interface StoredSession {
  token: string
  user: User
}

function stores(): Storage[] {
  const list: Storage[] = []
  try {
    list.push(window.localStorage)
  } catch {
    /* unavailable */
  }
  try {
    list.push(window.sessionStorage)
  } catch {
    /* unavailable */
  }
  return list
}

/** Reads whichever store the last login wrote to (local wins if both somehow have it). */
export function loadStoredSession(): StoredSession | null {
  for (const store of stores()) {
    try {
      const token = store.getItem(TOKEN_KEY)
      const rawUser = store.getItem(USER_KEY)
      if (token && rawUser) {
        return { token, user: JSON.parse(rawUser) as User }
      }
    } catch {
      /* corrupt or blocked — try the next store */
    }
  }
  return null
}

export function saveStoredSession(session: StoredSession, remember: boolean): void {
  let target: Storage | null = null
  let other: Storage | null = null
  try {
    target = remember ? window.localStorage : window.sessionStorage
    other = remember ? window.sessionStorage : window.localStorage
  } catch {
    return
  }
  try {
    target.setItem(TOKEN_KEY, session.token)
    target.setItem(USER_KEY, JSON.stringify(session.user))
  } catch {
    /* storage full or blocked — session just won't survive a refresh */
  }
  try {
    other.removeItem(TOKEN_KEY)
    other.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
}

/** Keeps the persisted user in sync after a profile edit, without touching the token
 * or moving it between stores. */
export function patchStoredUser(user: User): void {
  for (const store of stores()) {
    try {
      if (store.getItem(TOKEN_KEY)) {
        store.setItem(USER_KEY, JSON.stringify(user))
      }
    } catch {
      /* ignore */
    }
  }
}

export function clearStoredSession(): void {
  for (const store of stores()) {
    try {
      store.removeItem(TOKEN_KEY)
      store.removeItem(USER_KEY)
    } catch {
      /* ignore */
    }
  }
}

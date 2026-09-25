import type { RoleName } from '@/types'
import { useAuth } from './AuthContext'

/** True if the current user holds any of the given roles. No roles passed = any authenticated user.
 * `role.name` is a plain string (custom roles are possible), so the membership check is a safe
 * runtime comparison against the fixed set of gate-worthy names - a custom role name just never
 * matches and grants nothing on its own. */
export function useHasRole(...roles: RoleName[]): boolean {
  const { currentUser } = useAuth()
  if (!currentUser) return false
  if (roles.length === 0) return true
  return currentUser.roles.some((role) => (roles as string[]).includes(role.name))
}

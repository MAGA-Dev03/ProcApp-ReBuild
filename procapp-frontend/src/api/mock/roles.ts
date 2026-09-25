import type { Role } from '@/types'
import { ApiError } from '../apiError'
import { db, nextRoleId } from './db'
import { delay } from './utils'

export async function listRoles(): Promise<Role[]> {
  await delay(100, 250)
  return [...db.roles].sort((a, b) => a.name.localeCompare(b.name))
}

export interface CreateRolePayload {
  name: string
}

/** Lets an admin add a custom role without leaving the Users screen. The new role is immediately
 * assignable to users, but - since permission gating is hardcoded to the well-known role names
 * (see `RoleName`) - it won't unlock any screen access on its own. */
export async function createRole(payload: CreateRolePayload): Promise<Role> {
  await delay()

  const normalized = payload.name.trim()
  if (!normalized) {
    throw new ApiError('Validation failed', 422, { name: 'Role name is required.' })
  }
  const duplicate = db.roles.some((r) => r.name.trim().toLowerCase() === normalized.toLowerCase())
  if (duplicate) {
    throw new ApiError('Validation failed', 422, { name: 'A role with this name already exists.' })
  }

  const role: Role = { id: nextRoleId(), name: normalized }
  db.roles.push(role)
  return role
}

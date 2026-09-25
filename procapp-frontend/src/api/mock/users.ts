import type { Page, PageParams, RoleName, User } from '@/types'
import { ApiError } from '../apiError'
import { db, nextUserId } from './db'
import { delay, paginate, toIsoDate } from './utils'

export interface ListUsersParams extends PageParams {
  role?: RoleName
  active?: boolean
  search?: string
}

export interface CreateUserPayload {
  name: string
  email: string
  /**
   * Accepted for parity with a real create-user form, but this mock has no per-user credential
   * store (login checks a single shared MOCK_PASSWORD - see `auth.ts`), so it is intentionally not
   * persisted anywhere. The real Spring Boot endpoint would hash and store it.
   */
  password: string
  roleIds: number[]
  allProjects: boolean
  /** Ignored when `allProjects` is true. */
  projectIds?: number[]
  active?: boolean
}

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, 'password'>> & {
  /** Blank/omitted = keep the existing password unchanged. */
  password?: string
}

export async function listUsers(params: ListUsersParams = {}): Promise<Page<User>> {
  await delay()

  let results = db.users
  if (params.role) {
    results = results.filter((user) => user.roles.some((role) => role.name === params.role))
  }
  if (params.active !== undefined) {
    results = results.filter((user) => user.active === params.active)
  }
  if (params.search) {
    const search = params.search.toLowerCase()
    results = results.filter(
      (user) =>
        user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search),
    )
  }

  return paginate(results, params)
}

function findUserOrThrow(id: number): User {
  const user = db.users.find((u) => u.id === id)
  if (!user) {
    throw new ApiError(`User ${id} not found`, 404)
  }
  return user
}

export async function getUser(id: number): Promise<User> {
  await delay()
  return findUserOrThrow(id)
}

function assertUniqueEmail(email: string, excludeId?: number): void {
  const normalized = email.trim().toLowerCase()
  const duplicate = db.users.some(
    (u) => u.id !== excludeId && u.email.trim().toLowerCase() === normalized,
  )
  if (duplicate) {
    throw new ApiError('Validation failed', 422, {
      email: 'A user with this email already exists.',
    })
  }
}

function resolveRoles(roleIds: number[]): User['roles'] {
  return roleIds.map((roleId) => {
    const role = db.roles.find((r) => r.id === roleId)
    if (!role) {
      throw new ApiError('Validation failed', 422, { roleIds: 'One or more roles do not exist.' })
    }
    return role
  })
}

/**
 * Resolves the project assignment for a non-`allProjects` user. Deliberately allows an empty
 * array - unlike the old system, which had a bug preventing a user from being saved with zero
 * assigned projects (or zero roles), this mock treats "no projects assigned" as a perfectly valid
 * state rather than rejecting it.
 */
function resolveProjects(projectIds: number[]): User['projects'] {
  return projectIds.map((projectId) => {
    const project = db.projects.find((p) => p.id === projectId)
    if (!project) {
      throw new ApiError('Validation failed', 422, {
        projectIds: 'One or more projects do not exist.',
      })
    }
    return project
  })
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  await delay()

  assertUniqueEmail(payload.email)
  const roles = resolveRoles(payload.roleIds)

  const user: User = {
    id: nextUserId(),
    name: payload.name,
    email: payload.email,
    allProjects: payload.allProjects,
    active: payload.active ?? true,
    createdAt: toIsoDate(new Date()),
    roles,
    projects: payload.allProjects ? undefined : resolveProjects(payload.projectIds ?? []),
  }
  db.users.push(user)
  return user
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
  await delay()

  const user = findUserOrThrow(id)
  if (payload.email !== undefined) {
    assertUniqueEmail(payload.email, id)
  }

  const nextAllProjects = payload.allProjects ?? user.allProjects
  const nextRoles = payload.roleIds !== undefined ? resolveRoles(payload.roleIds) : user.roles
  const nextProjects = nextAllProjects
    ? undefined
    : payload.projectIds !== undefined
      ? resolveProjects(payload.projectIds)
      : user.projects

  const updated: User = {
    ...user,
    name: payload.name ?? user.name,
    email: payload.email ?? user.email,
    active: payload.active ?? user.active,
    allProjects: nextAllProjects,
    roles: nextRoles,
    projects: nextProjects,
  }

  const index = db.users.findIndex((u) => u.id === id)
  db.users[index] = updated
  return updated
}

export interface UpdateOwnProfilePayload {
  name?: string
  /**
   * Accepted for parity with a real change-password form, but - like `CreateUserPayload.password`
   * - this mock has no per-user credential store (login checks a single shared MOCK_PASSWORD; see
   * `auth.ts`), so it is intentionally not persisted. Blank/omitted = keep the existing password.
   */
  password?: string
}

/**
 * Self-service "my profile" update, scoped to exactly the caller's own account. `currentUserId`
 * must come from the authenticated session (the AuthContext's `currentUser.id`) - never from a
 * field on the form itself. The old system's edit-profile form posted a client-supplied hidden
 * `id` input, an IDOR bug: any logged-in user could edit *anyone's* name/password just by changing
 * that hidden field before submitting. This endpoint takes no id in its payload at all, and only
 * touches name/password - never roles/projects/active, which stay admin-only via `updateUser`.
 */
export async function updateOwnProfile(
  currentUserId: number,
  payload: UpdateOwnProfilePayload,
): Promise<User> {
  await delay()

  const user = findUserOrThrow(currentUserId)
  const updated: User = {
    ...user,
    name: payload.name ?? user.name,
  }

  const index = db.users.findIndex((u) => u.id === currentUserId)
  db.users[index] = updated
  return updated
}

/**
 * Blocked, not cascaded: a user who has authored invoices can't be deleted, mirroring a real
 * foreign-key constraint on `invoices.author_user_id`. Deactivate the user instead if they should
 * lose access.
 */
export async function deleteUser(id: number): Promise<void> {
  await delay()

  findUserOrThrow(id)
  const authoredCount = db.invoices.filter((inv) => inv.authorUserId === id).length
  if (authoredCount > 0) {
    throw new ApiError(
      `This user can't be deleted because they authored ${authoredCount} invoice${authoredCount === 1 ? '' : 's'}. Deactivate the user instead to revoke access while preserving invoice history.`,
      409,
    )
  }

  const index = db.users.findIndex((u) => u.id === id)
  db.users.splice(index, 1)
}

import type { Page, PageParams, RoleName, User } from '@/types'
import { http } from './http'

export interface ListUsersParams extends PageParams {
    role?: RoleName
    active?: boolean
    search?: string
}

export interface CreateUserPayload {
    name: string
    email: string
    password: string
    roleIds: number[]
    allProjects: boolean
    projectIds?: number[]
    active?: boolean
}

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, 'password'>> & {
    password?: string
}

export interface UpdateOwnProfilePayload {
    name?: string
    password?: string
}

export async function listUsers(params: ListUsersParams = {}): Promise<Page<User>> {
    const page = await http<Page<User>>('/api/users', {
        params: { search: params.search, page: params.page, size: params.size, sort: params.sort },
    })
    let content = page.content
    if (params.role) {
        content = content.filter((u) => u.roles.some((r) => r.name === params.role))
    }
    if (params.active !== undefined) {
        content = content.filter((u) => u.active === params.active)
    }
    return { ...page, content }
}

/** Every user, walked page by page - for filter dropdowns (e.g. the Audit Log's "Performed by"
 * picker) that need the full list rather than one capped page. */
export async function listAllUsers(): Promise<User[]> {
    const pageSize = 200
    const all: User[] = []
    for (let page = 0; ; page++) {
        const result = await listUsers({ page, size: pageSize, sort: 'name,asc' })
        all.push(...result.content)
        if (page >= result.totalPages - 1 || result.content.length === 0) break
    }
    return all
}

export async function getUser(id: number): Promise<User> {
    return http<User>(`/api/users/${id}`)
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
    return http<User>('/api/users', { method: 'POST', body: payload })
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
    const current = await getUser(id)
    const merged = {
        name: payload.name ?? current.name,
        email: payload.email ?? current.email,
        password: payload.password,
        roleIds: (payload.roleIds ?? current.roles.map((r) => r.id)).filter(
            (v): v is number => v != null,
        ),
        allProjects: payload.allProjects ?? current.allProjects,
        projectIds: (payload.projectIds ?? (current.projects ?? []).map((p) => p.id)).filter(
            (v): v is number => v != null,
        ),
        active: payload.active ?? current.active,
    }
    return http<User>(`/api/users/${id}`, { method: 'PUT', body: merged })
}

export async function updateOwnProfile(
    _currentUserId: number,
    payload: UpdateOwnProfilePayload,

): Promise<User> {
    return http<User>('/api/users/me', { method: 'PUT', body: payload })
}

export async function deleteUser(id: number): Promise<void> {
    await http<void>(`/api/users/${id}`, { method: 'DELETE'})
}

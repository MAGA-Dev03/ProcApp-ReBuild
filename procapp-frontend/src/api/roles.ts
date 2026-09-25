import type { Role } from '@/types'
import { http } from './http'

export interface CreateRolePayload {
    name: string
}

export async function listRoles(): Promise<Role[]> {
    return http<Role[]>('/api/roles')
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
    return http<Role>('/api/roles', { method: 'POST', body: payload })
}
import type { User } from '@/types'
import { http } from './http'

export interface LoginPayload {
    email: string
    password: string
}

export interface LoginResult {
    token: string
    user: User
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
    return http<LoginResult>('/api/auth/login', {method: 'POST', body: payload })
}

/** Revokes every token issued to the current user on the server, so a copied
 * token stops working too — not just the one this browser is about to forget. */
export async function logout(): Promise<void> {
    return http<void>('/api/auth/logout', { method: 'POST' })
}

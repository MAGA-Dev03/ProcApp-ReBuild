import type { User } from '@/types'
import { ApiError } from '../apiError'
import { db } from './db'
import { delay } from './utils'
import { MOCK_PASSWORD } from './testLogins'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResult {
  token: string
  user: User
}

function createFakeToken(user: User): string {
  const payload = { sub: user.id, email: user.email, roles: user.roles.map((role) => role.name) }
  return `mock.${btoa(JSON.stringify(payload))}.${Date.now()}`
}

export async function login({ email, password }: LoginPayload): Promise<LoginResult> {
  await delay()

  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!user || !user.active || password !== MOCK_PASSWORD) {
    throw new ApiError('Invalid email or password', 401)
  }

  return { token: createFakeToken(user), user }
}

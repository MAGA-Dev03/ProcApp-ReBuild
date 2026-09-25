import type { RoleName } from '../../types/role.ts'

/** Shared demo password for every seeded user - this is a mock backend, not a security boundary. */
export const MOCK_PASSWORD = 'Password123!'

export interface TestLogin {
  email: string
  roles: RoleName[]
  note?: string
}

/** One login per role, plus a multi-role example, covering the currently-seeded active users. */
export const TEST_LOGINS: TestLogin[] = [
  { email: 'anushka.perera@maga.lk', roles: ['ADMIN'] },
  { email: 'priyanka.jayawardena@maga.lk', roles: ['PROCUREMENT'] },
  {
    email: 'nadeesha.silva@maga.lk',
    roles: ['PROCUREMENT', 'PROCUREMENT_MANAGER'],
    note: 'multi-role',
  },
  { email: 'kasun.rathnayake@maga.lk', roles: ['PROCUREMENT_MANAGER'] },
  { email: 'ruwan.fernando@maga.lk', roles: ['SENIOR_MANAGER'] },
  { email: 'chamari.gunawardena@maga.lk', roles: ['REPORT_USER'] },
  { email: 'sunil.bandara@maga.lk', roles: ['SITE_STORE_KEEPER'] },
  {
    email: 'superadmin@maga.lk',
    roles: [
      'ADMIN',
      'PROCUREMENT',
      'PROCUREMENT_MANAGER',
      'REPORT_USER',
      'SITE_STORE_KEEPER',
      'SENIOR_MANAGER',
    ],
    note: 'TEST ONLY - all roles combined for demo/QA, not a real role combination',
  },
]

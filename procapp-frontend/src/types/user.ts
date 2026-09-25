import type { Role } from './role'
import type { Project } from './project'

export interface User {
  id: number
  name: string
  email: string
  /** True if the user can act on every project, bypassing the UserProject join table. */
  allProjects: boolean
  active: boolean
  createdAt: string
  /** Resolved from the UserRole join table. */
  roles: Role[]
  /** Resolved from the UserProject join table; only meaningful when allProjects is false. */
  projects?: Project[]
}

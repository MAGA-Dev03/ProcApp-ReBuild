import type { Invoice, Project, Role, Supplier, User } from '@/types'
import { buildInvoices, buildProjects, buildRoles, buildSuppliers, buildUsers } from './seedData'
import { randomInt } from './utils'

/**
 * Plain in-memory "database" held in module scope. It is seeded once when this module is first
 * imported and mutated in place by the mock endpoint functions - there is no persistence to
 * localStorage or disk, so a full page reload resets it back to the seed data.
 */
export interface MockDb {
  roles: Role[]
  users: User[]
  projects: Project[]
  suppliers: Supplier[]
  invoices: Invoice[]
}

function seed(): MockDb {
  const roles = buildRoles()
  const users = buildUsers(roles)
  const projects = buildProjects()
  const suppliers = buildSuppliers()

  for (const user of users) {
    if (!user.allProjects) {
      const shuffled = [...projects].sort(() => Math.random() - 0.5)
      user.projects = shuffled.slice(0, randomInt(2, 4))
    }
  }

  const invoices = buildInvoices(projects, suppliers, users)

  return { roles, users, projects, suppliers, invoices }
}

export const db: MockDb = seed()

let invoiceIdSeq = db.invoices.length + 1
export function nextInvoiceId(): number {
  return invoiceIdSeq++
}

let projectIdSeq = db.projects.length + 1
export function nextProjectId(): number {
  return projectIdSeq++
}

let supplierIdSeq = db.suppliers.length + 1
export function nextSupplierId(): number {
  return supplierIdSeq++
}

let userIdSeq = db.users.length + 1
export function nextUserId(): number {
  return userIdSeq++
}

let roleIdSeq = db.roles.length + 1
export function nextRoleId(): number {
  return roleIdSeq++
}

export function seedSummary() {
  return {
    roles: db.roles.length,
    users: db.users.length,
    projects: db.projects.length,
    suppliers: db.suppliers.length,
    invoices: db.invoices.length,
    invoicesByStatus: {
      open: db.invoices.filter((inv) => inv.active && !inv.grnNumber).length,
      grnOnly: db.invoices.filter((inv) => inv.active && inv.grnNumber && !inv.listNo).length,
      submitted: db.invoices.filter((inv) => inv.active && inv.listNo).length,
      inactive: db.invoices.filter((inv) => !inv.active).length,
    },
  }
}

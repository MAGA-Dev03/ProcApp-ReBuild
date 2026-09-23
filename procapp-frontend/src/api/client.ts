/**
 * Domain-level API facade consumed by features. Every function here currently delegates to the
 * in-memory mock backend in `src/api/mock/`. This file is the single swap point for the real
 * Spring Boot API: once that's ready, replace each re-export below with a function that calls
 * `http` (see `src/api/http.ts`) against the matching REST endpoint. Signatures and return shapes
 * (e.g. `Page<T>`) are already modeled on the real API, so feature code won't need to change.
 */
export {
  getAgingBuckets,
  getAgingBucketBreakdown,
  getTopSuppliersByPayable,
  getReceivedVsSubmittedTrend,
  getDashboardSummary,
  getAverageCycleTimeDays,
  getMonthlyInvoiceVolume,
  getRecentFinanceBatches,
} from './dashboard'

// Dev-only seed helper - stays on the mock db, it has no real-backend equivalent.
export { seedSummary } from './mock'

export {
  listUsers,
  listAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateOwnProfile,
} from './users'

export {
  listRoles,
  createRole,
} from './roles'  

export {
  listProjects,
  listAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectDeleteImpact,
} from './projects'

export {
  listSuppliers,
  listAllSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from './suppliers'

export {
  listInvoices,
  listInvoicesForSiteKeeper,
  markAttachmentViewed,
  uploadInvoiceAttachment,
  downloadInvoiceAttachment,
  downloadSiteKeeperAttachment,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  cancelInvoice,
  activateInvoice,
  clearFinanceSubmission,
  recordGrn,
  batchAddToFinance,
  checkDuplicateInvoiceNumber,
  getDistinctListNumbers,
} from './invoices'

export { login } from './auth'

export { listInvoiceAuditLog } from './auditLog'
export type { ListAuditLogParams } from './auditLog'

export type {
  ListInvoicesParams,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  RecordGrnPayload,
  BatchAddToFinancePayload,
  DuplicateInvoiceCheckResult,
} from './mock/invoices'
export type {
  ListProjectsParams,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectDeleteImpact,
} from './mock/projects'
export type {
  ListSuppliersParams,
  CreateSupplierPayload,
  UpdateSupplierPayload,
} from './mock/suppliers'
export type {
  ListUsersParams,
  CreateUserPayload,
  UpdateUserPayload,
  UpdateOwnProfilePayload,
} from './mock/users'
export type { CreateRolePayload } from './mock/roles'
export type { LoginPayload, LoginResult } from './mock/auth'
export type {
  AgingBucketKey,
  AgingBucket,
  AgingBreakdownRow,
  AgingBucketBreakdown,
  TopSupplier,
  TrendPoint,
  DashboardSummary,
  CycleTimeStats,
  MonthlyInvoiceVolume,
  FinanceBatchSummary,
} from './dashboard'

export { ApiError } from './apiError'

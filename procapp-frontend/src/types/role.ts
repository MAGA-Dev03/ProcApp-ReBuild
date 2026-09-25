export const ROLE_NAMES = [
  'ADMIN',
  'SYSTEM_ADMIN',
  'PROCUREMENT',
  'REPORT_USER',
  'SITE_STORE_KEEPER',
  'SENIOR_MANAGER',
  'PROCUREMENT_MANAGER',
] as const

export type RoleName = (typeof ROLE_NAMES)[number]

/**
 * `name` is a plain string, not `RoleName`: admins can create custom roles at runtime (see the
 * Users screen's "Add new role" quick action), so the set of roles that actually exist is
 * data-driven, not limited to the built-in list above. `RoleName` remains the type used for
 * *permission gating* (route tables, `useHasRole`) since every gated capability in this app is
 * hardcoded to one of the well-known names - a custom role can be assigned to a user but won't by
 * itself unlock any screen unless a built-in role is also assigned.
 */
export interface Role {
  id: number
  name: string
}

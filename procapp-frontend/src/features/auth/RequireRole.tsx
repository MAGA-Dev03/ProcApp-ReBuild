import type { ReactNode } from 'react'
import type { RoleName } from '@/types'
import { useHasRole } from './useHasRole'

interface RequireRoleProps {
  /** Any of these roles grants access. Omit/empty to allow any authenticated user. */
  roles?: RoleName[]
  children: ReactNode
}

export function RequireRole({ roles = [], children }: RequireRoleProps) {
  const allowed = useHasRole(...roles)

  if (!allowed) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        You don&apos;t have permission to view this page.
      </div>
    )
  }

  return <>{children}</>
}

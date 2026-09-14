import type { SortingState } from '@tanstack/react-table'

/** Converts the DataTable's sorting state into Spring Data's `sort=field,direction` query param. */
export function toSortParam(sorting: SortingState): string | undefined {
  const [first] = sorting
  if (!first) return undefined
  return `${first.id},${first.desc ? 'desc' : 'asc'}`
}

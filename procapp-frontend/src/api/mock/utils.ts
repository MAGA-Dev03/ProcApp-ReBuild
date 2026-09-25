import type { Page, PageParams } from '@/types'
import { ApiError } from '../apiError'

/** Simulates network latency for a mock endpoint. */
export function delay(minMs = 300, maxMs = 600): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Randomly throws a validation-style ApiError so error-handling UI has something to catch. */
export function maybeFail(
  probability: number,
  message: string,
  fieldErrors?: Record<string, string>,
): void {
  if (Math.random() < probability) {
    throw new ApiError(message, 422, fieldErrors)
  }
}

export function paginate<T>(items: T[], params: PageParams = {}): Page<T> {
  const page = params.page ?? 0
  const size = params.size ?? 20
  const totalElements = items.length
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const start = page * size
  const content = items.slice(start, start + size)
  return { content, page, size, totalElements, totalPages }
}

export function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

export function randomItem<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)]
}

export function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

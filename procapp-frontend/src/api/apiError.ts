export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(message: string, status = 400, fieldErrors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

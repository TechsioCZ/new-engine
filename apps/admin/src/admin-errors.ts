export type ApiError = Error & {
  status?: number
}

export function createApiError(message: string, status?: number) {
  const error = new Error(message) as ApiError
  error.status = status

  return error
}

export function isAuthError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as ApiError).status === 401
  )
}

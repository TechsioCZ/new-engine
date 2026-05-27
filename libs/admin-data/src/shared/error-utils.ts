type ErrorLikeMessage = { message?: unknown }
type ErrorLikeStatus = { status?: unknown }

const hasStringMessage = (error: unknown): error is { message: string } =>
  Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as ErrorLikeMessage).message === "string"
  )

const hasNumberStatus = (error: unknown): error is { status: number } =>
  Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      typeof (error as ErrorLikeStatus).status === "number"
  )

export class AdminApiError extends Error {
  readonly payload: unknown
  readonly status: number

  constructor(message: string, status: number, payload?: unknown) {
    super(message)
    this.name = "AdminApiError"
    this.payload = payload
    this.status = status
  }
}

export const toErrorMessage = (error: unknown): string | null => {
  if (!error) {
    return null
  }

  if (error instanceof Error) {
    return error.message
  }

  if (hasStringMessage(error)) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  const serialized = String(error)
  return serialized === "[object Object]" ? null : serialized
}

export const toErrorMessageWithFallback = (
  error: unknown,
  fallback: string
): string => toErrorMessage(error) ?? fallback

export const toErrorWithStatus = (
  error: unknown,
  fallback: string
): { message: string; status?: number } => {
  const message = toErrorMessage(error)

  if (hasNumberStatus(error)) {
    return {
      message: message ?? fallback,
      status: error.status,
    }
  }

  return { message: message ?? fallback }
}

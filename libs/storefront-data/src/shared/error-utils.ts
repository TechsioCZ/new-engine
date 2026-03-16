type ErrorLikeMessage = { message?: unknown }
type ErrorLikeCode = { code?: unknown }

const hasStringMessage = (error: unknown): error is { message: string } =>
  Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as ErrorLikeMessage).message === "string"
  )

const hasStringCode = (error: unknown): error is { code: string } =>
  Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as ErrorLikeCode).code === "string"
  )

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

export const toErrorWithCode = (
  error: unknown,
  fallback: string
): { message: string; code?: string } => {
  const message = toErrorMessage(error)
  if (hasStringCode(error)) {
    return {
      message: message ?? fallback,
      code: error.code,
    }
  }

  return { message: message ?? fallback }
}

export type ErrorWithStage<TStage extends string> = {
  stage: TStage
  message: string
  cause?: unknown
}

export const createErrorWithStage = <TStage extends string>(
  stage: TStage,
  fallback: string,
  cause?: unknown
): ErrorWithStage<TStage> => ({
  stage,
  message: toErrorMessageWithFallback(cause, fallback),
  cause,
})
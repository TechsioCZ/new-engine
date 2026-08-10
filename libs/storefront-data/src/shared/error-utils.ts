const hasStringMessage = (error: unknown): error is { message: string } =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof error.message === "string"

const hasStringCode = (error: unknown): error is { code: string } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string"

export const toErrorMessage = (error: unknown): string | null => {
  if (error === null || error === undefined) {
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

  if (
    typeof error === "number" ||
    typeof error === "bigint" ||
    typeof error === "boolean"
  ) {
    return String(error)
  }

  return null
}

export const toErrorMessageWithFallback = (
  error: unknown,
  fallback: string,
): string => toErrorMessage(error) ?? fallback

export const toErrorWithCode = (
  error: unknown,
  fallback: string,
): { message: string; code?: string } => {
  const message = toErrorMessage(error)
  if (hasStringCode(error)) {
    return {
      code: error.code,
      message: message ?? fallback,
    }
  }

  return { message: message ?? fallback }
}

export interface ErrorWithStage<TStage extends string> extends Error {
  readonly stage: TStage
  readonly cause?: unknown
}

class StorefrontStageError<TStage extends string>
  extends Error
  implements ErrorWithStage<TStage>
{
  readonly stage: TStage
  override readonly cause?: unknown

  constructor(stage: TStage, fallback: string, cause?: unknown) {
    super(toErrorMessageWithFallback(cause, fallback))
    this.name = "StorefrontStageError"
    this.stage = stage
    if (cause !== undefined) {
      this.cause = cause
    }
  }
}

export const createErrorWithStage = <TStage extends string>(
  stage: TStage,
  fallback: string,
  cause?: unknown,
): ErrorWithStage<TStage> => new StorefrontStageError(stage, fallback, cause)

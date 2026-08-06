const isError = (error: unknown): error is Error => error instanceof Error

export const resolveErrorMessage = (error: unknown): string => {
  if (isError(error)) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return "An unknown error occurred"
}

export const resolveErrorStatus = (error: unknown): number | null => {
  if (error === null || typeof error !== "object") {
    return null
  }
  if ("status" in error && typeof error.status === "number") {
    return error.status
  }
  if (!("response" in error)) {
    return null
  }

  const { response } = error
  if (response === null || typeof response !== "object") {
    return null
  }
  if (!("status" in response) || typeof response.status !== "number") {
    return null
  }
  return response.status
}

export const isNotFoundError = (error: unknown): boolean =>
  resolveErrorStatus(error) === 404

export const logError = (context: string, error: unknown): void => {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}]`, error)
  }
}

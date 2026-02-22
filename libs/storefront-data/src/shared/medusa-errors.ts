export const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined
  }

  const err = error as {
    status?: number
    response?: { status?: number }
  }

  return err.status ?? err.response?.status
}

export const isAuthError = (error: unknown): boolean => {
  const status = getErrorStatus(error)
  return status === 401 || status === 403
}

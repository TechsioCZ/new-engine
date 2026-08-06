const readStatus = (value: unknown): number | undefined => {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return undefined
  }
  return typeof value.status === "number" ? value.status : undefined
}

export const getErrorStatus = (error: unknown): number | undefined => {
  const directStatus = readStatus(error)
  if (directStatus !== undefined) {
    return directStatus
  }
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined
  }
  return readStatus(error.response)
}

export const isAuthError = (error: unknown): boolean => {
  const status = getErrorStatus(error)
  return status === 401 || status === 403
}

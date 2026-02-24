export const toErrorMessage = (error: unknown): string | null => {
  if (!error) {
    return null
  }

  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

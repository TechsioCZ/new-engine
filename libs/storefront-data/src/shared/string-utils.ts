export const hasTrimmedString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

export const normalizeTrimmedString = (value: unknown): string | undefined => {
  if (!hasTrimmedString(value)) {
    return
  }

  return value.trim()
}

export const normalizeCountryCode = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  return normalized.length === 2 ? normalized : undefined
}

export function normalizeCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return
  }

  const normalized = value.trim().toLowerCase()

  return normalized.length === 2 ? normalized : undefined
}

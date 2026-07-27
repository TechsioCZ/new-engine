export const DEFAULT_TURNSTILE_TOKEN_FIELDS = [
  "cf-turnstile-response",
  "turnstile_token",
  "turnstileToken",
] as const

export function normalizeTurnstileToken(
  body: unknown,
  tokenFields: readonly string[]
): string | undefined {
  if (!body || typeof body !== "object") {
    return
  }

  const record = body as Record<string, unknown>

  for (const field of tokenFields) {
    const value = record[field]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  return
}

export function normalizeTurnstileSecret(value: string | undefined) {
  const normalized = value?.trim()

  return normalized || undefined
}

export function normalizeTurnstileEnabled(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase()

  return normalized === "1" || normalized === "true"
}

export function normalizeTurnstileAllowedHostnames(
  value: string | undefined
): string[] {
  return (value ?? "")
    .split(",")
    .map((hostname) => hostname.trim())
    .filter(Boolean)
}

export function normalizeForwardedIpHeader(
  value: string | string[] | undefined
): string | undefined {
  const forwardedFor = Array.isArray(value) ? value[0] : value
  const forwardedIp = forwardedFor?.split(",")[0]?.trim()

  return forwardedIp || undefined
}

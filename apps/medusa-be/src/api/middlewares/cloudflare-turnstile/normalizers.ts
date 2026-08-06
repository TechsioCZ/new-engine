export const DEFAULT_TURNSTILE_TOKEN_FIELDS = [
  "cf-turnstile-response",
  "turnstile_token",
  "turnstileToken",
] as const

const isTurnstileBodyObjectLike = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

export const normalizeTurnstileToken = (
  body: unknown,
  tokenFields: readonly string[],
): string | undefined => {
  if (!isTurnstileBodyObjectLike(body)) {
    return undefined
  }

  for (const field of tokenFields) {
    const value = body[field]
    if (typeof value === "string") {
      const normalized = value.trim()
      if (normalized.length > 0) {
        return normalized
      }
    }
  }

  return undefined
}

export const normalizeTurnstileSecret = (value: string | undefined) => {
  const normalized = value?.trim()
  return normalized === undefined || normalized.length === 0
    ? undefined
    : normalized
}

export const normalizeTurnstileEnabled = (
  value: string | undefined,
): boolean => {
  const normalized = value?.trim().toLowerCase()
  return normalized === "1" || normalized === "true"
}

export const normalizeTurnstileAllowedHostnames = (
  value: string | undefined,
): string[] =>
  (value ?? "")
    .split(",")
    .map((hostname) => hostname.trim())
    .filter((hostname) => hostname.length > 0)

export const normalizeForwardedIpHeader = (
  value: string | string[] | undefined,
): string | undefined => {
  const forwardedFor = Array.isArray(value) ? value[0] : value
  const forwardedIp = forwardedFor?.split(",")[0]?.trim()
  return forwardedIp === undefined || forwardedIp.length === 0
    ? undefined
    : forwardedIp
}

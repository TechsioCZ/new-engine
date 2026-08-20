/** Read an environment variable value if set. */
export function getEnv(envVar: string): string | undefined
export function getEnv(envVar: string, required: true): string
export function getEnv(envVar: string, required = false): string | undefined {
  const value = process.env[envVar]
  if (required && (!value || value.trim() === "")) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }

  return value
}

/** Read an environment variable value, treating "null"/"undefined" as unset. */
export const getEnvString = (envVar: string): string | null => {
  const value = getEnv(envVar)
  if (!value || value === "null" || value === "undefined") {
    return null
  }
  return value
}

/** Normalize a boolean-ish environment string. */
const normalize = (value: string): string => value.toLowerCase().trim()

/** Check whether a feature flag environment variable is enabled. */
export const isEnabled = (envVar: string, defaultValue = true): boolean => {
  const raw = getEnv(envVar)
  if (raw === undefined || normalize(raw) === "") {
    return defaultValue
  }

  return !["0", "false", "no", "off"].includes(normalize(raw))
}

/** Parse a comma-delimited environment variable into a list. */
export const parseEnvList = (envVar: string): string[] => {
  const raw = getEnv(envVar)
  return raw
    ? raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

export const resolveEnvLocales = (
  envVar = "PAYLOAD_LOCALES",
  fallbackLocales: string[] = ["en"]
): { locales: string[]; defaultLocale: string } => {
  const envLocales = parseEnvList(envVar)
  const fallback = fallbackLocales.filter(Boolean)
  const locales = envLocales.length > 0 ? envLocales : fallback
  const resolvedLocales = locales.length > 0 ? locales : ["en"]

  return {
    locales: resolvedLocales,
    defaultLocale: resolvedLocales[0],
  }
}

export const resolveExactEnvLocales = (
  envVar: string,
  expectedLocales: readonly string[]
): { locales: string[]; defaultLocale: string } => {
  if (
    expectedLocales.length === 0 ||
    new Set(expectedLocales).size !== expectedLocales.length
  ) {
    throw new Error("Expected locales must be a non-empty unique list")
  }
  const resolved = resolveEnvLocales(envVar, [...expectedLocales])
  const expected = new Set(expectedLocales)
  if (
    resolved.locales.length !== expectedLocales.length ||
    new Set(resolved.locales).size !== resolved.locales.length ||
    resolved.locales.some((locale) => !expected.has(locale))
  ) {
    throw new Error(
      `${envVar} must contain exactly these locales: ${expectedLocales.join(",")}`
    )
  }
  return resolved
}

/** Normalize arbitrary values to a string for SEO field generation. */
export const getDocString = (value: unknown): string =>
  typeof value === "string" ? value : ""

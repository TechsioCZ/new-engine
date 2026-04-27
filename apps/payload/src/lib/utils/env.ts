/** Read an environment variable value if set. */
export function getEnv(envVar: string): string | undefined
export function getEnv(envVar: string, required: true): string
export function getEnv(envVar: string, required = false): string | undefined {
  const value = process.env[envVar]
  if (required && (!value || value.trim() === '')) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }

  return value
}

/** Read an environment variable value, treating "null"/"undefined" as unset. */
export const getEnvString = (envVar: string): string | null => {
  const value = getEnv(envVar)
  if (!value || value === 'null' || value === 'undefined') {
    return null
  }
  return value
}

/** Normalize a boolean-ish environment string. */
const normalize = (value: string): string => value.toLowerCase().trim()

/** Check whether a feature flag environment variable is enabled. */
export const isEnabled = (envVar: string, defaultValue = true): boolean => {
  const raw = getEnv(envVar)
  if (raw === undefined || normalize(raw) === '') {
    return defaultValue
  }

  return !['0', 'false', 'no', 'off'].includes(normalize(raw))
}

/** Parse a comma-delimited environment variable into a list. */
export const parseEnvList = (envVar: string): string[] => {
  const raw = getEnv(envVar)
  return raw ? raw.split(',').map((item) => item.trim()).filter(Boolean) : []
}

/** Normalize arbitrary values to a string for SEO field generation. */
export const getDocString = (value: unknown): string =>
  typeof value === 'string' ? value : ''

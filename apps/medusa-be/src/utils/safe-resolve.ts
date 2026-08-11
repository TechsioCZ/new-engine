/**
 * Resolve an optional dependency from an Awilix-style container.
 *
 * Some container proxies throw when a key is unregistered, so optional
 * dependencies must treat resolution failures the same as missing values.
 */
export const safeResolve = <T>(container: object, key: string): T | null => {
  try {
    const value = (container as Record<string, unknown>)[key]
    return value !== undefined && value !== null ? (value as T) : null
  } catch {
    return null
  }
}

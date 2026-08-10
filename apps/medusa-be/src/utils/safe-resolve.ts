import { getRecordValue, isRecord } from "@techsio/std/object"

/**
 * Resolve an optional dependency from an Awilix-style container.
 *
 * Some container proxies throw when a key is unregistered, so optional
 * dependencies treat resolution failures and invalid registrations as missing.
 */
export const safeResolve = <T>(
  container: unknown,
  key: string,
  isT: (value: unknown) => value is T,
): T | null => {
  try {
    if (!isRecord(container)) {
      return null
    }

    const value = getRecordValue(container, key)
    return isT(value) ? value : null
  } catch {
    return null
  }
}

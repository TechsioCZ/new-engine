/**
 * Resolve an optional dependency from an Awilix-style container.
 *
 * Some container proxies throw when a key is unregistered, so optional
 * dependencies must treat resolution failures the same as missing values.
 */
export const safeResolve = <T>(container: object, key: string): T | null => {
  let injectedDependency: unknown = null

  try {
    injectedDependency = (container as Record<string, unknown>)[key]
  } catch {
    injectedDependency = null
  }

  if (injectedDependency !== undefined && injectedDependency !== null) {
    return injectedDependency as T
  }

  try {
    const resolve = (
      container as { resolve?: (registrationName: string) => unknown }
    ).resolve
    if (typeof resolve === "function") {
      const value = resolve.call(container, key)
      return value !== undefined && value !== null ? (value as T) : null
    }
  } catch {
    return null
  }

  return null
}

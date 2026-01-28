export type QueryKey = readonly unknown[]

export type QueryNamespace = string | readonly string[]

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const normalizeNamespace = (namespace: QueryNamespace): readonly string[] => {
  if (typeof namespace === "string") {
    return [namespace]
  }
  return namespace
}

const stableValue = (value: unknown, visited: WeakSet<object>): unknown => {
  if (Array.isArray(value)) {
    if (visited.has(value)) {
      throw new Error("QueryKey contains a circular reference")
    }
    visited.add(value)
    const result = value.map((entry) => stableValue(entry, visited))
    visited.delete(value)
    return result
  }
  if (isPlainObject(value)) {
    if (visited.has(value)) {
      throw new Error("QueryKey contains a circular reference")
    }
    visited.add(value)
    const entries = Object.entries(value).sort(([a], [b]) =>
      a.localeCompare(b)
    )
    const result: Record<string, unknown> = {}
    for (const [key, entryValue] of entries) {
      result[key] = stableValue(entryValue, visited)
    }
    visited.delete(value)
    return result
  }
  return value
}

export function createQueryKey(
  namespace: QueryNamespace,
  ...parts: readonly unknown[]
): QueryKey {
  const scope = normalizeNamespace(namespace)
  const visited = new WeakSet<object>()
  return [...scope, ...parts.map((part) => stableValue(part, visited))]
}

export function createQueryKeyFactory(namespace: QueryNamespace) {
  const scope = normalizeNamespace(namespace)
  return {
    scope,
    key: (...parts: readonly unknown[]) => createQueryKey(scope, ...parts),
  }
}

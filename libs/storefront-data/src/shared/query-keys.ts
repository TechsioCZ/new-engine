export type QueryKey = readonly unknown[]

export type QueryNamespace = string | readonly string[]
export type NormalizeQueryKeyParamsOptions = {
  omitKeys?: readonly string[]
}

type WalkValueOptions = {
  omitKeys?: ReadonlySet<string>
  stripUndefined?: boolean
}

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

const walkValue = (
  value: unknown,
  visited: WeakSet<object>,
  options?: WalkValueOptions
): unknown => {
  if (Array.isArray(value)) {
    if (visited.has(value)) {
      throw new Error("QueryKey contains a circular reference")
    }
    visited.add(value)
    const result = value
      .map((entry) => walkValue(entry, visited, options))
      .filter((entry) => !options?.stripUndefined || entry !== undefined)
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
      if (options?.omitKeys?.has(key)) {
        continue
      }

      const normalizedEntry = walkValue(entryValue, visited, options)
      if (options?.stripUndefined && normalizedEntry === undefined) {
        continue
      }

      result[key] = normalizedEntry
    }
    visited.delete(value)
    return result
  }

  return value
}

/**
 * Normalizes object-like query params before putting them into query keys.
 *
 * - Removes `undefined` values recursively
 * - Removes keys listed in `omitKeys` (for non-cache-affecting flags like `enabled`)
 * - Sorts object keys for stable hashing
 */
export function normalizeQueryKeyParams<TParams extends Record<string, unknown>>(
  params: TParams,
  options?: NormalizeQueryKeyParamsOptions
): Record<string, unknown> {
  if (!isPlainObject(params)) {
    throw new Error(
      "QueryKey params must be a plain object. Use a serializer before normalizeQueryKeyParams."
    )
  }
  const visited = new WeakSet<object>()
  const omitKeys = new Set(options?.omitKeys ?? [])
  const normalized = walkValue(params, visited, {
    omitKeys,
    stripUndefined: true,
  })
  if (isPlainObject(normalized)) {
    return normalized
  }
  return {}
}

/**
 * Safe normalization for query-key parts used by hook factories.
 *
 * - Plain objects are normalized via `normalizeQueryKeyParams`
 * - `undefined` maps to `{}` for stable optional key parts
 * - Other values are passed through the stable serializer
 */
export function normalizeQueryKeyPart(
  value: unknown,
  options?: NormalizeQueryKeyParamsOptions
): unknown {
  if (value === undefined) {
    return {}
  }
  if (isPlainObject(value)) {
    return normalizeQueryKeyParams(value, options)
  }
  return walkValue(value, new WeakSet<object>())
}

export function createQueryKey(
  namespace: QueryNamespace,
  ...parts: readonly unknown[]
): QueryKey {
  const scope = normalizeNamespace(namespace)
  const visited = new WeakSet<object>()
  return [...scope, ...parts.map((part) => walkValue(part, visited))]
}

export function createDomainQueryKeys<TListParams, TDetailParams>(
  namespace: QueryNamespace,
  domain: string
): {
  all: () => QueryKey
  list: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
} {
  return {
    all: () => createQueryKey(namespace, domain),
    list: (params) =>
      createQueryKey(
        namespace,
        domain,
        "list",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    detail: (params) =>
      createQueryKey(
        namespace,
        domain,
        "detail",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}

export function createQueryKeyFactory(namespace: QueryNamespace) {
  const scope = normalizeNamespace(namespace)
  return {
    scope,
    key: (...parts: readonly unknown[]) => createQueryKey(scope, ...parts),
  }
}

import { getRecordValue, toPlainRecord } from "@techsio/std/object"

import { getSortedRecordKeys } from "./query-key-match-utils"

export type QueryKey = readonly unknown[]

export type QueryNamespace = string | readonly string[]
export interface NormalizeQueryKeyParamsOptions {
  omitKeys?: readonly string[]
}

interface WalkValueOptions {
  omitKeys?: ReadonlySet<string>
  stripUndefined?: boolean
}

const toPlainObject = (value: unknown) => {
  const record = toPlainRecord(value)
  if (record === undefined) {
    return record
  }
  const prototype = Reflect.getPrototypeOf(record)
  return prototype === Object.prototype || prototype === null
    ? record
    : undefined
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
  options?: WalkValueOptions,
): unknown => {
  if (Array.isArray(value)) {
    if (visited.has(value)) {
      throw new Error("QueryKey contains a circular reference")
    }
    visited.add(value)
    const result: unknown[] = []
    for (const entry of value) {
      const normalizedEntry = walkValue(entry, visited, options)
      if (options?.stripUndefined !== true || normalizedEntry !== undefined) {
        result.push(normalizedEntry)
      }
    }
    visited.delete(value)
    return result
  }

  const plainObject = toPlainObject(value)
  if (plainObject !== undefined) {
    if (visited.has(plainObject)) {
      throw new Error("QueryKey contains a circular reference")
    }
    visited.add(plainObject)
    const entries: [string, unknown][] = []
    for (const key of getSortedRecordKeys(plainObject)) {
      if (options?.omitKeys?.has(key) !== true) {
        const normalizedEntry = walkValue(
          getRecordValue(plainObject, key),
          visited,
          options,
        )
        if (options?.stripUndefined !== true || normalizedEntry !== undefined) {
          entries.push([key, normalizedEntry])
        }
      }
    }
    visited.delete(plainObject)
    return Object.fromEntries(entries)
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
export const normalizeQueryKeyParams = (
  params: object,
  options?: NormalizeQueryKeyParamsOptions,
) => {
  const plainObject = toPlainObject(params)
  if (plainObject === undefined) {
    throw new Error(
      "QueryKey params must be a plain object. Use a serializer before normalizeQueryKeyParams.",
    )
  }
  const visited = new WeakSet()
  const omitKeys = new Set(options?.omitKeys)
  const normalized = walkValue(plainObject, visited, {
    omitKeys,
    stripUndefined: true,
  })
  const normalizedObject = toPlainObject(normalized)
  if (normalizedObject !== undefined) {
    return normalizedObject
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
export const normalizeQueryKeyPart = (
  value: unknown,
  options?: NormalizeQueryKeyParamsOptions,
): unknown => {
  if (value === undefined) {
    return {}
  }
  const plainObject = toPlainObject(value)
  if (plainObject !== undefined) {
    return normalizeQueryKeyParams(plainObject, options)
  }
  return walkValue(value, new WeakSet())
}

export const createQueryKey = (
  namespace: QueryNamespace,
  ...parts: readonly unknown[]
): QueryKey => {
  const scope = normalizeNamespace(namespace)
  const visited = new WeakSet()
  return [...scope, ...parts.map((part) => walkValue(part, visited))]
}

export const appendQueryKey = (
  base: QueryKey,
  ...parts: readonly unknown[]
): QueryKey => {
  const visited = new WeakSet()
  return [...base, ...parts.map((part) => walkValue(part, visited))]
}

export const createDomainQueryKeys = (
  namespace: QueryNamespace,
  domain: string,
): {
  all: () => QueryKey
  list: (params: unknown) => QueryKey
  detail: (params: unknown) => QueryKey
} => ({
  all: () => createQueryKey(namespace, domain),
  detail: (params) =>
    createQueryKey(
      namespace,
      domain,
      "detail",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
  list: (params) =>
    createQueryKey(
      namespace,
      domain,
      "list",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
})

export const createQueryKeyFactory = (namespace: QueryNamespace) => ({
  key: (...parts: readonly unknown[]) => createQueryKey(namespace, ...parts),
  scope: normalizeNamespace(namespace),
})

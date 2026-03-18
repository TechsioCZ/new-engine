import { isPlainRecord } from "./object-utils"
import type { QueryKey } from "./query-keys"

export const areQueryKeySegmentsEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((entry, index) => areQueryKeySegmentsEqual(entry, right[index]))
    )
  }

  if (isPlainRecord(left) && isPlainRecord(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => areQueryKeySegmentsEqual(left[key], right[key]))
    )
  }

  return false
}

export const getSortedRecordKeys = (
  ...records: readonly Record<string, unknown>[]
): string[] =>
  Array.from(new Set(records.flatMap((record) => Object.keys(record)))).sort()

export const hasQueryKeyPrefix = (
  queryKey: QueryKey,
  prefix: QueryKey
): boolean => prefix.every((segment, index) => queryKey[index] === segment)

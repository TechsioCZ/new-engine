import { getRecordValue, isRecord as isPlainRecord } from "@techsio/std/object"

import type { QueryKey } from "./query-keys"

export const areQueryKeySegmentsEqual = (
  left: unknown,
  right: unknown,
): boolean => {
  if (Object.is(left, right)) {
    return true
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((entry, index) =>
        areQueryKeySegmentsEqual(entry, right[index]),
      )
    )
  }

  if (isPlainRecord(left) && isPlainRecord(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) =>
        areQueryKeySegmentsEqual(
          getRecordValue(left, key),
          getRecordValue(right, key),
        ),
      )
    )
  }

  return false
}

export const getSortedRecordKeys = (
  ...records: readonly object[]
): string[] => {
  const sortedKeys: string[] = []
  const seenKeys = new Set<string>()
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (seenKeys.has(key)) {
        continue
      }
      seenKeys.add(key)
      const insertionIndex = sortedKeys.findIndex(
        (sortedKey) => sortedKey.localeCompare(key) > 0,
      )
      if (insertionIndex === -1) {
        sortedKeys.push(key)
      } else {
        sortedKeys.splice(insertionIndex, 0, key)
      }
    }
  }
  return sortedKeys
}

export const hasQueryKeyPrefix = (
  queryKey: QueryKey,
  prefix: QueryKey,
): boolean => prefix.every((segment, index) => queryKey[index] === segment)

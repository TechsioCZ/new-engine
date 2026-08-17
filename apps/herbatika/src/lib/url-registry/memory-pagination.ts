import { UrlRegistryError } from "./errors"
import { cloneValue } from "./memory-state"
import {
  assertUrlRegistryPageRequest,
  compareUrlRegistryCursorPosition,
  decodeUrlRegistryCursor,
  encodeUrlRegistryCursor,
  type UrlRegistryPageCollection,
} from "./pagination"
import type { UrlRegistryPage, UrlRegistryPageRequest } from "./reads"

type OrderedRecord = Readonly<{ id: string; createdAt: string }>

export const pageRecords = <RecordType extends OrderedRecord>(
  allRecords: readonly RecordType[],
  input: UrlRegistryPageRequest,
  collection: UrlRegistryPageCollection,
  include: (record: RecordType) => boolean = () => true
): UrlRegistryPage<RecordType> => {
  assertUrlRegistryPageRequest(input)
  const ordered = [...allRecords].sort(compareUrlRegistryCursorPosition)
  const after =
    input.cursor === undefined
      ? null
      : decodeUrlRegistryCursor(collection, input.cursor)
  if (
    after &&
    !ordered.some(
      (record) => record.createdAt === after.createdAt && record.id === after.id
    )
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Cursor does not identify a record in this collection"
    )
  }
  const eligible = ordered.filter(
    (record) =>
      include(record) &&
      (!after || compareUrlRegistryCursorPosition(record, after) > 0)
  )
  const window = eligible.slice(0, input.limit + 1)
  const items = window.slice(0, input.limit)
  const last = items.at(-1)
  const nextCursor =
    window.length > input.limit && last
      ? encodeUrlRegistryCursor(collection, last)
      : null
  return cloneValue({ items, nextCursor })
}

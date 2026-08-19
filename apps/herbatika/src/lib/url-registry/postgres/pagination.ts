import type { UrlRegistryPage, UrlRegistryPageRequest } from "../contracts"
import { UrlRegistryError } from "../errors"
import {
  assertUrlRegistryPageRequest,
  decodeUrlRegistryCursor,
  encodeUrlRegistryCursor,
  type UrlRegistryPageCollection,
} from "../pagination"

export type PageCursor = Readonly<{ createdAt: string; id: string }>

const POSTGRES_ID = /^(?:0|[1-9][0-9]*)$/

export const decodePageRequest = (
  input: UrlRegistryPageRequest,
  collection: UrlRegistryPageCollection
): Readonly<{ limit: number; cursor: PageCursor | null }> => {
  assertUrlRegistryPageRequest(input)
  const cursor =
    input.cursor === undefined
      ? null
      : decodeUrlRegistryCursor(collection, input.cursor)
  if (cursor && !POSTGRES_ID.test(cursor.id)) {
    throw new UrlRegistryError("INVALID_COMMAND", "Cursor is malformed")
  }
  return { limit: input.limit, cursor }
}

export const buildPage = <Value extends { id: string; createdAt: string }>(
  values: readonly Value[],
  limit: number,
  collection: UrlRegistryPageCollection
): UrlRegistryPage<Value> => {
  const items = values.slice(0, limit)
  return {
    items,
    nextCursor:
      values.length > limit && items.length > 0
        ? encodeUrlRegistryCursor(collection, items.at(-1) as Value)
        : null,
  }
}

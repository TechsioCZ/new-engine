import { UrlRegistryError } from "./errors"
import type { UrlRegistryPageRequest } from "./reads"

export type UrlRegistryPageCollection = "audit" | "pending-outbox"

export type UrlRegistryCursorPosition = Readonly<{
  createdAt: string
  id: string
}>

type CursorPayload = readonly [
  marker: "urlr-page",
  version: 1,
  collection: UrlRegistryPageCollection,
  createdAt: string,
  id: string,
]

const CURSOR_MARKER = "urlr-page"

const hasControlCharacter = (value: string) =>
  [...value].some((character) => {
    const codePoint = character.codePointAt(0) as number
    return codePoint <= 0x1f || codePoint === 0x7f
  })

const isIsoTimestamp = (value: string) => {
  try {
    return new Date(value).toISOString() === value
  } catch {
    return false
  }
}

const assertCursorText: (
  value: unknown,
  name: string
) => asserts value is string = (value, name) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    value.length > 512 ||
    hasControlCharacter(value)
  ) {
    throw new UrlRegistryError("INVALID_COMMAND", `${name} is invalid`)
  }
}

export const encodeUrlRegistryCursor = (
  collection: UrlRegistryPageCollection,
  position: UrlRegistryCursorPosition
): string => {
  const payload: CursorPayload = [
    CURSOR_MARKER,
    1,
    collection,
    position.createdAt,
    position.id,
  ]
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

export const decodeUrlRegistryCursor = (
  collection: UrlRegistryPageCollection,
  cursor: unknown
): UrlRegistryCursorPosition => {
  assertCursorText(cursor, "cursor")
  try {
    const value: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8")
    )
    if (
      !Array.isArray(value) ||
      value.length !== 5 ||
      value[0] !== CURSOR_MARKER ||
      value[1] !== 1 ||
      value[2] !== collection ||
      typeof value[3] !== "string" ||
      typeof value[4] !== "string" ||
      !isIsoTimestamp(value[3])
    ) {
      throw new TypeError("Invalid cursor payload")
    }
    assertCursorText(value[4], "cursor id")
    const position = { createdAt: value[3], id: value[4] }
    if (encodeUrlRegistryCursor(collection, position) !== cursor) {
      throw new TypeError("Non-canonical cursor")
    }
    return position
  } catch (cause) {
    if (cause instanceof UrlRegistryError) {
      throw cause
    }
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Cursor is malformed or belongs to another collection",
      {},
      { cause }
    )
  }
}

export const compareUrlRegistryCursorPosition = (
  left: UrlRegistryCursorPosition,
  right: UrlRegistryCursorPosition
) => {
  if (left.createdAt !== right.createdAt) {
    return left.createdAt < right.createdAt ? -1 : 1
  }
  if (left.id === right.id) {
    return 0
  }
  return left.id < right.id ? -1 : 1
}

export const assertUrlRegistryPageRequest = (input: UrlRegistryPageRequest) => {
  if (
    !input ||
    typeof input !== "object" ||
    !Number.isInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > 100
  ) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Page limit must be an integer from 1 to 100"
    )
  }
}

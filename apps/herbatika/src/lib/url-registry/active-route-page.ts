import { UrlRegistryError } from "./errors"

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const assertActiveRoutePageLimit = (limit: number) => {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Active route page limit must be from 1 to 100"
    )
  }
}

export const decodeActiveRouteCursor = (
  cursor: string | undefined
): string | null => {
  if (cursor === undefined) {
    return null
  }
  try {
    const routeId = Buffer.from(cursor, "base64url").toString("utf8")
    if (
      !UUID.test(routeId) ||
      Buffer.from(routeId, "utf8").toString("base64url") !== cursor
    ) {
      throw new Error("Invalid active route cursor")
    }
    return routeId
  } catch {
    throw new UrlRegistryError(
      "INVALID_COMMAND",
      "Active route cursor is invalid"
    )
  }
}

export const encodeActiveRouteCursor = (routeId: string) =>
  Buffer.from(routeId, "utf8").toString("base64url")

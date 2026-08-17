import { createHash } from "node:crypto"
import type { UrlRegistryCommand, UrlRegistryCommandRequest } from "./commands"

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (value === null || typeof value !== "object") {
    return value
  }
  const object = value as Readonly<Record<string, unknown>>
  return Object.fromEntries(
    Object.keys(object)
      .sort()
      .filter((key) => object[key] !== undefined)
      .map((key) => [key, canonicalize(object[key])])
  )
}

export const fingerprintUrlRegistryRequest = (
  commandVersion: 1,
  request: UrlRegistryCommandRequest
): string => {
  const serialized = JSON.stringify(canonicalize({ commandVersion, request }))
  return `sha256:${createHash("sha256").update(serialized).digest("hex")}`
}

export const createUrlRegistryCommand = <
  Request extends UrlRegistryCommandRequest,
>({
  idempotencyKey,
  request,
}: {
  idempotencyKey: string
  request: Request
}): UrlRegistryCommand<Request> => ({
  commandVersion: 1,
  idempotencyKey,
  requestFingerprint: fingerprintUrlRegistryRequest(1, request),
  request,
})

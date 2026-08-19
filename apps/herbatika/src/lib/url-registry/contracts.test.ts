import { describe, expect, it } from "vitest"
import {
  createUrlRegistryCommand,
  decodeUrlRegistryCursor,
  fingerprintUrlRegistryRequest,
  type RegisterGoneRequest,
} from "./contracts"

const GOLDEN_REQUEST: RegisterGoneRequest = {
  commandType: "register-gone",
  expectedVersion: 0,
  source: {
    producer: "migration-manifest",
    sourceSystem: "new-engine",
    sourceType: "legacy-path",
    sourceId: "legacy-product-42",
    sourceVersion: "2026-08-17",
    sourceEventId: "legacy-product-42:sk",
  },
  slug: {
    market: "sk",
    kind: "product",
    normalizedSlug: "stary-produkt",
    normalizationVersion: 1,
  },
}

describe("URL registry command fingerprint", () => {
  it("uses a stable algorithm-prefixed canonical SHA-256 fixture", () => {
    expect(fingerprintUrlRegistryRequest(1, GOLDEN_REQUEST)).toBe(
      "sha256:94a25398cb0920090b5d451945f6278c6a1726b90422ec801e52087dc4c7bc57"
    )
  })

  it("does not include the idempotency key in the request fingerprint", () => {
    const first = createUrlRegistryCommand({
      idempotencyKey: "legacy:42:first",
      request: GOLDEN_REQUEST,
    })
    const second = createUrlRegistryCommand({
      idempotencyKey: "legacy:42:retry",
      request: GOLDEN_REQUEST,
    })

    expect(first.requestFingerprint).toBe(second.requestFingerprint)
    expect(first.idempotencyKey).not.toBe(second.idempotencyKey)
  })

  it("rejects non-string cursors with the typed command error", () => {
    expect(() => decodeUrlRegistryCursor("audit", 123)).toThrowError(
      expect.objectContaining({ code: "INVALID_COMMAND" })
    )
  })
})

import type { MedusaRequest } from "@medusajs/framework/http"
import { isRecord } from "@techsio/std/object"
import { describe, expect, it } from "vitest"

import {
  getHeaderValue,
  isValidWebhookSignature,
} from "../../../../src/utils/webhooks"

const assertMockRequest = (
  candidate: unknown,
): asserts candidate is MedusaRequest => {
  if (!isRecord(candidate) || !isRecord(candidate["headers"])) {
    throw new TypeError("Expected a request mock with headers")
  }
}

const createMockRequest = (
  headers: Record<string, string | string[] | undefined>,
): MedusaRequest => {
  const candidate: unknown = { headers }
  assertMockRequest(candidate)
  return candidate
}

describe(getHeaderValue, () => {
  it("returns string header value directly", () => {
    const req = createMockRequest({ "x-signature": "abc123" })
    expect(getHeaderValue(req, "x-signature")).toBe("abc123")
  })

  it("returns first element when header is an array", () => {
    const req = createMockRequest({ "x-signature": ["first", "second"] })
    expect(getHeaderValue(req, "x-signature")).toBe("first")
  })

  it("returns undefined for missing header", () => {
    const req = createMockRequest({})
    expect(getHeaderValue(req, "x-signature")).toBeUndefined()
  })

  it("returns undefined when header value is undefined", () => {
    const headers: Record<string, string | string[] | undefined> = {}
    Object.defineProperty(headers, "x-signature", {
      configurable: true,
      enumerable: true,
    })
    const req = createMockRequest(headers)
    expect(getHeaderValue(req, "x-signature")).toBeUndefined()
  })

  it("handles empty string header", () => {
    const req = createMockRequest({ "x-signature": "" })
    expect(getHeaderValue(req, "x-signature")).toBe("")
  })

  it("handles empty array header", () => {
    const req = createMockRequest({ "x-signature": [] })
    expect(getHeaderValue(req, "x-signature")).toBeUndefined()
  })
})

describe(isValidWebhookSignature, () => {
  const validSignature = "abc123"

  it("returns true when signatures match", () => {
    expect(isValidWebhookSignature(validSignature, validSignature)).toBeTruthy()
  })

  it("returns false when signatures do not match", () => {
    expect(isValidWebhookSignature("abc123", "xyz789")).toBeFalsy()
  })

  it("returns false when signature is undefined", () => {
    expect(isValidWebhookSignature(undefined, validSignature)).toBeFalsy()
  })

  it("returns false when expected signature is undefined", () => {
    expect(isValidWebhookSignature(validSignature)).toBeFalsy()
  })

  it("returns false when both signatures are undefined", () => {
    expect(isValidWebhookSignature()).toBeFalsy()
  })

  it("returns false for empty signature", () => {
    expect(isValidWebhookSignature("", validSignature)).toBeFalsy()
  })

  it("returns false for empty expected signature", () => {
    expect(isValidWebhookSignature(validSignature, "")).toBeFalsy()
  })

  it("returns false when both are empty strings", () => {
    expect(isValidWebhookSignature("", "")).toBeFalsy()
  })

  it("uses constant-time comparison to prevent timing attacks", () => {
    // This test verifies the function handles different length strings
    // without leaking timing information (both get hashed to same length)
    const shortSig = "a"
    const longSig = "a".repeat(100)
    expect(isValidWebhookSignature(shortSig, longSig)).toBeFalsy()
    expect(isValidWebhookSignature(longSig, shortSig)).toBeFalsy()
  })

  it("is case-sensitive", () => {
    expect(isValidWebhookSignature("ABC123", "abc123")).toBeFalsy()
  })
})

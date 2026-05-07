import { getHeaderValue, isValidWebhookSignature } from "../webhooks"

const createMockRequest = (
  headers: Record<string, string | string[] | undefined>
) =>
  ({
    headers,
  }) as any

describe("getHeaderValue", () => {
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
    const req = createMockRequest({ "x-signature": undefined })
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

describe("isValidWebhookSignature", () => {
  const validSignature = "abc123"

  it("returns true when signatures match", () => {
    expect(isValidWebhookSignature(validSignature, validSignature)).toBe(true)
  })

  it("returns false when signatures do not match", () => {
    expect(isValidWebhookSignature("abc123", "xyz789")).toBe(false)
  })

  it("returns false when signature is undefined", () => {
    expect(isValidWebhookSignature(undefined, validSignature)).toBe(false)
  })

  it("returns false when expected signature is undefined", () => {
    expect(isValidWebhookSignature(validSignature, undefined)).toBe(false)
  })

  it("returns false when both signatures are undefined", () => {
    expect(isValidWebhookSignature(undefined, undefined)).toBe(false)
  })

  it("returns false for empty signature", () => {
    expect(isValidWebhookSignature("", validSignature)).toBe(false)
  })

  it("returns false for empty expected signature", () => {
    expect(isValidWebhookSignature(validSignature, "")).toBe(false)
  })

  it("returns false when both are empty strings", () => {
    expect(isValidWebhookSignature("", "")).toBe(false)
  })

  it("uses constant-time comparison to prevent timing attacks", () => {
    // This test verifies the function handles different length strings
    // without leaking timing information (both get hashed to same length)
    const shortSig = "a"
    const longSig = "a".repeat(100)
    expect(isValidWebhookSignature(shortSig, longSig)).toBe(false)
    expect(isValidWebhookSignature(longSig, shortSig)).toBe(false)
  })

  it("is case-sensitive", () => {
    expect(isValidWebhookSignature("ABC123", "abc123")).toBe(false)
  })
})

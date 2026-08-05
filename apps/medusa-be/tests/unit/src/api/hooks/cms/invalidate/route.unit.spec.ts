import { createHmac } from "node:crypto"

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const WEBHOOK_SECRET = "test-webhook-secret"

const mockInvalidateCache = vi.fn()
const mockLogger = {
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}

vi.mock(import("../../../../../../../src/modules/payload"), () => ({
  PAYLOAD_MODULE: "payloadModuleService",
}))

vi.mock(import("../../../../../../../src/utils/webhooks"), () => ({
  getHeaderValue: vi.fn(
    (req: { headers: Record<string, string> }, name: string) =>
      req.headers[name]
  ),
  isValidWebhookSignature: vi.fn(
    (sig: string | undefined, expected: string | undefined) =>
      sig !== undefined && sig === expected
  ),
}))

const originalEnv = process.env["PAYLOAD_WEBHOOK_SECRET"]

beforeAll(() => {
  process.env["PAYLOAD_WEBHOOK_SECRET"] = WEBHOOK_SECRET
})

afterAll(() => {
  if (originalEnv === undefined) {
    // delete required to unset env vars in Node.js
    delete process.env["PAYLOAD_WEBHOOK_SECRET"]
  } else {
    process.env["PAYLOAD_WEBHOOK_SECRET"] = originalEnv
  }
})

const createMockRequest = (
  body: unknown,
  headers: Record<string, string> = {}
) => {
  const bodyStr = JSON.stringify(body)
  return {
    body,
    headers,
    rawBody: bodyStr,
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === "payloadModuleService") {
          return { invalidateCache: mockInvalidateCache }
        }
        if (key === "logger") {
          return mockLogger
        }
        return
      }),
    },
  } as any
}

const createMockResponse = () => {
  const res = {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  }
  return res as any
}

const generateSignature = (body: unknown): string =>
  createHmac("sha256", WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest("hex")

describe("POST /hooks/cms/invalidate", () => {
  let POST: (req: any, res: any) => Promise<any>

  beforeAll(async () => {
    const routeModule =
      await import("../../../../../../../src/api/hooks/cms/invalidate/route")
    POST = routeModule.POST
  })

  beforeEach(() => {
    vi.clearAllMocks()
    process.env["PAYLOAD_WEBHOOK_SECRET"] = WEBHOOK_SECRET
  })

  it("returns 401 when signature is missing", async () => {
    const body = { collection: "pages", doc: { slug: "home" } }
    const req = createMockRequest(body, {})
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
  })

  it("returns 401 when signature is invalid", async () => {
    const body = { collection: "pages", doc: { slug: "home" } }
    const req = createMockRequest(body, {
      "x-payload-signature": "invalid-signature",
    })
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
  })

  it("returns 400 when collection is missing", async () => {
    const body = { doc: { slug: "home" } }
    const signature = generateSignature(body)
    const req = createMockRequest(body, { "x-payload-signature": signature })
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing or invalid collection",
    })
  })

  it("returns 200 and invalidates cache on valid request", async () => {
    const body = { collection: "pages", doc: { locale: "en", slug: "home" } }
    const signature = generateSignature(body)
    const req = createMockRequest(body, { "x-payload-signature": signature })
    const res = createMockResponse()

    mockInvalidateCache.mockResolvedValue()

    await POST(req, res)

    expect(mockInvalidateCache).toHaveBeenCalledWith("pages", "home", "en")
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it("handles request without doc property", async () => {
    const body = { collection: "hero-carousels" }
    const signature = generateSignature(body)
    const req = createMockRequest(body, { "x-payload-signature": signature })
    const res = createMockResponse()

    mockInvalidateCache.mockResolvedValue()

    await POST(req, res)

    expect(mockInvalidateCache).toHaveBeenCalledWith(
      "hero-carousels",
      undefined,
      undefined
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it("returns 500 when cache invalidation fails", async () => {
    const body = { collection: "articles", doc: { locale: "cs", slug: "news" } }
    const signature = generateSignature(body)
    const req = createMockRequest(body, { "x-payload-signature": signature })
    const res = createMockResponse()

    mockInvalidateCache.mockRejectedValue(
      new Error("Cache service unavailable")
    )

    await POST(req, res)

    expect(mockLogger.error).toHaveBeenCalledWith()
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      collection: "articles",
      error: "Failed to invalidate cache",
      locale: "cs",
      slug: "news",
    })
  })

  it("handles invalidation error with missing doc fields", async () => {
    const body = { collection: "pages" }
    const signature = generateSignature(body)
    const req = createMockRequest(body, { "x-payload-signature": signature })
    const res = createMockResponse()

    mockInvalidateCache.mockRejectedValue(new Error("Service error"))

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      collection: "pages",
      error: "Failed to invalidate cache",
      locale: null,
      slug: null,
    })
  })

  it("handles non-Error throwables in catch block", async () => {
    const body = { collection: "pages", doc: { slug: "test" } }
    const signature = generateSignature(body)
    const req = createMockRequest(body, { "x-payload-signature": signature })
    const res = createMockResponse()

    mockInvalidateCache.mockRejectedValue("string error")

    await POST(req, res)

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("CMS cache invalidation failed"),
      expect.any(Error)
    )
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe("POST /hooks/cms/invalidate - missing webhook secret", () => {
  it("returns 500 when webhook secret is not configured", async () => {
    // delete required to unset env vars in Node.js
    delete process.env["PAYLOAD_WEBHOOK_SECRET"]

    const { POST } =
      await import("../../../../../../../src/api/hooks/cms/invalidate/route")

    const body = { collection: "pages" }
    const req = createMockRequest(body, { "x-payload-signature": "any" })
    const res = createMockResponse()

    await POST(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: "Webhook secret not configured",
    })
  })
})

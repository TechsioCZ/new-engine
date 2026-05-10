import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mockImportPKCS8, mockSignJWTConstructor } = vi.hoisted(() => ({
  mockImportPKCS8: vi.fn(),
  mockSignJWTConstructor: vi.fn(),
}))

vi.mock("jose", () => ({
  importPKCS8: (...args: unknown[]) => mockImportPKCS8(...args),
  SignJWT: class {
    constructor(payload: unknown) {
      mockSignJWTConstructor(payload)
    }

    setProtectedHeader = vi.fn().mockReturnThis()
    setIssuedAt = vi.fn().mockReturnThis()
    setExpirationTime = vi.fn().mockReturnThis()
    setIssuer = vi.fn().mockReturnThis()
    setAudience = vi.fn().mockReturnThis()
    setSubject = vi.fn().mockReturnThis()
    sign = vi.fn().mockResolvedValue("signed-sso-token")
  },
}))

const ORIGINAL_ENV = { ...process.env }

const restoreEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key]
    }
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === "string") {
      process.env[key] = value
    }
  }
}

const createMockResponse = () =>
  ({
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }) as any

const createMockRequest = (
  overrides: Record<string, unknown> = {},
  headers: Record<string, string> = {}
) =>
  ({
    headers,
    auth_context: {
      actor_id: "user_123",
      actor_type: "user",
    },
    validatedQuery: {
      returnTo: "/admin",
    },
    ...overrides,
  }) as any

describe("GET /admin/payload/sso", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockImportPKCS8.mockResolvedValue({} as CryptoKey)
    process.env.PAYLOAD_SSO_PRIVATE_KEY = "private-key"
    process.env.PAYLOAD_IFRAME_URL = "http://localhost:8083"
    process.env.PAYLOAD_SSO_USER_EMAIL = "admin@example.com"
  })

  afterEach(() => {
    restoreEnv()
  })

  it("rejects direct handler access without an authenticated admin user context", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/payload/sso/route"
    )
    const req = createMockRequest({ auth_context: undefined })
    const res = createMockResponse()

    await GET(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      message: "Payload SSO requires an authenticated Medusa admin user.",
    })
    expect(mockImportPKCS8).not.toHaveBeenCalled()
  })

  it("rejects admin secret API key actors for SSO token issuance", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/payload/sso/route"
    )
    const req = createMockRequest({
      auth_context: {
        actor_id: "sk_123",
        actor_type: "api-key",
      },
    })
    const res = createMockResponse()

    await GET(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      message: "Payload SSO requires an authenticated Medusa admin user.",
    })
    expect(mockImportPKCS8).not.toHaveBeenCalled()
  })

  it("returns an auto-post form that preserves the Medusa origin for Payload origin checks", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/payload/sso/route"
    )
    const req = createMockRequest()
    const res = createMockResponse()

    await GET(req, res)

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "text/html; charset=utf-8"
    )
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
    expect(res.setHeader).toHaveBeenCalledWith("Referrer-Policy", "origin")
    expect(res.status).toHaveBeenCalledWith(200)

    const html = res.send.mock.calls[0]?.[0]
    expect(html).toContain('<meta name="referrer" content="origin" />')
    expect(html).toContain('<meta name="color-scheme" content="dark" />')
    expect(html).toContain("background: rgb(20, 20, 20)")
    expect(html).toContain("form {\n        display: none;")
    expect(html).toContain(
      '<form method="POST" action="http://localhost:8083/api/medusa-sso">'
    )
    expect(html).toContain('name="token" value="signed-sso-token"')
    expect(html).toContain('name="returnTo" value="/admin"')
    expect(html).not.toContain("no-referrer")
    expect(mockSignJWTConstructor).toHaveBeenCalledWith({
      email: "admin@example.com",
      medusa_actor_id: "user_123",
      medusa_actor_type: "user",
      payload_sso_mode: "shared-configured-user",
    })
  })

  it("rejects absolute return targets instead of dropping them silently", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/payload/sso/route"
    )
    const req = createMockRequest({
      validatedQuery: {
        returnTo: "https://evil.example/admin",
      },
    })
    const res = createMockResponse()

    await GET(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: "returnTo must be a same-origin relative path.",
    })
    expect(mockImportPKCS8).not.toHaveBeenCalled()
  })

  it("rejects protocol-relative return targets", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/payload/sso/route"
    )
    const req = createMockRequest({
      validatedQuery: {
        returnTo: "//evil.example/admin",
      },
    })
    const res = createMockResponse()

    await GET(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      message: "returnTo must be a same-origin relative path.",
    })
  })

  it("rejects non-http Payload iframe URLs", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/payload/sso/route"
    )
    process.env.PAYLOAD_IFRAME_URL = "javascript:alert(1)"
    const req = createMockRequest()
    const res = createMockResponse()

    await GET(req, res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({
      message: "PAYLOAD_IFRAME_URL is invalid. Please provide an absolute URL.",
    })
  })

  it("uses 127.0.0.1 for Payload SSO when Medusa admin is opened through 127.0.0.1", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/payload/sso/route"
    )
    const req = createMockRequest({}, { host: "127.0.0.1:9000" })
    const res = createMockResponse()

    await GET(req, res)

    const html = res.send.mock.calls[0]?.[0]
    expect(html).toContain(
      '<form method="POST" action="http://127.0.0.1:8083/api/medusa-sso">'
    )
  })

  it("uses the local Caddy Payload host when Medusa admin is opened through admin.medusa.localhost", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/payload/sso/route"
    )
    const req = createMockRequest(
      {},
      { "x-forwarded-host": "admin.medusa.localhost" }
    )
    const res = createMockResponse()

    await GET(req, res)

    const html = res.send.mock.calls[0]?.[0]
    expect(html).toContain(
      '<form method="POST" action="https://admin.payload.medusa.localhost/api/medusa-sso">'
    )
  })
})

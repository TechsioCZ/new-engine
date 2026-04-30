const mockImportPKCS8 = jest.fn()

jest.mock("jose", () => ({
  importPKCS8: (...args: unknown[]) => mockImportPKCS8(...args),
  SignJWT: class {
    setProtectedHeader = jest.fn().mockReturnThis()
    setIssuedAt = jest.fn().mockReturnThis()
    setExpirationTime = jest.fn().mockReturnThis()
    setIssuer = jest.fn().mockReturnThis()
    setAudience = jest.fn().mockReturnThis()
    setSubject = jest.fn().mockReturnThis()
    sign = jest.fn().mockResolvedValue("signed-sso-token")
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
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }) as any

const createMockRequest = (
  overrides: Record<string, unknown> = {},
  headers: Record<string, string> = {}
) =>
  ({
    headers,
    validatedQuery: {
      returnTo: "/admin",
    },
    ...overrides,
  }) as any

describe("GET /admin/payload/sso", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockImportPKCS8.mockResolvedValue({} as CryptoKey)
    process.env.PAYLOAD_SSO_PRIVATE_KEY = "private-key"
    process.env.PAYLOAD_IFRAME_URL = "http://localhost:8083"
    process.env.PAYLOAD_SSO_USER_EMAIL = "admin@example.com"
  })

  afterEach(() => {
    restoreEnv()
  })

  it("returns an auto-post form that preserves the Medusa origin for Payload origin checks", async () => {
    const { GET } = await import("../route")
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
  })

  it("uses 127.0.0.1 for Payload SSO when Medusa admin is opened through 127.0.0.1", async () => {
    const { GET } = await import("../route")
    const req = createMockRequest({}, { host: "127.0.0.1:9000" })
    const res = createMockResponse()

    await GET(req, res)

    const html = res.send.mock.calls[0]?.[0]
    expect(html).toContain(
      '<form method="POST" action="http://127.0.0.1:8083/api/medusa-sso">'
    )
  })

  it("uses the local Caddy Payload host when Medusa admin is opened through admin.medusa.localhost", async () => {
    const { GET } = await import("../route")
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

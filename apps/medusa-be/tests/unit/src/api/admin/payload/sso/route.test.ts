import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AdminPayloadSsoSchemaType } from "../../../../../../../src/api/admin/payload/sso/route"

const { mockImportPKCS8, mockSignJWTConstructor } = vi.hoisted(() => ({
  mockImportPKCS8: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  mockSignJWTConstructor: vi.fn<(payload: unknown) => void>(),
}))

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: Record<PropertyKey, unknown>,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

vi.mock(import("jose"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    SignJWT: class {
      constructor(payload: unknown) {
        mockSignJWTConstructor(payload)
      }

      setProtectedHeader = vi
        .fn<(header: Record<string, unknown>) => unknown>()
        .mockReturnThis()
      setIssuedAt = vi.fn<(iat: number) => unknown>().mockReturnThis()
      setExpirationTime = vi.fn<(exp: number) => unknown>().mockReturnThis()
      setIssuer = vi.fn<(issuer: string) => unknown>().mockReturnThis()
      setAudience = vi.fn<(audience: string) => unknown>().mockReturnThis()
      setSubject = vi.fn<(subject: string) => unknown>().mockReturnThis()
      sign = vi
        .fn<(key: unknown) => Promise<string>>()
        .mockResolvedValue("signed-sso-token")
    },
    importPKCS8: async (...args: unknown[]) => await mockImportPKCS8(...args),
  }),
)

const ORIGINAL_ENV = { ...process.env }

const restoreEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      Reflect.deleteProperty(process.env, key)
    }
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === "string") {
      process.env[key] = value
    }
  }
}

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock as `unknown` first (instead of
 * the target type) avoids requiring every property of the huge Node
 * request/response interfaces while still validating the shape the route
 * handler actually reads from at runtime.
 */
const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

type MockResponse = MedusaResponse & {
  json: ReturnType<typeof vi.fn<(body: Record<string, unknown>) => unknown>>
  send: ReturnType<typeof vi.fn<(body: string) => unknown>>
  setHeader: ReturnType<typeof vi.fn<(name: string, value: string) => void>>
  status: ReturnType<typeof vi.fn<(code: number) => MockResponse>>
}

type MockRequest = MedusaRequest<unknown, AdminPayloadSsoSchemaType> & {
  auth_context?: {
    actor_id?: string
    actor_type?: string
  }
  headers: Record<string, string>
}

const createMockResponse = (): MockResponse => {
  const candidate: unknown = {
    json: vi.fn<(body: Record<string, unknown>) => unknown>().mockReturnThis(),
    send: vi.fn<(body: string) => unknown>().mockReturnThis(),
    setHeader: vi.fn<(name: string, value: string) => void>(),
    status: vi.fn<(code: number) => MockResponse>().mockReturnThis(),
  }
  assertMockShape<MockResponse>(candidate, [
    "json",
    "send",
    "setHeader",
    "status",
  ])
  return candidate
}

const createMockRequest = (
  overrides: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): MockRequest => {
  const candidate: unknown = {
    auth_context: {
      actor_id: "user_123",
      actor_type: "user",
    },
    headers,
    validatedQuery: {
      returnTo: "/admin",
    },
    ...overrides,
  }
  assertMockShape<MockRequest>(candidate, ["headers", "validatedQuery"])
  return candidate
}

describe("GET /admin/payload/sso", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockImportPKCS8.mockResolvedValue({})
    process.env["PAYLOAD_SSO_PRIVATE_KEY"] = "private-key"
    process.env["PAYLOAD_IFRAME_URL"] = "http://localhost:8083"
    process.env["PAYLOAD_SSO_USER_EMAIL"] = "admin@example.com"
  })

  afterEach(() => {
    restoreEnv()
  })

  it("rejects direct handler access without an authenticated admin user context", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/payload/sso/route")
    const req = createMockRequest({ auth_context: null })
    const res = createMockResponse()

    await GET(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      message: "Payload SSO requires an authenticated Medusa admin user.",
    })
    expect(mockImportPKCS8).not.toHaveBeenCalled()
  })

  it("rejects admin secret API key actors for SSO token issuance", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/payload/sso/route")
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

  describe("returns an auto-post form that preserves the Medusa origin for Payload origin checks", () => {
    let html: string
    let res: MockResponse

    beforeEach(async () => {
      const { GET } =
        await import("../../../../../../../src/api/admin/payload/sso/route")
      const req = createMockRequest()
      res = createMockResponse()

      await GET(req, res)

      const sentHtml = res.send.mock.calls[0]?.[0]
      if (sentHtml === undefined) {
        throw new Error("Expected SSO route to send an HTML response")
      }
      html = sentHtml
    })

    it("sets the response headers and status for the auto-post form", () => {
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/html; charset=utf-8",
      )
      expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
      expect(res.setHeader).toHaveBeenCalledWith("Referrer-Policy", "origin")
      expect(res.status).toHaveBeenCalledWith(200)
    })

    it("renders the referrer and color-scheme meta tags with a hidden form", () => {
      expect(html).toContain('<meta name="referrer" content="origin" />')
      expect(html).toContain('<meta name="color-scheme" content="dark" />')
      expect(html).toContain("background: rgb(20, 20, 20)")
      expect(html).toContain("form {\n        display: none;")
    })

    it("posts the signed token and returnTo to the Payload origin", () => {
      expect(html).toContain(
        '<form method="POST" action="http://localhost:8083/api/medusa-sso">',
      )
      expect(html).toContain('name="token" value="signed-sso-token"')
      expect(html).toContain('name="returnTo" value="/admin"')
      expect(html).not.toContain("no-referrer")
    })

    it("signs the JWT with the configured admin email and actor context", () => {
      expect(mockSignJWTConstructor).toHaveBeenCalledWith({
        email: "admin@example.com",
        medusa_actor_id: "user_123",
        medusa_actor_type: "user",
        payload_sso_mode: "shared-configured-user",
      })
    })
  })

  it("rejects absolute return targets instead of dropping them silently", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/payload/sso/route")
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
    const { GET } =
      await import("../../../../../../../src/api/admin/payload/sso/route")
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
    const { GET } =
      await import("../../../../../../../src/api/admin/payload/sso/route")
    process.env["PAYLOAD_IFRAME_URL"] = "ftp://evil.example"
    const req = createMockRequest()
    const res = createMockResponse()

    await GET(req, res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({
      message: "PAYLOAD_IFRAME_URL is invalid. Please provide an absolute URL.",
    })
  })

  it("uses 127.0.0.1 for Payload SSO when Medusa admin is opened through 127.0.0.1", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/payload/sso/route")
    const req = createMockRequest({}, { host: "127.0.0.1:9000" })
    const res = createMockResponse()

    await GET(req, res)

    const html = res.send.mock.calls[0]?.[0]
    expect(html).toContain(
      '<form method="POST" action="http://127.0.0.1:8083/api/medusa-sso">',
    )
  })

  it("uses the local Caddy Payload host when Medusa admin is opened through admin.medusa.localhost", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/payload/sso/route")
    const req = createMockRequest(
      {},
      { "x-forwarded-host": "admin.medusa.localhost" },
    )
    const res = createMockResponse()

    await GET(req, res)

    const html = res.send.mock.calls[0]?.[0]
    expect(html).toContain(
      '<form method="POST" action="https://admin.payload.medusa.localhost/api/medusa-sso">',
    )
  })
})

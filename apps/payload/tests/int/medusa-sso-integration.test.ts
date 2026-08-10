import type { randomUUID } from "node:crypto"

import { importSPKI, jwtVerify } from "jose"
import { generatePayloadCookie, headersWithCors, jwtSign } from "payload"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { medusaSsoPostEndpoint } from "@/lib/endpoints/medusa-sso"

vi.mock(import("payload"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    generatePayloadCookie: vi.fn<typeof generatePayloadCookie>(
      actual.generatePayloadCookie,
    ),
    headersWithCors: vi.fn<typeof headersWithCors>(
      ({ headers }: { headers: Headers }) => headers,
    ),
    jwtSign: vi
      .fn<typeof jwtSign>()
      .mockResolvedValue({ exp: 1, token: "payload-token" }),
  }
})

vi.mock(import("jose"), { spy: true })

const randomUUIDMock = vi.hoisted(() =>
  vi.fn<typeof randomUUID>(() => "00000000-0000-4000-8000-000000000000"),
)

vi.mock(import("node:crypto"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    randomUUID: randomUUIDMock,
  }
})

const headersWithCorsMock = vi.mocked(headersWithCors)
const generatePayloadCookieMock = vi.mocked(generatePayloadCookie)
const jwtSignMock = vi.mocked(jwtSign)
const importSPKIMock = vi.mocked(importSPKI)
const jwtVerifyMock = vi.mocked(jwtVerify)

const ORIGINAL_ENV = { ...process.env }

interface TestSession {
  createdAt?: string | Date | null
  expiresAt: string | Date
  id: string
}

interface TestAdminUser {
  id: number | string
  sessions: TestSession[] | null
}

interface UpdateOneInput {
  collection: string
  data: {
    sessions?: TestSession[]
  }
  id: string | number
  req: object
  returning: boolean
}

const createFormDataMock = () => vi.fn<() => Promise<FormData>>()
const createFindMock = () =>
  vi.fn<(options: object) => Promise<{ docs: TestAdminUser[] }>>()
const createUpdateOneMock = () =>
  vi.fn<(options: UpdateOneInput) => Promise<null>>()

const resetEnv = () => {
  process.env = { ...ORIGINAL_ENV }
}

const setEnv = (
  key:
    | "PAYLOAD_SSO_ALLOWED_ORIGINS"
    | "PAYLOAD_SSO_PUBLIC_KEY"
    | "PAYLOAD_SSO_USER_EMAIL",
  value: string,
) => {
  process.env[key] = value
}

const createFormData = (values: Record<string, string>) => {
  const form = new FormData()
  for (const [key, value] of Object.entries(values)) {
    form.append(key, value)
  }
  return form
}

const createRequest = (overrides: { headers?: Headers } = {}) => ({
  formData: createFormDataMock(),
  headers: overrides.headers ?? new Headers({ origin: "https://allowed.com" }),
  payload: {
    collections: {
      users: {
        config: {
          auth: {
            tokenExpiration: 60,
            useSessions: true,
          },
        },
      },
    },
    config: {
      admin: { user: "users" },
      cookiePrefix: "payload",
    },
    db: {
      updateOne: createUpdateOneMock(),
    },
    find: createFindMock(),
    secret: "secret",
  },
  url: "http://localhost/medusa-sso",
})

const invokeEndpoint = async (
  req: ReturnType<typeof createRequest>,
): Promise<Response> => {
  const result: unknown = Reflect.apply(
    medusaSsoPostEndpoint.handler,
    undefined,
    [req],
  )
  const response = await Promise.resolve(result)
  if (!(response instanceof Response)) {
    throw new TypeError("Expected endpoint handler to return a response")
  }
  return response
}

const createPublicKey = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      hash: "SHA-256",
      modulusLength: 2048,
      name: "RSASSA-PKCS1-v1_5",
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ["sign", "verify"],
  )

  if (!("publicKey" in keyPair)) {
    throw new TypeError("Expected an asymmetric key pair.")
  }

  return keyPair.publicKey
}

describe("medusa SSO endpoint", () => {
  beforeEach(() => {
    setEnv("PAYLOAD_SSO_USER_EMAIL", "user@example.com")
    headersWithCorsMock.mockClear()
    generatePayloadCookieMock.mockClear()
    generatePayloadCookieMock.mockReturnValue("payload-cookie")
    jwtSignMock.mockClear()
    importSPKIMock.mockReset()
    jwtVerifyMock.mockReset()
  })

  afterEach(() => {
    resetEnv()
  })

  it("fails closed when allowed origins are not configured", async () => {
    setEnv("PAYLOAD_SSO_ALLOWED_ORIGINS", "")
    setEnv("PAYLOAD_SSO_PUBLIC_KEY", "public-key")

    const req = createRequest()

    await expect(invokeEndpoint(req)).rejects.toMatchObject({
      message: "Payload SSO allowed origins are not configured.",
      status: 500,
    })
  })

  it("rejects requests from disallowed origins", async () => {
    setEnv("PAYLOAD_SSO_ALLOWED_ORIGINS", "https://allowed.com")
    setEnv("PAYLOAD_SSO_PUBLIC_KEY", "public-key")

    const req = createRequest({
      headers: new Headers({ origin: "https://evil.com" }),
    })

    await expect(invokeEndpoint(req)).rejects.toMatchObject({
      message: "Origin is not allowed.",
      status: 403,
    })
  })

  it("accepts allowed origin values configured with path segments", async () => {
    setEnv("PAYLOAD_SSO_ALLOWED_ORIGINS", "https://allowed.com/admin/login")
    setEnv("PAYLOAD_SSO_PUBLIC_KEY", "public-key")
    setEnv("PAYLOAD_SSO_USER_EMAIL", "user@example.com")

    const req = createRequest()
    req.formData.mockResolvedValue(createFormData({ returnTo: "/admin" }))

    await expect(invokeEndpoint(req)).rejects.toMatchObject({
      message: "Missing SSO token.",
      status: 400,
    })
  })

  it("uses referer as fallback when origin header is missing", async () => {
    setEnv("PAYLOAD_SSO_ALLOWED_ORIGINS", "https://allowed.com")
    setEnv("PAYLOAD_SSO_PUBLIC_KEY", "public-key")
    setEnv("PAYLOAD_SSO_USER_EMAIL", "user@example.com")

    const req = createRequest({
      headers: new Headers({
        referer: "https://allowed.com/app/settings/payload",
      }),
    })
    req.formData.mockResolvedValue(createFormData({ returnTo: "/admin" }))

    await expect(invokeEndpoint(req)).rejects.toMatchObject({
      message: "Missing SSO token.",
      status: 400,
    })
  })

  it("rejects when token is missing", async () => {
    setEnv("PAYLOAD_SSO_ALLOWED_ORIGINS", "https://allowed.com")
    setEnv("PAYLOAD_SSO_PUBLIC_KEY", "public-key")
    setEnv("PAYLOAD_SSO_USER_EMAIL", "user@example.com")

    const req = createRequest()
    req.formData.mockResolvedValue(createFormData({ returnTo: "/admin" }))

    await expect(invokeEndpoint(req)).rejects.toMatchObject({
      message: "Missing SSO token.",
      status: 400,
    })
  })

  it("creates a session and redirects on success", async () => {
    setEnv("PAYLOAD_SSO_ALLOWED_ORIGINS", "https://allowed.com")
    setEnv("PAYLOAD_SSO_PUBLIC_KEY", "public-key")
    setEnv("PAYLOAD_SSO_USER_EMAIL", "user@example.com")

    const publicKey = await createPublicKey()
    importSPKIMock.mockResolvedValue(publicKey)
    jwtVerifyMock.mockResolvedValue({
      key: publicKey,
      payload: { email: "user@example.com" },
      protectedHeader: { alg: "RS256" },
    })

    const req = createRequest()
    req.formData.mockResolvedValue(
      createFormData({ returnTo: "//example.com", token: "token-value" }),
    )
    req.payload.find.mockResolvedValue({
      docs: [{ id: "user_1", sessions: [] }],
    })

    const response = await invokeEndpoint(req)

    const updateInput = req.payload.db.updateOne.mock.calls[0]?.[0]
    const session = updateInput?.data.sessions?.[0]
    const jwtInput = jwtSignMock.mock.calls[0]?.[0]
    const cookieInput = generatePayloadCookieMock.mock.calls[0]?.[0]

    expect({
      cookieCallCount: generatePayloadCookieMock.mock.calls.length,
      cookieToken: cookieInput?.token,
      jwtCallCount: jwtSignMock.mock.calls.length,
      jwtFields: jwtInput?.fieldsToSign,
      response: {
        accessControlAllowCredentials: response.headers.get(
          "Access-Control-Allow-Credentials",
        ),
        accessControlAllowOrigin: response.headers.get(
          "Access-Control-Allow-Origin",
        ),
        accessControlExposeHeaders: response.headers.get(
          "Access-Control-Expose-Headers",
        ),
        location: response.headers.get("Location"),
        setCookie: response.headers.get("Set-Cookie"),
        status: response.status,
      },
      update: {
        callCount: req.payload.db.updateOne.mock.calls.length,
        collection: updateInput?.collection,
        dataHasId:
          updateInput === undefined
            ? undefined
            : Object.hasOwn(updateInput.data, "id"),
        id: updateInput?.id,
        reqMatches: updateInput?.req === req,
        session: {
          createdAtIsDate: session?.createdAt instanceof Date,
          expiresAtIsDate: session?.expiresAt instanceof Date,
          id: session?.id,
        },
      },
    }).toStrictEqual({
      cookieCallCount: 1,
      cookieToken: "payload-token",
      jwtCallCount: 1,
      jwtFields: {
        collection: "users",
        id: "user_1",
        sid: "00000000-0000-4000-8000-000000000000",
      },
      response: {
        accessControlAllowCredentials: "true",
        accessControlAllowOrigin: "https://allowed.com",
        accessControlExposeHeaders: "Location",
        location: "/",
        setCookie: "payload-cookie",
        status: 302,
      },
      update: {
        callCount: 1,
        collection: "users",
        dataHasId: false,
        id: "user_1",
        reqMatches: true,
        session: {
          createdAtIsDate: true,
          expiresAtIsDate: true,
          id: "00000000-0000-4000-8000-000000000000",
        },
      },
    })
  })

  it("fails closed when the shared Payload SSO user is not configured", async () => {
    setEnv("PAYLOAD_SSO_ALLOWED_ORIGINS", "https://allowed.com")
    setEnv("PAYLOAD_SSO_PUBLIC_KEY", "public-key")
    setEnv("PAYLOAD_SSO_USER_EMAIL", "")

    const req = createRequest()

    await expect(invokeEndpoint(req)).rejects.toMatchObject({
      message: "Payload SSO is not configured.",
      status: 500,
    })
  })

  it("rejects valid tokens for any user other than the configured shared Payload user", async () => {
    setEnv("PAYLOAD_SSO_ALLOWED_ORIGINS", "https://allowed.com")
    setEnv("PAYLOAD_SSO_PUBLIC_KEY", "public-key")
    setEnv("PAYLOAD_SSO_USER_EMAIL", "shared-admin@example.com")

    const publicKey = await createPublicKey()
    importSPKIMock.mockResolvedValue(publicKey)
    jwtVerifyMock.mockResolvedValue({
      key: publicKey,
      payload: { email: "other-admin@example.com" },
      protectedHeader: { alg: "RS256" },
    })

    const req = createRequest()
    req.formData.mockResolvedValue(createFormData({ token: "token-value" }))

    await expect(invokeEndpoint(req)).rejects.toMatchObject({
      message: "SSO token user is not configured for Payload.",
      status: 401,
    })
    expect(req.payload.find).not.toHaveBeenCalled()
  })
})

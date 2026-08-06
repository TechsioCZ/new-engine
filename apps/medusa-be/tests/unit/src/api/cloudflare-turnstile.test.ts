import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { verifyCloudflareTurnstile } from "../../../../src/api/middlewares/cloudflare-turnstile"

const ORIGINAL_ENV = { ...process.env }

type ApiStoreSecretMock = {
  api_key: string
  credentials: null
  id: string
  name: string
} | null

type RetrieveApiStoreSecretsByNameFn = (name: string) => ApiStoreSecretMock

type ResolveFn = (key: string) => {
  retrieveApiStoreSecretsByName: RetrieveApiStoreSecretsByNameFn
}

const assertMedusaRequest: (
  candidate: unknown,
) => asserts candidate is MedusaRequest = (candidate) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock request object")
  }

  if (!("scope" in candidate) || !("body" in candidate)) {
    throw new TypeError("Mock request is missing required properties")
  }
}

const createReq = ({
  body = {},
  secret = "1x0000000000000000000000000000000AA",
}: {
  body?: Record<string, unknown>
  secret?: string | null
} = {}) => {
  const request: unknown = {
    body,
    headers: { "x-forwarded-for": "127.0.0.1, 10.0.0.1" },
    ip: "127.0.0.2",
    scope: {
      resolve: vi.fn<ResolveFn>(() => ({
        retrieveApiStoreSecretsByName: vi.fn<RetrieveApiStoreSecretsByNameFn>(
          (name) =>
            secret === null
              ? null
              : {
                  api_key: secret,
                  credentials: null,
                  id: "api-store-test",
                  name,
                },
        ),
      })),
    },
  }

  assertMedusaRequest(request)
  return request
}

interface ResponseMethods {
  json: (...args: unknown[]) => unknown
  status: (...args: unknown[]) => unknown
}

const assertMedusaResponse: <T extends ResponseMethods>(
  candidate: T,
) => asserts candidate is T & MedusaResponse = (candidate) => {
  if (
    typeof candidate.json !== "function" ||
    typeof candidate.status !== "function"
  ) {
    throw new TypeError("Mock response requires json and status functions")
  }
}

const createRes = () => {
  const res = {
    json: vi.fn<(...args: unknown[]) => unknown>(),
    status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
  }

  assertMedusaResponse(res)
  return res
}

type FetchMock = (...args: Parameters<typeof fetch>) => {
  json: () => unknown
  ok: boolean
}

const isURLSearchParams = (value: unknown): value is URLSearchParams =>
  value instanceof URLSearchParams

interface TurnstileSiteverifyExpectedBody {
  remoteip: string
  response: string
  secret: string
}

const assertTurnstileSiteverifyBody = (
  body: URLSearchParams,
  expected: TurnstileSiteverifyExpectedBody,
) => {
  expect(body.get("secret")).toBe(expected.secret)
  expect(body.get("response")).toBe(expected.response)
  expect(body.get("remoteip")).toBe(expected.remoteip)
}

describe("cloudflare turnstile verification middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...ORIGINAL_ENV }
  })

  it("skips verification when disabled but strips token fields before body validation", async () => {
    process.env["CLOUDFLARE_TURNSTILE_ENABLED"] = "0"
    const fetchMock = vi.fn<FetchMock>()
    vi.stubGlobal("fetch", fetchMock)
    const req = createReq({
      body: {
        content: "Review",
        turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
      },
    })
    const res = createRes()
    const next = vi.fn<() => void>()

    await verifyCloudflareTurnstile()(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toStrictEqual({ content: "Review" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("passes when enabled, API Store has the test secret, and Cloudflare accepts the dummy token", async () => {
    process.env["CLOUDFLARE_TURNSTILE_ENABLED"] = "true"
    process.env["CLOUDFLARE_TURNSTILE_ALLOWED_HOSTNAMES"] = "localhost"
    const fetchMock = vi.fn<FetchMock>(() => ({
      json: () => ({
        "error-codes": [],
        hostname: "localhost",
        success: true,
      }),
      ok: true,
    }))
    vi.stubGlobal("fetch", fetchMock)
    const req = createReq({
      body: {
        "cf-turnstile-response": " XXXX.DUMMY.TOKEN.XXXX ",
        content: "Review",
      },
    })
    const res = createRes()
    const next = vi.fn<() => void>()

    await verifyCloudflareTurnstile()(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
    expect(req.body).toStrictEqual({ content: "Review" })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    )
    const requestBody = fetchMock.mock.calls[0]?.[1]?.body
    if (!isURLSearchParams(requestBody)) {
      throw new TypeError(
        "Expected the turnstile request body to be URLSearchParams",
      )
    }
    assertTurnstileSiteverifyBody(requestBody, {
      remoteip: "127.0.0.1",
      response: "XXXX.DUMMY.TOKEN.XXXX",
      secret: "1x0000000000000000000000000000000AA",
    })
  })

  it("fails closed when enabled and the API Store secret is missing", async () => {
    process.env["CLOUDFLARE_TURNSTILE_ENABLED"] = "true"
    const req = createReq({
      body: { turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" },
      secret: null,
    })
    const res = createRes()
    const next = vi.fn<() => void>()

    await verifyCloudflareTurnstile()(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      code: "captcha_verification_failed",
      message: "Captcha verification is not configured",
      type: "invalid_data",
    })
  })

  it("rejects missing tokens when enabled", async () => {
    process.env["CLOUDFLARE_TURNSTILE_ENABLED"] = "true"
    const req = createReq({ body: { content: "Review" } })
    const res = createRes()
    const next = vi.fn<() => void>()

    await verifyCloudflareTurnstile()(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      code: "captcha_verification_failed",
      message: "Captcha token is required",
      type: "invalid_data",
    })
  })

  it("rejects valid Cloudflare responses from disallowed hostnames", async () => {
    process.env["CLOUDFLARE_TURNSTILE_ENABLED"] = "true"
    process.env["CLOUDFLARE_TURNSTILE_ALLOWED_HOSTNAMES"] = "localhost"
    vi.stubGlobal(
      "fetch",
      vi.fn<FetchMock>(() => ({
        json: () => ({ hostname: "example.com", success: true }),
        ok: true,
      })),
    )
    const req = createReq({
      body: { turnstile_token: "XXXX.DUMMY.TOKEN.XXXX" },
    })
    const res = createRes()
    const next = vi.fn<() => void>()

    await verifyCloudflareTurnstile()(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      code: "captcha_verification_failed",
      message: "Captcha verification failed",
      type: "invalid_data",
    })
  })
})

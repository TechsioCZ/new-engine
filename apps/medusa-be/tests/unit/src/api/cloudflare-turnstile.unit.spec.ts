import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { verifyCloudflareTurnstile } from "../../../../src/api/middlewares/cloudflare-turnstile"

const ORIGINAL_ENV = { ...process.env }

const createReq = ({
  body = {},
  secret = "1x0000000000000000000000000000000AA",
}: {
  body?: Record<string, unknown>
  secret?: string | null
} = {}) =>
  ({
    body,
    headers: { "x-forwarded-for": "127.0.0.1, 10.0.0.1" },
    ip: "127.0.0.2",
    scope: {
      resolve: vi.fn(() => ({
        retrieveApiStoreSecretsByName: vi.fn(async (name: string) =>
          secret === null
            ? null
            : {
                api_key: secret,
                credentials: null,
                id: "api-store-test",
                name,
              }
        ),
      })),
    },
  }) as any

const createRes = () => {
  const res = {
    json: vi.fn(),
    status: vi.fn(),
  } as any

  res.status.mockReturnValue(res)
  return res
}

describe("verifyCloudflareTurnstile", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...ORIGINAL_ENV }
  })

  it("skips verification when disabled but strips token fields before body validation", async () => {
    process.env.CLOUDFLARE_TURNSTILE_ENABLED = "0"
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const req = createReq({
      body: {
        content: "Review",
        turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
      },
    })
    const res = createRes()
    const next = vi.fn()

    await verifyCloudflareTurnstile()(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(req.body).toEqual({ content: "Review" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("passes when enabled, API Store has the test secret, and Cloudflare accepts the dummy token", async () => {
    process.env.CLOUDFLARE_TURNSTILE_ENABLED = "true"
    process.env.CLOUDFLARE_TURNSTILE_ALLOWED_HOSTNAMES = "localhost"
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        action: "product_review",
        success: true,
        hostname: "localhost",
        "error-codes": [],
      }),
      ok: true,
    }))
    vi.stubGlobal("fetch", fetchMock)
    const req = createReq({
      body: {
        content: "Review",
        "cf-turnstile-response": " XXXX.DUMMY.TOKEN.XXXX ",
      },
    })
    const res = createRes()
    const next = vi.fn()

    await verifyCloudflareTurnstile({ expectedAction: "product_review" })(
      req,
      res,
      next
    )

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
    expect(req.body).toEqual({ content: "Review" })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        signal: expect.any(AbortSignal),
      })
    )
    const requestBody = fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams
    expect(requestBody.get("secret")).toBe(
      "1x0000000000000000000000000000000AA"
    )
    expect(requestBody.get("response")).toBe("XXXX.DUMMY.TOKEN.XXXX")
    expect(requestBody.get("remoteip")).toBe("127.0.0.1")
  })

  it("fails closed when enabled and the API Store secret is missing", async () => {
    process.env.CLOUDFLARE_TURNSTILE_ENABLED = "true"
    const req = createReq({
      body: { turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" },
      secret: null,
    })
    const res = createRes()
    const next = vi.fn()

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
    process.env.CLOUDFLARE_TURNSTILE_ENABLED = "true"
    const req = createReq({ body: { content: "Review" } })
    const res = createRes()
    const next = vi.fn()

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
    process.env.CLOUDFLARE_TURNSTILE_ENABLED = "true"
    process.env.CLOUDFLARE_TURNSTILE_ALLOWED_HOSTNAMES = "localhost"
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ success: true, hostname: "example.com" }),
        ok: true,
      }))
    )
    const req = createReq({
      body: { turnstile_token: "XXXX.DUMMY.TOKEN.XXXX" },
    })
    const res = createRes()
    const next = vi.fn()

    await verifyCloudflareTurnstile()(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      code: "captcha_verification_failed",
      message: "Captcha verification failed",
      type: "invalid_data",
    })
  })

  it.each([
    undefined,
    "login",
  ])("rejects a valid Cloudflare response with action %s", async (action) => {
    process.env.CLOUDFLARE_TURNSTILE_ENABLED = "true"
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({ action, success: true }),
        ok: true,
      }))
    )
    const req = createReq({
      body: { turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" },
    })
    const res = createRes()
    const next = vi.fn()

    await verifyCloudflareTurnstile({ expectedAction: "product_review" })(
      req,
      res,
      next
    )

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      code: "captcha_verification_failed",
      message: "Captcha verification failed",
      type: "invalid_data",
    })
  })

  it("returns service unavailable when Cloudflare verification cannot complete", async () => {
    process.env.CLOUDFLARE_TURNSTILE_ENABLED = "true"
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      throw new DOMException("The operation timed out", "TimeoutError")
    })
    vi.stubGlobal("fetch", fetchMock)
    const req = createReq({
      body: { turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" },
    })
    const res = createRes()
    const next = vi.fn()

    await verifyCloudflareTurnstile({ expectedAction: "product_review" })(
      req,
      res,
      next
    )

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({
      code: "captcha_verification_failed",
      message: "Captcha verification is temporarily unavailable",
      type: "invalid_data",
    })
  })
})

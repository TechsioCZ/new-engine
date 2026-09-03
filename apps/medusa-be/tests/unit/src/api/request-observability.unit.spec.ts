import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildSafeApiErrorObservation,
  ensureRequestIdResponseHeader,
  requestObservabilityMiddleware,
} from "../../../../src/api/request-observability"

const REQUEST_ID = "985d1c16-3582-4b51-8e5a-b365d74d6b07"
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const request = (
  headers: Record<string, string | undefined>,
  path = "/store/products"
) =>
  ({
    headers,
    originalUrl: `${path}?email=user@example.test&token=private-token`,
    path,
  }) as unknown as MedusaRequest

const response = () =>
  ({ setHeader: vi.fn() }) as unknown as MedusaResponse & {
    setHeader: ReturnType<typeof vi.fn>
  }

describe("Medusa API request observability", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("preserves a valid correlation id and derives bounded market context", () => {
    vi.stubEnv("BACKEND_BUILD_HASH", "backend-build-42")
    vi.stubEnv("RELEASE_SHA", "a".repeat(40))
    vi.stubEnv("ZANE_DEPLOYMENT_ID", "dpl_42")
    vi.stubEnv("ZANE_DEPLOYMENT_SLOT", "blue")
    const req = request({
      "x-herbatika-origin": "storefront-gateway",
      "x-medusa-locale": "ro-RO",
      "x-request-id": REQUEST_ID,
    })
    const res = response()
    const next = vi.fn() as unknown as MedusaNextFunction

    requestObservabilityMiddleware(req, res, next)

    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", REQUEST_ID)
    expect(next).toHaveBeenCalledOnce()
    expect(buildSafeApiErrorObservation(req, new TypeError("private"))).toEqual(
      {
        backendBuildHash: "backend-build-42",
        deploymentId: "dpl_42",
        deploymentSlot: "blue",
        errorType: "TypeError",
        event: "medusa_api_error",
        locale: "ro-RO",
        market: "ro",
        originClass: "herbatika-storefront-gateway",
        releaseSha: "a".repeat(40),
        requestId: REQUEST_ID,
        routeClass: "store",
      }
    )
  })

  it("replaces attacker-controlled ids and excludes headers, URLs, and messages", () => {
    const req = request({
      authorization: "Bearer private-token",
      cookie: "session=user@example.test",
      "x-medusa-locale": "../../private",
      "x-publishable-api-key": "pk_private",
      "x-request-id": "user@example.test\nprivate-token",
    })
    const res = response()

    requestObservabilityMiddleware(req, res, vi.fn())
    const observation = buildSafeApiErrorObservation(
      req,
      Object.assign(new Error("user@example.test private-token"), {
        name: "privateTokenFromUser",
      })
    )
    const serialized = JSON.stringify(observation)

    expect(observation.requestId).toMatch(REQUEST_ID_PATTERN)
    expect(observation.locale).toBe("unknown")
    expect(observation.market).toBe("unknown")
    expect(observation.errorType).toBe("Error")
    expect(serialized).not.toContain("private-token")
    expect(serialized).not.toContain("user@example.test")
    expect(serialized).not.toContain("pk_private")
    expect(serialized).not.toContain("authorization")
    expect(serialized).not.toContain("cookie")
  })

  it("sets a request id even when the error handler runs before middleware", () => {
    const req = request({}, "/admin/products")
    const res = response()

    const requestId = ensureRequestIdResponseHeader(req, res)

    expect(requestId).toMatch(REQUEST_ID_PATTERN)
    expect(res.setHeader).toHaveBeenCalledWith("x-request-id", requestId)
    expect(buildSafeApiErrorObservation(req, "failure").routeClass).toBe(
      "admin"
    )
  })

  it("does not mutate response headers after they were sent", () => {
    const req = request({}, "/store/products")
    const setHeader = vi.fn(() => {
      throw new Error("ERR_HTTP_HEADERS_SENT")
    })
    const res = { headersSent: true, setHeader } as unknown as MedusaResponse

    expect(() => ensureRequestIdResponseHeader(req, res)).not.toThrow()
    expect(setHeader).not.toHaveBeenCalled()
  })
})

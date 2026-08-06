import { headersWithCors } from "payload"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildJsonResponse,
  getLocaleFromRequest,
  getQueryParam,
} from "@/lib/utils/endpoint"

vi.mock(import("payload"), () => ({
  headersWithCors: vi.fn<(args: { headers: Headers }) => Headers>(
    ({ headers }) => headers,
  ),
}))

const headersWithCorsMock = vi.mocked(headersWithCors)

const callGetQueryParam = (req: unknown, key: string): string | undefined => {
  const result: unknown = Reflect.apply(getQueryParam, undefined, [req, key])
  if (result === undefined || typeof result === "string") {
    return result
  }
  throw new TypeError("getQueryParam returned an invalid value")
}

const callGetLocaleFromRequest = (req: unknown): unknown => {
  const result: unknown = Reflect.apply(getLocaleFromRequest, undefined, [req])
  return result
}

const callBuildJsonResponse = (req: unknown, data: unknown): Response => {
  const result: unknown = Reflect.apply(buildJsonResponse, undefined, [
    req,
    data,
  ])
  if (result instanceof Response) {
    return result
  }
  throw new TypeError("buildJsonResponse returned an invalid value")
}

describe("endpoint utilities", () => {
  beforeEach(() => {
    headersWithCorsMock.mockClear()
  })

  it("getQueryParam normalizes null and undefined values", () => {
    const req = {
      url: "http://localhost?foo=null&bar=undefined&baz=value",
    }
    expect(callGetQueryParam(req, "foo")).toBeUndefined()
    expect(callGetQueryParam(req, "bar")).toBeUndefined()
    expect(callGetQueryParam(req, "baz")).toBe("value")
  })

  it("getLocaleFromRequest returns valid locale or all", () => {
    const baseReq = {
      payload: {
        config: {
          localization: { localeCodes: ["en", "cs"] },
        },
      },
    }

    const reqAll = { ...baseReq, url: "http://localhost?locale=all" }
    expect(callGetLocaleFromRequest(reqAll)).toBe("all")

    const reqValid = { ...baseReq, url: "http://localhost?locale=cs" }
    expect(callGetLocaleFromRequest(reqValid)).toBe("cs")

    const reqInvalid = { ...baseReq, url: "http://localhost?locale=de" }
    expect(callGetLocaleFromRequest(reqInvalid)).toBeUndefined()
  })

  it("buildJsonResponse returns JSON with CORS headers", async () => {
    const req = { url: "http://localhost" }
    const response = callBuildJsonResponse(req, { ok: true })

    expect(headersWithCorsMock).toHaveBeenCalledOnce()
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/json")
    await expect(response.json()).resolves.toStrictEqual({ ok: true })
  })
})

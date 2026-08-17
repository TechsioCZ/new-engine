import "next/dist/server/node-environment-baseline"
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it } from "vitest"
import { config, proxy } from "./proxy"

const originalProbeGate = process.env.URL_ARCHITECTURE_M00_ENABLED

const request = (pathname: string, host = "herbatica.sk", method = "GET") =>
  new NextRequest(`https://${host}${pathname}`, {
    headers: { host },
    method,
  })

afterEach(() => {
  if (originalProbeGate === undefined) {
    Reflect.deleteProperty(process.env, "URL_ARCHITECTURE_M00_ENABLED")
  } else {
    process.env.URL_ARCHITECTURE_M00_ENABLED = originalProbeGate
  }
})

describe("M00 proxy adapter", () => {
  it("is statically scoped to the public probe and internal namespace", () => {
    expect(config.matcher).toEqual(["/__url-m00/:path*", "/~sf/:path*"])
  })

  it("preserves the raw query while rewriting a trusted market host", () => {
    process.env.URL_ARCHITECTURE_M00_ENABLED = "1"

    const response = proxy(
      request("/__url-m00/current?variant=SKU-AbC-01", "herbatica.cz")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://herbatica.cz/~sf/cz/__m00/current?variant=SKU-AbC-01"
    )
  })

  it("keeps the normalized adapter origin for an internal rewrite", () => {
    process.env.URL_ARCHITECTURE_M00_ENABLED = "1"
    const standaloneRequest = new NextRequest(
      "http://127.0.0.1:32145/__url-m00/current",
      { headers: { host: "herbatica.sk" } }
    )

    expect(proxy(standaloneRequest).headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:32145/~sf/sk/__m00/current"
    )
  })

  it("scrubs spoofed router and storefront-internal request headers", () => {
    process.env.URL_ARCHITECTURE_M00_ENABLED = "1"
    const spoofedRequest = new NextRequest(
      "https://herbatica.sk/__url-m00/current",
      {
        headers: {
          host: "herbatica.sk",
          "next-router-prefetch": "1",
          "next-router-state-tree": "%5B%22%22%5D",
          rsc: "1",
          "x-market-code": "attacker-controlled",
          "x-nextjs-data": "1",
          "x-sf-market": "attacker-controlled",
        },
      }
    )

    const response = proxy(spoofedRequest)
    const overridden = new Set(
      response.headers
        .get("x-middleware-override-headers")
        ?.split(",")
        .filter(Boolean)
    )

    expect(overridden.has("host")).toBe(true)
    expect(overridden.has("rsc")).toBe(false)
    expect(overridden.has("next-router-prefetch")).toBe(false)
    expect(overridden.has("next-router-state-tree")).toBe(false)
    expect(overridden.has("x-nextjs-data")).toBe(false)
    expect(overridden.has("x-market-code")).toBe(false)
    expect(overridden.has("x-sf-market")).toBe(true)
    expect(response.headers.has("x-middleware-request-rsc")).toBe(false)
    expect(response.headers.get("x-middleware-request-x-sf-market")).toBe("sk")
    expect(
      response.headers.get("x-middleware-request-x-sf-canonical-origin")
    ).toBe("https://herbatica.sk")
    expect(response.headers.get("x-middleware-request-x-sf-route-key")).toBe(
      "m00.status"
    )
    expect(response.headers.get("x-middleware-request-x-sf-public-path")).toBe(
      "/__url-m00/current"
    )
  })

  it.each([
    ["OPTIONS", 204],
    ["POST", 405],
    ["PUT", 405],
    ["PATCH", 405],
    ["DELETE", 405],
  ])("returns the public page method outcome for %s", (method, status) => {
    process.env.URL_ARCHITECTURE_M00_ENABLED = "1"

    const response = proxy(request("/__url-m00/current", undefined, method))

    expect(response.status).toBe(status)
    expect(response.headers.get("allow")).toBe("GET, HEAD")
    expect(response.headers.has("x-middleware-rewrite")).toBe(false)
  })

  it("fails closed when the probe is disabled", () => {
    Reflect.deleteProperty(process.env, "URL_ARCHITECTURE_M00_ENABLED")

    expect(proxy(request("/__url-m00/current")).status).toBe(404)
  })

  it("returns 421 for an unknown host", () => {
    process.env.URL_ARCHITECTURE_M00_ENABLED = "1"

    expect(proxy(request("/__url-m00/current", "unknown.example")).status).toBe(
      421
    )
  })

  it("never exposes the internal Pages namespace", () => {
    process.env.URL_ARCHITECTURE_M00_ENABLED = "1"

    expect(proxy(request("/~sf/sk/__m00/current")).status).toBe(404)
    expect(
      proxy(request("/_next/data/build-123/~sf/sk/__m00/current.json")).status
    ).toBe(404)
  })
})

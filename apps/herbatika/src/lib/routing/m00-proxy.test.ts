import { describe, expect, it } from "vitest"
import { resolveM00ProxyAction } from "./m00-proxy"

describe("resolveM00ProxyAction", () => {
  it.each([
    "/~sf/sk/__m00/current",
    "/~SF/sk/__m00/current",
    "/%7Esf/sk/__m00/current",
    "/%257Esf/sk/__m00/current",
    "/_next/data/build-123/~sf/sk/__m00/current.json",
    "/_next/data/build-123/%257Esf/sk/__m00/current.json",
  ])("blocks direct internal path probe %s", (pathname) => {
    expect(
      resolveM00ProxyAction({
        enabled: false,
        host: "herbatica.sk",
        method: "GET",
        pathname,
      })
    ).toEqual({ kind: "respond", status: 404 })
  })

  it("returns 404 when the server-only probe gate is disabled", () => {
    expect(
      resolveM00ProxyAction({
        enabled: false,
        host: "herbatica.sk",
        method: "GET",
        pathname: "/__url-m00/current",
      })
    ).toEqual({ kind: "respond", status: 404 })
  })

  it.each([
    ["herbatica.sk", "sk", "https://herbatica.sk"],
    ["HERBATICA.CZ:443", "cz", "https://herbatica.cz"],
    ["herbatica.hu.", "hu", "https://herbatica.hu"],
    ["herbatica.ro:3001", "ro", "https://herbatica.ro"],
  ])("rewrites the canonical host %s to market %s", (host, market, origin) => {
    expect(
      resolveM00ProxyAction({
        enabled: true,
        host,
        method: "GET",
        pathname: "/__url-m00/gone",
      })
    ).toEqual({
      canonicalOrigin: origin,
      kind: "rewrite",
      market,
      pathname: `/~sf/${market}/__m00/gone`,
      publicPath: "/__url-m00/gone",
      routeKey: "m00.status",
    })
  })

  it.each([
    null,
    "unknown.example",
    "herbatica.sk,evil.example",
    "https://herbatica.sk",
    "herbatica.sk:bad",
    "herbatica.sk:65536",
  ])("fails closed for an invalid or unknown authority %s", (host) => {
    expect(
      resolveM00ProxyAction({
        enabled: true,
        host,
        method: "GET",
        pathname: "/__url-m00/current",
      })
    ).toEqual({ kind: "respond", status: 421 })
  })

  it.each([
    ["OPTIONS", 204],
    ["POST", 405],
    ["PUT", 405],
    ["PATCH", 405],
    ["DELETE", 405],
  ])("rejects the non-rendering %s method with %s", (method, status) => {
    expect(
      resolveM00ProxyAction({
        enabled: true,
        host: "herbatica.sk",
        method,
        pathname: "/__url-m00/current",
      })
    ).toEqual({ allow: "GET, HEAD", kind: "respond", status })
  })

  it("does not claim unrelated public routes", () => {
    expect(
      resolveM00ProxyAction({
        enabled: true,
        host: "herbatica.sk",
        method: "GET",
        pathname: "/faq",
      })
    ).toEqual({ kind: "next" })
  })
})

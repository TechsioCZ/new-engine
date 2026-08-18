import { describe, expect, it } from "vitest"
import { resolveProductProxyAction } from "./product-proxy"

describe("resolveProductProxyAction", () => {
  it.each([
    ["herbatica.sk", "/produkty/zeleny-caj", "sk"],
    ["herbatica.cz", "/produkty/zeleny-caj", "cz"],
    ["herbatica.hu", "/termekek/zold-tea", "hu"],
    ["herbatica.ro", "/produse/ceai-verde", "ro"],
  ])("rewrites %s%s to the market product page", (host, pathname, market) => {
    expect(
      resolveProductProxyAction({
        enabled: true,
        host,
        method: "GET",
        pathname,
      })
    ).toEqual({
      canonicalOrigin: `https://${host}`,
      kind: "rewrite",
      market,
      pathname: `/~sf/${market}/products/${pathname.split("/").at(-1)}`,
      publicPath: pathname,
      routeKey: "product.detail",
    })
  })

  it("does not claim product routes while the feature is disabled", () => {
    expect(
      resolveProductProxyAction({
        enabled: false,
        host: "herbatica.sk",
        method: "GET",
        pathname: "/produkty/zeleny-caj",
      })
    ).toEqual({ kind: "next" })
  })

  it("returns 421 for an unknown host on a recognizable product path", () => {
    expect(
      resolveProductProxyAction({
        enabled: true,
        host: "unknown.example",
        method: "GET",
        pathname: "/produkty/zeleny-caj",
      })
    ).toEqual({ kind: "respond", status: 421 })
  })

  it.each([
    "constructor",
    "toString",
  ])("fails closed for a prototype-named authority %s", (host) => {
    expect(
      resolveProductProxyAction({
        enabled: true,
        host,
        method: "GET",
        pathname: "/produkty/zeleny-caj",
      })
    ).toEqual({ kind: "respond", status: 421 })
  })

  it("fails closed for a noncanonical authority until composed redirects are enabled", () => {
    expect(
      resolveProductProxyAction({
        enabled: true,
        host: "HERBATICA.CZ:443",
        method: "HEAD",
        pathname: "/produkty/zeleny-caj",
      })
    ).toEqual({ kind: "respond", status: 421 })
  })

  it("returns 404 when the localized prefix belongs to another market", () => {
    expect(
      resolveProductProxyAction({
        enabled: true,
        host: "herbatica.hu",
        method: "GET",
        pathname: "/produkty/zeleny-caj",
      })
    ).toEqual({ kind: "respond", status: 404 })
  })

  it.each([
    "",
    "UPPERCASE",
    "two--hyphens",
    "extra/path",
    "api",
  ])("returns 404 for a noncanonical product slug %s", (slug) => {
    expect(
      resolveProductProxyAction({
        enabled: true,
        host: "herbatica.sk",
        method: "GET",
        pathname: `/produkty/${slug}`,
      })
    ).toEqual({ kind: "respond", status: 404 })
  })

  it.each([
    ["GET", 404, undefined],
    ["HEAD", 404, undefined],
    ["OPTIONS", 204, "GET, HEAD"],
    ["POST", 405, "GET, HEAD"],
  ])("applies the final method contract to an invalid slug for %s", (method, status, allow) => {
    expect(
      resolveProductProxyAction({
        enabled: true,
        host: "herbatica.sk",
        method,
        pathname: "/produkty/UPPERCASE",
      })
    ).toEqual({
      ...(allow === undefined ? {} : { allow }),
      kind: "respond",
      status,
    })
  })

  it.each([
    ["OPTIONS", 204],
    ["POST", 405],
    ["PUT", 405],
    ["PATCH", 405],
    ["DELETE", 405],
  ])("owns the product page method contract for %s", (method, status) => {
    expect(
      resolveProductProxyAction({
        enabled: true,
        host: "herbatica.sk",
        method,
        pathname: "/produkty/zeleny-caj",
      })
    ).toEqual({ allow: "GET, HEAD", kind: "respond", status })
  })

  it("does not claim product indexes or unrelated paths", () => {
    expect(
      resolveProductProxyAction({
        enabled: true,
        host: "herbatica.sk",
        method: "GET",
        pathname: "/produkty",
      })
    ).toEqual({ kind: "next" })
    expect(
      resolveProductProxyAction({
        enabled: true,
        host: "herbatica.sk",
        method: "GET",
        pathname: "/faq",
      })
    ).toEqual({ kind: "next" })
  })
})

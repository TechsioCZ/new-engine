import { describe, expect, it } from "vitest"
import { MARKETS } from "@/lib/url/segments"
import {
  LEGACY_OFFICIAL_PATH_REDIRECTS,
  resolveLegacyOfficialCategoryRedirect,
} from "./legacy-official-redirects"
import { resolvePublicProxyAction } from "./public-proxy"

const REGISTRY_SLUG_GRAMMAR = /^[a-z0-9-]+$/

const ROUTING_ENVIRONMENT = {
  ALLOWED_MARKETS: "sk,cz,hu,ro",
  MARKET_ACCEPTED_HOSTS_CZ: "herbatica.cz",
  MARKET_ACCEPTED_HOSTS_HU: "herbatica.hu",
  MARKET_ACCEPTED_HOSTS_RO: "herbatica.ro",
  MARKET_ACCEPTED_HOSTS_SK: "herbatica.sk",
} as const

const resolve = (
  pathname: string,
  overrides: Partial<Parameters<typeof resolvePublicProxyAction>[0]> = {}
) =>
  resolvePublicProxyAction({
    enabled: true,
    environment: ROUTING_ENVIRONMENT,
    host: "herbatica.sk",
    method: "GET",
    pathname,
    resolveUnknownStaticPaths: true,
    ...overrides,
  })

describe("legacy official category redirects", () => {
  it("maps the SK underscore hair-loss slug to the current category path", () => {
    expect(
      resolveLegacyOfficialCategoryRedirect("sk", [
        "kategorie",
        "vlasy_vypadavanie_lupiny",
      ])
    ).toBe("/kategorie/podpora-a-rast-vlasov")
  })

  it("redirects the legacy path permanently through the proxy", () => {
    expect(resolve("/kategorie/vlasy_vypadavanie_lupiny")).toEqual({
      kind: "redirect",
      location: "/kategorie/podpora-a-rast-vlasov",
      status: 308,
    })
  })

  it("accepts the legacy slug case-insensitively", () => {
    expect(resolve("/KATEGORIE/VLASY_VYPADAVANIE_LUPINY")).toEqual({
      kind: "redirect",
      location: "/kategorie/podpora-a-rast-vlasov",
      status: 308,
    })
  })

  it("keeps the legacy table scoped to its own market", () => {
    expect(
      resolveLegacyOfficialCategoryRedirect("cz", [
        "kategorie",
        "vlasy_vypadavanie_lupiny",
      ])
    ).toBeNull()
    expect(
      resolve("/kategorie/vlasy_vypadavanie_lupiny", { host: "herbatica.cz" })
    ).not.toMatchObject({ kind: "redirect" })
  })

  it("does not redirect unmapped grammar-violating paths", () => {
    expect(resolve("/kategorie/doprava_platby")).not.toMatchObject({
      kind: "redirect",
    })
    expect(resolve("/kategorie/junk_slug_xyz")).not.toMatchObject({
      kind: "redirect",
    })
  })

  it("only matches the category root, not other type prefixes or depths", () => {
    expect(
      resolveLegacyOfficialCategoryRedirect("sk", [
        "produkty",
        "vlasy_vypadavanie_lupiny",
      ])
    ).toBeNull()
    expect(
      resolveLegacyOfficialCategoryRedirect("sk", ["vlasy_vypadavanie_lupiny"])
    ).toBeNull()
    expect(
      resolveLegacyOfficialCategoryRedirect("sk", [
        "kategorie",
        "vlasy_vypadavanie_lupiny",
        "extra",
      ])
    ).toBeNull()
  })

  it("keeps the proxy method grammar closed on legacy paths", () => {
    expect(
      resolve("/kategorie/vlasy_vypadavanie_lupiny", { method: "POST" })
    ).toEqual({ allow: "GET, HEAD", kind: "respond", status: 405 })
    expect(
      resolve("/kategorie/vlasy_vypadavanie_lupiny", { method: "OPTIONS" })
    ).toEqual({ allow: "GET, HEAD", kind: "respond", status: 204 })
  })

  it("declares a table entry for every market", () => {
    for (const market of MARKETS) {
      expect(LEGACY_OFFICIAL_PATH_REDIRECTS[market]).toBeDefined()
    }
  })

  it("only maps targets that satisfy the registry slug grammar", () => {
    for (const market of MARKETS) {
      for (const target of Object.values(
        LEGACY_OFFICIAL_PATH_REDIRECTS[market]
      )) {
        expect(target).toMatch(REGISTRY_SLUG_GRAMMAR)
      }
    }
  })
})

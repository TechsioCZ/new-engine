import { describe, expect, it } from "vitest"
import { MARKETS } from "@/lib/url/segments"
import {
  OFFICIAL_STATIC_PATH_REDIRECTS,
  resolveOfficialStaticRedirect,
} from "./official-static-redirects"
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

describe("official static/legal redirects", () => {
  it("maps the SK official privacy slug to the local information page", () => {
    expect(resolveOfficialStaticRedirect("sk", ["poou"])).toBe(
      "/informacie/ochrana-osobnych-udajov"
    )
  })

  it("redirects an SK official slug permanently through the proxy", () => {
    expect(resolve("/vernost")).toEqual({
      kind: "redirect",
      location: "/informacie/vernost",
      status: 308,
    })
  })

  it("redirects a CZ official slug permanently through the proxy", () => {
    expect(resolve("/doprava-platby", { host: "herbatica.cz" })).toEqual({
      kind: "redirect",
      location: "/informace/doprava-a-platby",
      status: 308,
    })
  })

  it("redirects a HU official slug permanently through the proxy", () => {
    expect(resolve("/szallitas-es-fizetes", { host: "herbatica.hu" })).toEqual({
      kind: "redirect",
      location: "/informaciok/szallitas-es-fizetes",
      status: 308,
    })
  })

  it("redirects an RO official slug permanently through the proxy", () => {
    expect(resolve("/kontakt", { host: "herbatica.ro" })).toEqual({
      kind: "redirect",
      location: "/informatii/contact",
      status: 308,
    })
  })

  it("accepts the official slug case-insensitively", () => {
    expect(resolve("/VERNOST")).toEqual({
      kind: "redirect",
      location: "/informacie/vernost",
      status: 308,
    })
  })

  it("does not redirect an unknown static slug (passes through)", () => {
    expect(resolve("/junk-slug-xyz")).not.toMatchObject({ kind: "redirect" })
  })

  it("keeps the table scoped to its own market", () => {
    expect(resolveOfficialStaticRedirect("cz", ["vernost"])).toBeNull()
    expect(resolve("/vernost", { host: "herbatica.cz" })).not.toMatchObject({
      kind: "redirect",
    })
  })

  it("only matches a single root segment, never deeper or shallower paths", () => {
    expect(resolveOfficialStaticRedirect("sk", [])).toBeNull()
    expect(resolveOfficialStaticRedirect("sk", ["vernost", "extra"])).toBeNull()
    expect(
      resolveOfficialStaticRedirect("sk", ["kategorie", "vernost"])
    ).toBeNull()
  })

  it("keeps the proxy method grammar closed on official static paths", () => {
    expect(resolve("/vernost", { method: "POST" })).toEqual({
      allow: "GET, HEAD",
      kind: "respond",
      status: 405,
    })
    expect(resolve("/vernost", { method: "OPTIONS" })).toEqual({
      allow: "GET, HEAD",
      kind: "respond",
      status: 204,
    })
  })

  it("declares a table entry for every market", () => {
    for (const market of MARKETS) {
      expect(OFFICIAL_STATIC_PATH_REDIRECTS[market]).toBeDefined()
    }
  })

  it("only maps targets that satisfy the registry slug grammar", () => {
    for (const market of MARKETS) {
      for (const target of Object.values(
        OFFICIAL_STATIC_PATH_REDIRECTS[market]
      )) {
        expect(target).toMatch(REGISTRY_SLUG_GRAMMAR)
      }
    }
  })
})

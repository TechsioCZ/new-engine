import { describe, expect, it } from "vitest"
import type {
  MarketRuntime,
  MarketRuntimeBinding,
} from "@/lib/market/market-runtime"
import {
  resolveSystemHost,
  systemHostFailureResponse,
  systemOptionsResponse,
  toHeadResponse,
} from "./system-response"

const binding = {
  acceptedHosts: ["herbatica.cz"],
  canonicalOrigin: "https://herbatica.cz",
  countryCode: "CZ",
  locale: "cs-CZ",
  market: "cz",
  publishableApiKey: "pk_cz",
  publishableApiKeyId: "pkid_cz",
  regionId: "reg_cz",
  salesChannelId: "sc_cz",
} as const satisfies MarketRuntimeBinding

const runtime = {
  allowedMarkets: ["cz"],
  bindings: { cz: binding },
  marketByHost: { "herbatica.cz": "cz" },
} as const satisfies MarketRuntime

describe("system host boundary", () => {
  it("resolves only the raw Host authority", () => {
    const request = new Request("https://internal/robots.txt", {
      headers: {
        host: "herbatica.cz",
        "x-forwarded-host": "attacker.example",
      },
    })
    expect(
      resolveSystemHost(request, {
        getRuntime: () => runtime,
        resolveMarket: (_runtime, host) =>
          host === "herbatica.cz" ? binding : null,
      })
    ).toEqual({ binding, kind: "found" })
  })

  it("maps unknown hosts to 421 without caching", async () => {
    const resolution = resolveSystemHost(
      new Request("https://internal/sitemap.xml", {
        headers: { host: "unknown.example" },
      }),
      { getRuntime: () => runtime, resolveMarket: () => null }
    )
    expect(resolution).toEqual({ kind: "unknown-host" })
    if (resolution.kind === "found") {
      throw new Error("Expected unknown host")
    }
    const response = systemHostFailureResponse(resolution)
    expect(response.status).toBe(421)
    expect(response.headers.get("cache-control")).toContain("no-store")
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(await response.text()).toBe("Misdirected Request\n")
  })

  it("maps runtime configuration failures to retryable 503", () => {
    const resolution = resolveSystemHost(
      new Request("https://internal/manifest.webmanifest"),
      {
        getRuntime: () => {
          throw new Error("invalid market runtime")
        },
        resolveMarket: () => null,
      }
    )
    if (resolution.kind === "found") {
      throw new Error("Expected configuration failure")
    }
    const response = systemHostFailureResponse(resolution)
    expect(response.status).toBe(503)
    expect(response.headers.get("retry-after")).toBe("60")
  })

  it("preserves status and headers for HEAD and advertises GET/HEAD", async () => {
    const getResponse = new Response("payload", {
      headers: { "content-type": "application/xml" },
      status: 503,
    })
    const headResponse = toHeadResponse(getResponse)
    expect(headResponse.status).toBe(503)
    expect(headResponse.headers.get("content-type")).toBe("application/xml")
    expect(await headResponse.text()).toBe("")

    const options = systemOptionsResponse()
    expect(options.status).toBe(204)
    expect(options.headers.get("allow")).toBe("GET, HEAD")
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  resetUrlRegistryForTests,
  setUrlRegistryForTests,
} from "@/lib/url-registry/factory"
import { InMemoryUrlRegistry } from "@/lib/url-registry/memory"
import { GET, HEAD } from "./route"

const hosts = {
  sk: "herbatica.sk",
  cz: "herbatica.cz",
  hu: "herbatica.hu",
  ro: "herbatica.ro",
} as const

const requestFor = (host: string, marketHeader?: string) =>
  new Request("https://route.test/sitemaps/home-1.xml", {
    headers: {
      host,
      ...(marketHeader === undefined ? {} : { "x-sf-market": marketHeader }),
    },
  })

const contextFor = (shard: string) => ({
  params: Promise.resolve({ shard }),
})

beforeEach(() => {
  setUrlRegistryForTests(new InMemoryUrlRegistry())
})

afterEach(() => {
  resetUrlRegistryForTests()
})

describe("public sitemap shard handler", () => {
  it.each(
    Object.entries(hosts)
  )("serves the documented home shard for %s from Host", async (market, host) => {
    const response = await GET(
      requestFor(host, market === "sk" ? "hu" : "sk"),
      contextFor("home-1.xml")
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toContain(`<loc>https://${host}</loc>`)
  })

  it("returns 404 for unknown and empty shards", async () => {
    for (const shard of ["unknown-1.xml", "product-1.xml", "home-2.xml"]) {
      const response = await GET(requestFor("herbatica.sk"), contextFor(shard))
      expect(response.status).toBe(404)
    }
  })

  it("returns 421 for an unknown Host before serving a shard", async () => {
    const response = await GET(
      requestFor("unknown.example"),
      contextFor("home-1.xml")
    )
    expect(response.status).toBe(421)
  })

  it("serves HEAD headers and status without a response body", async () => {
    const response = await HEAD(
      requestFor("herbatica.hu"),
      contextFor("home-1.xml")
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8"
    )
    expect(await response.text()).toBe("")
  })
})

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
  new Request("https://route.test/sitemap.xml", {
    headers: {
      host,
      ...(marketHeader === undefined ? {} : { "x-sf-market": marketHeader }),
    },
  })

beforeEach(() => {
  setUrlRegistryForTests(new InMemoryUrlRegistry())
})

afterEach(() => {
  resetUrlRegistryForTests()
})

describe("public sitemap index handler", () => {
  it.each(
    Object.entries(hosts)
  )("derives %s exclusively from its validated Host", async (market, host) => {
    const response = await GET(requestFor(host, market === "sk" ? "hu" : "sk"))
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8"
    )
    const xml = await response.text()
    expect(xml).toContain(`https://${host}/sitemaps/home-1.xml`)
    expect(xml).not.toContain("product-1.xml")
  })

  it("returns 421 for an unknown Host", async () => {
    expect((await GET(requestFor("unknown.example"))).status).toBe(421)
  })

  it("serves HEAD headers and status without a response body", async () => {
    const response = await HEAD(requestFor("herbatica.ro"))
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8"
    )
    expect(await response.text()).toBe("")
  })
})

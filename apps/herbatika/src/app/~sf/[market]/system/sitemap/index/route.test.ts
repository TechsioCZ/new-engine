import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  resetUrlRegistryForTests,
  setUrlRegistryForTests,
} from "@/lib/url-registry/factory"
import { InMemoryUrlRegistry } from "@/lib/url-registry/memory"
import { GET } from "./route"

beforeEach(() => {
  setUrlRegistryForTests(new InMemoryUrlRegistry())
})

afterEach(() => {
  resetUrlRegistryForTests()
})

describe("internal sitemap index handler", () => {
  it("uses the validated market and registry snapshot", async () => {
    const response = await GET(new Request("http://internal"), {
      params: Promise.resolve({ market: "ro" }),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe(
      "application/xml; charset=utf-8"
    )
    const xml = await response.text()
    expect(xml).toContain("https://herbatica.ro/sitemaps/home-1.xml")
    expect(xml).not.toContain("product-1.xml")
  })
})

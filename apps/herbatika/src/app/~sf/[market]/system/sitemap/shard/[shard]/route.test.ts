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

describe("internal sitemap shard handler", () => {
  it("serves the documented home shard", async () => {
    const response = await GET(new Request("http://internal"), {
      params: Promise.resolve({ market: "cz", shard: "home-1.xml" }),
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain("<loc>https://herbatica.cz</loc>")
  })

  it("returns 404 for unknown and empty shards", async () => {
    for (const shard of ["unknown-1.xml", "product-1.xml", "home-2.xml"]) {
      const response = await GET(new Request("http://internal"), {
        params: Promise.resolve({ market: "sk", shard }),
      })
      expect(response.status).toBe(404)
    }
  })
})

import { afterEach, describe, expect, it } from "vitest"
import { GET } from "./route"

const originalAllowedMarkets = process.env.ALLOWED_MARKETS

afterEach(() => {
  if (originalAllowedMarkets === undefined) {
    process.env.ALLOWED_MARKETS = undefined
  } else {
    process.env.ALLOWED_MARKETS = originalAllowedMarkets
  }
})

describe("internal robots handler", () => {
  it("uses the validated proxy-injected market parameter", async () => {
    const response = await GET(new Request("http://internal"), {
      params: Promise.resolve({ market: "hu" }),
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain(
      "Sitemap: https://herbatica.hu/sitemap.xml"
    )
  })

  it("rejects unknown and deployment-disabled markets", async () => {
    process.env.ALLOWED_MARKETS = "cz"
    for (const market of ["sk", "xx"]) {
      const response = await GET(new Request("http://internal"), {
        params: Promise.resolve({ market }),
      })
      expect(response.status).toBe(404)
    }
  })
})

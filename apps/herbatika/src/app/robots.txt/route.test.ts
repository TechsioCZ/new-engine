import { describe, expect, it } from "vitest"
import { GET, HEAD } from "./route"

const hosts = {
  sk: "herbatica.sk",
  cz: "herbatica.cz",
  hu: "herbatica.hu",
  ro: "herbatica.ro",
} as const

const requestFor = (host: string, marketHeader?: string) =>
  new Request("https://route.test/robots.txt", {
    headers: {
      host,
      ...(marketHeader === undefined ? {} : { "x-sf-market": marketHeader }),
    },
  })

describe("public robots handler", () => {
  it.each(
    Object.entries(hosts)
  )("derives %s exclusively from its validated Host", async (market, host) => {
    const response = GET(requestFor(host, market === "sk" ? "hu" : "sk"))
    expect(response.status).toBe(200)
    expect(await response.text()).toContain(
      `Sitemap: https://${host}/sitemap.xml`
    )
  })

  it("returns 421 for an unknown or absent Host", () => {
    expect(GET(requestFor("unknown.example")).status).toBe(421)
    expect(GET(new Request("https://route.test/robots.txt")).status).toBe(421)
  })

  it("serves HEAD headers and status without a response body", async () => {
    const response = HEAD(requestFor("herbatica.cz"))
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8"
    )
    expect(await response.text()).toBe("")
  })
})

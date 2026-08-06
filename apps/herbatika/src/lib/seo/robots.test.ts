import { describe, expect, it } from "vitest"
import { buildRobotsTxt } from "./robots"

const hosts = {
  sk: "herbatica.sk",
  cz: "herbatica.cz",
  hu: "herbatica.hu",
  ro: "herbatica.ro",
} as const

describe("per-market robots", () => {
  it.each(
    Object.entries(hosts)
  )("blocks only internal/API paths and localizes sitemap for %s", (market, host) => {
    expect(buildRobotsTxt(market as keyof typeof hosts)).toBe(
      `User-agent: *\nDisallow: /~sf/\nDisallow: /api/\n\nSitemap: https://${host}/sitemap.xml\n`
    )
  })
})

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
  )("blocks internal/API and localized public flows for %s", (market, host) => {
    const robots = buildRobotsTxt(market as keyof typeof hosts)
    expect(robots).toContain("Disallow: /~sf/")
    expect(robots).toContain("Disallow: /api/")
    expect(robots.match(/Disallow:/g)).toHaveLength(6)
    expect(robots).toContain(`Sitemap: https://${host}/sitemap.xml`)
  })
})

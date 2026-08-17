import { describe, expect, it } from "vitest"
import nextConfig from "./next.config"

describe("URL architecture release flags", () => {
  it("keeps framework URL normalization and Cache Components disabled", () => {
    expect(nextConfig.cacheComponents).toBe(false)
    expect(nextConfig.skipProxyUrlNormalize).toBe(true)
    expect(nextConfig.skipTrailingSlashRedirect).toBe(true)
  })

  it("has no framework-owned application redirects", async () => {
    expect(nextConfig.redirects).toBeTypeOf("function")
    await expect(nextConfig.redirects?.()).resolves.toEqual([])
  })
})

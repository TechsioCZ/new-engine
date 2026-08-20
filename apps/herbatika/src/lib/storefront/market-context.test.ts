import { describe, expect, it } from "vitest"
import {
  resolveMarketContext,
  resolveMarketRequestHost,
} from "./market-context"

describe("resolveMarketContext", () => {
  it("resolves the primary Zane test domain as the Slovak market", () => {
    expect(
      resolveMarketContext({
        host: "test-engine-herbatika-zane.web-revolution.cz",
      })
    ).toMatchObject({
      code: "sk",
      countryCode: "sk",
      locale: "sk-SK",
    })
  })

  it("resolves the Zane Romanian test domain as the Romanian market", () => {
    expect(
      resolveMarketContext({
        host: "test-engine-herbatika-ro-zane.web-revolution.cz",
      })
    ).toMatchObject({
      code: "ro",
      countryCode: "ro",
      locale: "ro-RO",
    })
  })

  it("prefers the public Host header over a proxy forwarded host", () => {
    expect(
      resolveMarketRequestHost({
        forwardedHost: "zn-herbatika.internal",
        host: "test-engine-herbatika-ro-zane.web-revolution.cz",
      })
    ).toBe("test-engine-herbatika-ro-zane.web-revolution.cz")
  })
})

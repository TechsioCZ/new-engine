import { describe, expect, it } from "vitest"
import { resolveMarketContext } from "./market-context"

describe("resolveMarketContext", () => {
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
})

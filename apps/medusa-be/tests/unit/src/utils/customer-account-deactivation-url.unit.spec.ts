import { describe, expect, it } from "vitest"
import { buildCustomerAccountDeactivationUrl } from "../../../../src/utils/customer-account-deactivation"

describe("buildCustomerAccountDeactivationUrl", () => {
  it.each([
    [
      "sk",
      "https://herbatica.sk",
      "https://herbatica.sk/ucet/zrusenie-uctu?token=Token%2FExact%2BCase",
    ],
    [
      "cz",
      "https://herbatica.cz/ignored-path",
      "https://herbatica.cz/ucet/zruseni-uctu?token=Token%2FExact%2BCase",
    ],
    [
      "hu",
      "https://herbatica.hu",
      "https://herbatica.hu/fiok/fiok-torlese?token=Token%2FExact%2BCase",
    ],
    [
      "ro",
      "https://herbatica.ro",
      "https://herbatica.ro/cont/dezactivare-cont?token=Token%2FExact%2BCase",
    ],
  ] as const)("builds an encoded %s link on the canonical market origin", (market, storefrontBaseUrl, expectedUrl) => {
    expect(
      buildCustomerAccountDeactivationUrl(
        "Token/Exact+Case",
        storefrontBaseUrl,
        market
      )
    ).toBe(expectedUrl)
  })

  it("rejects an invalid storefront base URL", () => {
    expect(() =>
      buildCustomerAccountDeactivationUrl("token", "not-an-absolute-url", "sk")
    ).toThrow("Storefront public URL configuration is invalid")
  })
})

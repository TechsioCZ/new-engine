import { describe, expect, it } from "vitest"
import { buildCustomerAccountDeactivationUrl } from "../../../../src/utils/customer-account-deactivation"

describe("buildCustomerAccountDeactivationUrl", () => {
  it.each([
    [
      "https://herbatica.sk",
      "https://herbatica.sk/account/deactivate/confirm?token=token%2Fwith%2Bsymbols",
    ],
    [
      "https://herbatica.cz/ignored-path",
      "https://herbatica.cz/account/deactivate/confirm?token=token%2Fwith%2Bsymbols",
    ],
  ])("builds an encoded link on the canonical market origin %s", (storefrontBaseUrl, expectedUrl) => {
    expect(
      buildCustomerAccountDeactivationUrl(
        "token/with+symbols",
        storefrontBaseUrl
      )
    ).toBe(expectedUrl)
  })

  it("rejects an invalid storefront base URL", () => {
    expect(() =>
      buildCustomerAccountDeactivationUrl("token", "not-an-absolute-url")
    ).toThrow("storefront_base_url must be a valid absolute URL")
  })
})

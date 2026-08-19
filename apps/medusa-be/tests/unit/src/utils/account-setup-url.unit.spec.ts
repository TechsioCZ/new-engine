import { describe, expect, it } from "vitest"
import { buildAccountSetupUrl } from "../../../../src/utils/account-setup"

describe("buildAccountSetupUrl", () => {
  it.each([
    ["sk", "herbatica.sk", "/ucet/obnova-hesla"],
    ["cz", "herbatica.cz", "/ucet/obnova-hesla"],
    ["hu", "herbatica.hu", "/fiok/jelszo-visszaallitas"],
    ["ro", "herbatica.ro", "/cont/resetare-parola"],
  ] as const)("builds the exact %s account-setup path on its market origin", (market, domain, path) => {
    expect(
      buildAccountSetupUrl(
        "customer+market@example.test",
        "Token/Exact+Case",
        `https://${domain}/ignored-path`,
        market
      )
    ).toBe(
      `https://${domain}${path}?token=Token%2FExact%2BCase&email=customer%2Bmarket%40example.test&flow=account-setup`
    )
  })

  it("ignores the retired arbitrary URL template", () => {
    process.env.ACCOUNT_SETUP_URL_TEMPLATE =
      "https://legacy.example.test/customer/activate?token={TOKEN}"

    expect(
      buildAccountSetupUrl(
        "customer@example.test",
        "account-token",
        "https://herbatica.cz",
        "cz"
      )
    ).toBe(
      "https://herbatica.cz/ucet/obnova-hesla?token=account-token&email=customer%40example.test&flow=account-setup"
    )

    process.env.ACCOUNT_SETUP_URL_TEMPLATE = undefined
  })

  it("fails closed for an unknown market", () => {
    expect(() =>
      buildAccountSetupUrl(
        "customer@example.test",
        "token",
        "https://herbatica.sk",
        "de"
      )
    ).toThrow("Unsupported storefront market")
  })
})

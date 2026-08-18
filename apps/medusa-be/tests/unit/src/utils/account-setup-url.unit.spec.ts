import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { buildAccountSetupUrl } from "../../../../src/utils/account-setup"

describe("buildAccountSetupUrl", () => {
  beforeEach(() => {
    vi.stubEnv("ACCOUNT_SETUP_URL_TEMPLATE", "")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("builds the default account-setup link on the resolved market origin", () => {
    const url = buildAccountSetupUrl(
      "customer+sk@example.test",
      "token/value",
      "https://herbatica.sk/"
    )

    expect(url).toBe(
      "https://herbatica.sk/auth/reset-password?token=token%2Fvalue&email=customer%2Bsk%40example.test&flow=account-setup"
    )
  })

  it("keeps a configured path template but replaces its origin with the resolved market origin", () => {
    vi.stubEnv(
      "ACCOUNT_SETUP_URL_TEMPLATE",
      "https://legacy.example.test/customer/activate?token={TOKEN}&email={EMAIL}&campaign=welcome&flow=legacy"
    )

    const url = buildAccountSetupUrl(
      "customer@example.test",
      "account-token",
      "https://herbatica.cz/storefront-path"
    )

    expect(url).toBe(
      "https://herbatica.cz/customer/activate?token=account-token&email=customer%40example.test&campaign=welcome&flow=account-setup"
    )
  })
})

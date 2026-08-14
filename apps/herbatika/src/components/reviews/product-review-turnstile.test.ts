import { describe, expect, it } from "vitest"
import { resolveProductReviewTurnstileConfig } from "./product-review-turnstile-config"

describe("resolveProductReviewTurnstileConfig", () => {
  it("honors an explicit disabled flag even when a site key exists", () => {
    expect(
      resolveProductReviewTurnstileConfig({
        enabled: "0",
        siteKey: "site-key",
      })
    ).toEqual({
      enabled: false,
      siteKey: "site-key",
    })
  })

  it("reports an enabled but missing site key configuration", () => {
    expect(
      resolveProductReviewTurnstileConfig({
        enabled: "true",
        siteKey: " ",
      })
    ).toEqual({
      enabled: true,
      siteKey: "",
    })
  })

  it("enables Turnstile from the site key when no flag is configured", () => {
    expect(
      resolveProductReviewTurnstileConfig({
        siteKey: " site-key ",
      })
    ).toEqual({
      enabled: true,
      siteKey: "site-key",
    })
  })
})

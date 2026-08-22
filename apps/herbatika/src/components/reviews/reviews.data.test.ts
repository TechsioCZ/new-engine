import { describe, expect, it } from "vitest"
import { isProductReviewMarketSupported } from "@/lib/storefront/review-market-policy"
import { createReviewTrustSources } from "./reviews.data"

describe("review trust sources", () => {
  it("uses only live provider summaries and does not add a Google fallback", () => {
    const sources = createReviewTrustSources("sk", [
      {
        provider: "heureka",
        reviewCountLabel: "(321x)",
        scoreLabel: "98%",
      },
      null,
      {
        provider: "zbozi",
        reviewCountLabel: "(654x)",
        scoreLabel: "96%",
      },
    ])

    expect(sources.map(({ id }) => id)).toEqual(["heureka", "zbozi"])
    expect(sources.map(({ scoreLabel }) => scoreLabel)).toEqual(["98%", "96%"])
    expect(sources.map(({ reviewCountLabel }) => reviewCountLabel)).toEqual([
      "(321x)",
      "(654x)",
    ])
  })

  it("omits Slovak and Czech trust providers in the Romanian market", () => {
    const sources = createReviewTrustSources("ro", [
      {
        provider: "heureka",
        reviewCountLabel: "(321x)",
        scoreLabel: "98%",
      },
      {
        provider: "zbozi",
        reviewCountLabel: "(654x)",
        scoreLabel: "96%",
      },
    ])

    expect(sources).toEqual([])
  })

  it("offers the product review section on every market", () => {
    expect(
      (["sk", "cz", "hu", "ro"] as const).map(isProductReviewMarketSupported)
    ).toEqual([true, true, true, true])
  })
})

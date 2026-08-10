import { describe, expect, it } from "vitest"

import { isAcceptedProductHit, selectRankedProductIds } from "../search-results"

describe("strict product ranking", () => {
  it.each([
    ["missing", undefined],
    ["NaN", Number.NaN],
    ["positive infinity", Number.POSITIVE_INFINITY],
    ["negative infinity", Number.NEGATIVE_INFINITY],
  ])("rejects an exact hit with a %s ranking score", (_label, score) => {
    expect(
      isAcceptedProductHit(
        {
          ...(score === undefined ? {} : { _rankingScore: score }),
          search_identifiers_normalized: ["sku-123"],
          search_product_id: "prod_1",
        },
        "sku-123",
        0.98,
        true,
      ),
    ).toBeFalsy()
  })

  it("enforces the minimum score before strict prefix shortcuts", () => {
    expect(
      isAcceptedProductHit(
        {
          _rankingScore: 0.97,
          search_product_id: "prod_1",
          title: "Herbal Tea",
        },
        "Herbal",
        0.98,
        true,
      ),
    ).toBeFalsy()
    expect(
      isAcceptedProductHit(
        {
          _rankingScore: 0.98,
          search_product_id: "prod_1",
          title: "Herbal Tea",
        },
        "Herbal",
        0.98,
        true,
      ),
    ).toBeTruthy()
  })

  it("does not restore exact identifiers rejected by strict ranking", () => {
    const result = selectRankedProductIds(
      [
        {
          _rankingScore: 0.1,
          id: "product_1",
          search_identifiers_normalized: ["exact-123"],
        },
      ],
      "EXACT-123",
      0.98,
      true,
    )

    expect(result.exactIdentifierMatch).toBeFalsy()
    expect(result.matches).toStrictEqual([])
  })
})

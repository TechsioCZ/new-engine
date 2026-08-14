import { describe, expect, it } from "vitest"
import { normalizeHeurekaExternalReviews } from "../normalizers"

describe("normalizeHeurekaExternalReviews", () => {
  it("normalizes shop reviews and calculates trust data from the whole export", () => {
    const result = normalizeHeurekaExternalReviews(
      {
        reviews: {
          review: [
            {
              rating_id: "rating-new",
              unix_timestamp: "1720000000",
              total_rating: "90",
              summary: "Rýchle doručenie",
              pros: "Rýchlosť\nOchota",
              recommends: "1",
            },
            {
              rating_id: "rating-without-text",
              unix_timestamp: "1710000000",
              total_rating: "4",
              recommends: "0",
            },
          ],
        },
      },
      "shop"
    )

    expect(result.reviews).toHaveLength(1)
    expect(result.reviews[0]).toMatchObject({
      author: "Overený zákazník",
      id: "rating-new",
      kind: "shop",
      message: "Rýchle doručenie",
      positivePoints: ["Rýchlosť", "Ochota"],
      rating: 4.5,
      recommended: true,
      source: "heureka",
      verified: true,
    })
    expect(result.summary).toMatchObject({
      averageRating: 4.3,
      recommendationRate: 50,
      recommendationSampleCount: 2,
      recommendedCount: 1,
      reviewCountLabel: "(2 z exportu)",
    })
    expect(result.meta).toMatchObject({
      exportCount: 2,
      kind: "shop",
      textReviewCount: 1,
    })
  })

  it("carries nested product context into product reviews", () => {
    const result = normalizeHeurekaExternalReviews(
      {
        products: {
          product: {
            ean: "1234567890123",
            product_name: "Bylinkový čaj",
            url: "https://example.test/tea",
            reviews: {
              review: {
                rating: "10",
                rating_id: "product-rating",
                summary: "Výborný",
                unix_timestamp: "1720000000",
              },
            },
          },
        },
      },
      "product"
    )

    expect(result.reviews[0]).toMatchObject({
      id: "product-rating",
      product: {
        ean: "1234567890123",
        name: "Bylinkový čaj",
        url: "https://example.test/tea",
      },
      rating: 5,
    })
  })
})

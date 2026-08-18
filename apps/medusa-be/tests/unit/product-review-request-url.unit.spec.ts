import { describe, expect, it } from "vitest"
import {
  buildProductReviewRequestUrl,
  getReviewRequestCopy,
} from "../../src/utils/order-review-requests"

describe("product review request URL", () => {
  it("targets the Herbatika review-token route with the product ID", () => {
    expect(
      buildProductReviewRequestUrl({
        productId: "prod_123",
        storefrontUrl: "https://store.example.test/",
        token: "review_token",
      })
    ).toBe(
      "https://store.example.test/reviews/product/review_token?product_id=prod_123"
    )
  })

  it("encodes route and query values", () => {
    expect(
      buildProductReviewRequestUrl({
        productId: "prod id",
        storefrontUrl: "https://store.example.test///",
        token: "token/segment",
      })
    ).toBe(
      "https://store.example.test/reviews/product/token%2Fsegment?product_id=prod+id"
    )
  })

  it.each([
    [
      "sk-SK",
      "Napíšte recenziu produktu",
      "Podeľte sa o skúsenosť s produktom",
    ],
    ["cs-CZ", "Napište recenzi produktu", "Podělte se o zkušenost s produktem"],
    [
      "hu-HU",
      "Írjon véleményt a termékről",
      "Ossza meg a termékkel kapcsolatos tapasztalatait",
    ],
    [
      "ro-RO",
      "Scrieți o recenzie pentru produs",
      "Împărtășiți experiența dumneavoastră cu produsul",
    ],
  ])("provides localized %s review copy", (locale, action, message) => {
    expect(getReviewRequestCopy(locale)).toMatchObject({ action, message })
  })
})

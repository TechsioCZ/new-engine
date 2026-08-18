import { describe, expect, it } from "vitest"
import {
  createProductReviewFormSubmission,
  validateProductReviewForm,
} from "./product-review-form.utils"

const validationMessages = {
  authorNameRequired: "Zadejte jméno.",
  captchaRequired: "Dokončete ověření.",
  contentMinLength: "Text je příliš krátký.",
  ratingRequired: "Vyberte hodnocení.",
}

describe("product review form", () => {
  it("requires an author name and Turnstile token for a public review", () => {
    expect(
      validateProductReviewForm(
        {
          authorName: " ",
          content: "Skvělý produkt.",
          rating: 5,
          turnstileToken: null,
        },
        {
          messages: validationMessages,
          requireAuthorName: true,
          requireTurnstile: true,
        }
      )
    ).toEqual({
      authorName: validationMessages.authorNameRequired,
      turnstileToken: validationMessages.captchaRequired,
    })
  })

  it("builds the public submission without a client-generated title", () => {
    expect(
      createProductReviewFormSubmission({
        authorName: "  Jana  ",
        content: "  Skvělý produkt.  ",
        rating: 5,
        turnstileToken: "  turnstile-token  ",
      })
    ).toEqual({
      content: "Skvělý produkt.",
      name: "Jana",
      rating: 5,
      turnstileToken: "turnstile-token",
    })
  })

  it("keeps token-link submissions compatible without a submitted name", () => {
    expect(
      createProductReviewFormSubmission({
        authorName: "",
        content: "Funguje dobře.",
        rating: 4,
        turnstileToken: null,
      })
    ).toEqual({
      content: "Funguje dobře.",
      rating: 4,
    })
  })
})

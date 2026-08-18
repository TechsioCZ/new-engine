import { describe, expect, it } from "vitest"
import {
  type ProductReviewErrorMessages,
  resolveProductReviewSubmitErrorMessage,
} from "./product-review-errors"

const messages: ProductReviewErrorMessages = {
  authRequired: "auth",
  authorRequired: "author",
  captcha: "captcha",
  contentRequired: "content",
  duplicate: "duplicate",
  forbidden: "forbidden",
  generic: "generic",
  purchaseRequired: "purchase",
  ratingRequired: "rating",
  titleInvalid: "title",
  tokenExpired: "token-expired",
  tokenMismatch: "token-mismatch",
  tokenNotFound: "token-not-found",
  tokenUsed: "token-used",
  validation: "validation",
}

describe("resolveProductReviewSubmitErrorMessage", () => {
  it("maps a missing author name response to the author field message", () => {
    expect(
      resolveProductReviewSubmitErrorMessage(
        {
          message: "Review author name is required.",
          status: 400,
        },
        messages
      )
    ).toBe(messages.authorRequired)
  })

  it("maps Turnstile middleware errors to a safe captcha message", () => {
    expect(
      resolveProductReviewSubmitErrorMessage(
        {
          message: "Captcha verification failed",
          status: 400,
        },
        messages
      )
    ).toBe(messages.captcha)
  })
})

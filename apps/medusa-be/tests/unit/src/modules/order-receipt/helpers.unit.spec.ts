import { describe, expect, it } from "vitest"

import {
  estimateTextWidth,
  truncateToEstimatedWidth,
} from "../../../../../src/modules/order-receipt/helpers"

const CUSTOMER_X = 322
const RIGHT = 531
const CUSTOMER_MAX_WIDTH = RIGHT - CUSTOMER_X

describe("order receipt helpers", () => {
  it("truncates text to an estimated PDF column width", () => {
    const longEmail =
      "customer.name.with.a.very.long.email.address.for.receipts@example-commerce.test"

    const truncatedText = truncateToEstimatedWidth(
      longEmail,
      CUSTOMER_MAX_WIDTH,
      10
    )

    expect(truncatedText).not.toBe(longEmail)
    expect(truncatedText.endsWith(".")).toBe(true)
    expect(estimateTextWidth(truncatedText, 10)).toBeLessThanOrEqual(
      CUSTOMER_MAX_WIDTH
    )
  })

  it("truncates wide Helvetica glyphs within the PDF column width", () => {
    const wideCompanyName = "WWWWMMMMWWWWMMMMWWWWMMMM SPOL S R O"

    const truncatedText = truncateToEstimatedWidth(
      wideCompanyName,
      CUSTOMER_MAX_WIDTH,
      12,
      "F2"
    )

    expect(truncatedText).not.toBe(wideCompanyName)
    expect(truncatedText.endsWith(".")).toBe(true)
    expect(estimateTextWidth(truncatedText, 12, "F2")).toBeLessThanOrEqual(
      CUSTOMER_MAX_WIDTH
    )
  })

  it("keeps text unchanged when it already fits", () => {
    expect(
      truncateToEstimatedWidth("Customer Name", CUSTOMER_MAX_WIDTH, 10)
    ).toBe("Customer Name")
  })
})

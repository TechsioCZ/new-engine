import { describe, expect, it } from "vitest"

import {
  estimateTextWidth,
  wrapToEstimatedWidth,
} from "../../../../../src/modules/order-receipt/helpers"

const CUSTOMER_X = 322
const RIGHT = 531
const CUSTOMER_MAX_WIDTH = RIGHT - CUSTOMER_X

function linesFitWithinCustomerWidth(
  lines: string[],
  size = 10,
  font: "F1" | "F2" = "F1"
) {
  return lines.every(
    (line) => estimateTextWidth(line, size, font) <= CUSTOMER_MAX_WIDTH
  )
}

describe("order receipt helpers", () => {
  it("wraps spaced text to an estimated PDF column width", () => {
    const lines = wrapToEstimatedWidth(
      "Extremely Long Street Name With Building Complex And Several Descriptive Parts 12345/678",
      CUSTOMER_MAX_WIDTH,
      10
    )

    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join(" ")).toBe(
      "Extremely Long Street Name With Building Complex And Several Descriptive Parts 12345/678"
    )
    expect(linesFitWithinCustomerWidth(lines)).toBe(true)
  })

  it("splits long unbroken text to the estimated PDF column width", () => {
    const longEmail =
      "customer.name.with.a.very.long.email.address.for.receipts@example-commerce.test"
    const lines = wrapToEstimatedWidth(longEmail, CUSTOMER_MAX_WIDTH, 10)

    expect(lines.length).toBeGreaterThan(1)
    expect(lines.join("")).toBe(longEmail)
    expect(linesFitWithinCustomerWidth(lines)).toBe(true)
  })

  it("wraps wide Helvetica bold glyphs within the PDF column width", () => {
    const lines = wrapToEstimatedWidth(
      "WWWWMMMMWWWWMMMMWWWWMMMM SPOL S R O",
      CUSTOMER_MAX_WIDTH,
      12,
      "F2"
    )

    expect(lines.length).toBeGreaterThan(1)
    expect(linesFitWithinCustomerWidth(lines, 12, "F2")).toBe(true)
  })

  it("keeps text unchanged when it already fits", () => {
    expect(
      wrapToEstimatedWidth("Customer Name", CUSTOMER_MAX_WIDTH, 10)
    ).toEqual(["Customer Name"])
  })
})

import { describe, expect, it } from "vitest"

import { ORDER_BUSINESS_STATUS_ORDER_FIELDS } from "../../src/api/admin/order-business-statuses/utils"
import { ORDER_FIELDS as PAYMENT_REMINDER_ORDER_FIELDS } from "../../src/utils/order-payment-reminders"

/**
 * Selecting `total` makes the order module compute totals, which loads
 * shipping-method adjustments. The module only selects the shipping method's
 * `version` alongside those adjustments when the requested fields already reach
 * into the shipping method; otherwise it throws "Shipping method version is
 * required to load adjustments" and the route answers 500.
 *
 * These field lists are consumed by admin routes that returned 200 before the
 * Medusa 2.18.0 upgrade, so the pairing is a hard requirement, not a style rule.
 */
const FIELD_LISTS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["order payment reminders", PAYMENT_REMINDER_ORDER_FIELDS],
  ["order business statuses", ORDER_BUSINESS_STATUS_ORDER_FIELDS],
]

describe("order field lists that select computed totals", () => {
  for (const [name, fields] of FIELD_LISTS) {
    it(`selects a shipping method field alongside \`total\` for ${name}`, () => {
      if (!fields.includes("total")) {
        return
      }

      expect(
        fields.some((field) => field.startsWith("shipping_methods.")),
        `${name} selects \`total\` without any \`shipping_methods.*\` field, so the order module cannot load shipping-method adjustments`
      ).toBe(true)
    })
  }
})

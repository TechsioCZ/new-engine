import { describe, expect, it } from "vitest"

import {
  formatLocaleCode,
  formatOrderDate,
  formatOrderTotal,
  formatPaymentMethodLabel,
  getOrderDashboardTransitionBlockReason,
  isOrderDashboardBusinessStatusId,
  isOrderDashboardCarrierKey,
  isOrderDashboardTargetStatus,
} from "./format"
import type { OrderDashboardOrder } from "./types"

const translate = (key: string, values?: Record<string, unknown>) =>
  values ? `${key}:${JSON.stringify(values)}` : key

const order = {
  business_status: {
    id: "new",
    priority: 1,
    tone: "blue",
    translation_key: "statuses.new",
  },
  carrier: { label: "PPL", value: "ppl" },
  customer: "Customer",
  delivery_address: [],
  has_active_fulfillment: false,
  id: "order_1",
  items: [],
  order_display_id: "#1",
  payment_method: "pp_paykit_gopay_default",
} satisfies OrderDashboardOrder

describe("order dashboard formatting", () => {
  it("normalizes locales and rejects invalid dates", () => {
    expect(formatLocaleCode("cs_CZ")).toBe("cs-CZ")
    expect(formatLocaleCode()).toBeUndefined()
    expect(formatOrderDate("not-a-date", "cs-CZ")).toBe("-")
  })

  it("formats totals and payment provider identifiers", () => {
    expect(
      formatOrderTotal({ ...order, currency_code: "czk", total: 1250 }, "cs-CZ")
    ).toContain("1 250")
    expect(formatOrderTotal({ ...order, total: "invalid" }, "cs-CZ")).toBe(
      "invalid"
    )
    expect(formatPaymentMethodLabel("pp_paykit_gopay_default")).toBe("GoPay")
    expect(formatPaymentMethodLabel("pp_system_manual_default")).toBe(
      "System Manual Default"
    )
  })

  it("reports transition blockers before mutations", () => {
    expect(
      getOrderDashboardTransitionBlockReason(
        { has_active_fulfillment: true, status: "pending" },
        "canceled",
        translate
      )
    ).toBe("targetStatusBlocker.activeFulfillmentCannotCanceled")
    expect(
      getOrderDashboardTransitionBlockReason(
        { has_active_fulfillment: false, status: "pending" },
        "completed",
        translate
      )
    ).toBeUndefined()
  })

  it("narrows supported dashboard values", () => {
    expect(isOrderDashboardCarrierKey("packeta")).toBe(true)
    expect(isOrderDashboardCarrierKey("unknown")).toBe(false)
    expect(isOrderDashboardBusinessStatusId("processing")).toBe(true)
    expect(isOrderDashboardBusinessStatusId(null)).toBe(false)
    expect(isOrderDashboardTargetStatus("archived")).toBe(true)
    expect(isOrderDashboardTargetStatus("delivered")).toBe(false)
  })
})

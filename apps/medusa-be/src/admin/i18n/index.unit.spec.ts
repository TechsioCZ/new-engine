import { describe, expect, it } from "vitest"
import { ORDER_BUSINESS_STATUS_IDS } from "../../utils/order-business-status"
import resources from "."

describe("order business status admin translations", () => {
  it("defines labels for every approved status in supported admin locales", () => {
    for (const locale of ["cs", "en"] as const) {
      expect(
        Object.keys(resources[locale].orderBusinessStatuses.statuses).sort()
      ).toEqual([...ORDER_BUSINESS_STATUS_IDS].sort())
    }
  })

  it("keeps the Czech business labels in the Medusa admin i18n resource", () => {
    expect(resources.cs.orderBusinessStatuses.statuses).toEqual({
      awaiting_payment: "Čeká na platbu",
      canceled: "Storno",
      delivered: "Doručená",
      new: "Nová",
      paid: "Zaplacená",
      processing: "Zpracovává se",
      shipped: "Expedovaná",
      waiting_for_supplier: "Čeká na dodavatele",
    })
  })
})

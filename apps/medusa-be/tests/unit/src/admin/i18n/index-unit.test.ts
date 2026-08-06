import { describe, expect, it } from "vitest"

import resources from "../../../../../src/admin/i18n"
import { ORDER_BUSINESS_STATUS_IDS } from "../../../../../src/utils/order-business-status"

const collectLeafPaths = (value: unknown, prefix = ""): string[] => {
  if (value === null || typeof value !== "object") {
    return [prefix]
  }

  return Object.entries(value)
    .flatMap(([key, child]) =>
      collectLeafPaths(child, prefix.length > 0 ? `${prefix}.${key}` : key),
    )
    .toSorted()
}

describe("order business status admin translations", () => {
  it("defines labels for every approved status in supported admin locales", () => {
    for (const locale of ["cs", "en"] as const) {
      expect(
        Object.keys(
          resources[locale].orderBusinessStatuses.statuses,
        ).toSorted(),
      ).toStrictEqual([...ORDER_BUSINESS_STATUS_IDS].toSorted())
    }
  })

  it("keeps the Czech business labels in the Medusa admin i18n resource", () => {
    expect(resources.cs.orderBusinessStatuses.statuses).toStrictEqual({
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

describe("B2B admin translations", () => {
  it("registers the B2B namespaces in every supported admin locale", () => {
    for (const locale of ["cs", "en"] as const) {
      expect(resources[locale].approvals.menuItem).toBeTruthy()
      expect(resources[locale].companies.menuItem).toBeTruthy()
      expect(resources[locale].quotes.menuItem).toBeTruthy()
    }
  })

  it("keeps B2B translation keys aligned between Czech and English", () => {
    for (const namespace of [
      "approvals",
      "companies",
      "quotes",
      "translation",
    ] as const) {
      expect(collectLeafPaths(resources.cs[namespace])).toStrictEqual(
        collectLeafPaths(resources.en[namespace]),
      )
    }
  })

  it("defines shared table and modal labels used by B2B admin screens", () => {
    for (const locale of ["cs", "en"] as const) {
      expect(resources[locale].translation.filters.clearAll).toBeTruthy()
      expect(resources[locale].translation.filters.search).toBeTruthy()
      expect(resources[locale].translation.routeModal.leaveTitle).toBeTruthy()
      expect(resources[locale].translation.fields.product).toBeTruthy()
      expect(resources[locale].translation.general.noResultsTitle).toBeTruthy()
    }
  })
})

describe("storefront text admin translations", () => {
  it("registers matching Czech and English resources", () => {
    expect(resources.cs.storefrontTexts.menuItem).toBe("Jazyky")
    expect(resources.en.storefrontTexts.menuItem).toBe("Languages")
    expect(collectLeafPaths(resources.cs.storefrontTexts)).toStrictEqual(
      collectLeafPaths(resources.en.storefrontTexts),
    )
  })
})

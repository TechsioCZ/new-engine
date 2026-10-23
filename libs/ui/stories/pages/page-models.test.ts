import { describe, expect, it } from "vitest"
import {
  emailTemplates,
  emailVariables,
  missingCmsFields,
  paymentConfigs,
  shippingMethods,
} from "./akros/data"
import { orderLines, orders, productGallery, storefrontProducts } from "./data"
import {
  cardExpiryValid,
  normalizeProductDraft,
  orderAmounts,
  parcelComplete,
  paymentPathError,
  templateText,
} from "./page-models"

describe("Page composition invariants", () => {
  it("validates expiry at month boundaries, not just its shape", () => {
    const now = new Date(2026, 9, 21)
    for (const value of [
      "00/29",
      "13/29",
      "99/00",
      "09/26",
      "01/20",
      "1/29",
      "",
    ]) {
      expect(cardExpiryValid(value, now)).toBe(false)
    }
    for (const value of ["10/26", "11/26", "01/27"]) {
      expect(cardExpiryValid(value, now)).toBe(true)
    }
  })
  it("reconciles tax-exclusive lines, capture and the refund ceiling in cents", () => {
    const order = orders[0]
    if (!order) {
      throw new Error("Missing order fixture")
    }
    const amounts = orderAmounts(
      orderLines.filter((line) => line.orderId === order.id)
    )
    expect(amounts).toEqual({
      subtotalMinor: 8300,
      deliveryMinor: 0,
      taxMinor: 1743,
      capturedMinor: 10_043,
    })
    expect(order.total * 100).toBe(amounts.capturedMinor)
    expect(
      amounts.capturedMinor - amounts.taxMinor - amounts.deliveryMinor
    ).toBe(amounts.subtotalMinor)
  })
  it("never resolves eligibility for a partial, empty, zero or nonfinite parcel", () => {
    for (let index = 0; index < 4; index++) {
      for (const invalid of [
        0,
        -1,
        undefined,
        Number.NaN,
        Number.POSITIVE_INFINITY,
      ]) {
        const values: (number | undefined)[] = [10, 20, 30, 1]
        values[index] = invalid
        expect(parcelComplete(values)).toBe(false)
      }
    }
    expect(parcelComplete([10, 20, 30, 1])).toBe(true)
    expect(parcelComplete([])).toBe(false)
  })
  it("uses all four parcel measurements for CMS completeness", () => {
    expect(
      missingCmsFields({
        id: "test",
        length: 10,
        width: 0,
        height: 0,
        weight: 1,
        hasImage: true,
        hasDescription: true,
      } as Parameters<typeof missingCmsFields>[0])
    ).toEqual(["shipping dimensions"])
  })
  it("normalizes commits and enforces SKU uniqueness while allowing the record's own SKU", () => {
    const rows = [
      { id: "a", sku: "TS-CORE-BLK" },
      { id: "b", sku: "SECOND-SKU" },
    ]
    expect(
      normalizeProductDraft({ name: "   ", sku: "   " }, rows).errors
    ).toHaveProperty("name")
    expect(
      normalizeProductDraft({ name: "Valid name", sku: " ts-core-blk " }, rows)
        .errors
    ).toHaveProperty("sku")
    expect(
      normalizeProductDraft(
        { name: "Valid name", sku: "TS-CORE-BLK" },
        rows,
        "b"
      ).errors
    ).toHaveProperty("sku")
    expect(
      normalizeProductDraft(
        { name: " Valid name ", sku: " ts-core-blk " },
        rows,
        "a"
      )
    ).toEqual({
      normalized: { name: "Valid name", sku: "TS-CORE-BLK" },
      errors: {},
    })
  })
  it("requires an enabled payment for each shipping audience on every configuration mutation", () => {
    expect(paymentPathError(shippingMethods, paymentConfigs)).toBeUndefined()
    expect(
      paymentPathError(
        shippingMethods,
        paymentConfigs.map((payment) => ({ ...payment, enabled: false }))
      )
    ).toContain("enabled payment")
    const seed = shippingMethods[0]
    if (!seed) {
      throw new Error("Missing shipping fixture")
    }
    const method = { ...seed, payments: ["invoice"] }
    expect(paymentPathError([method], paymentConfigs)).toContain("B2C")
    expect(
      paymentPathError([{ ...method, customers: "B2B" }], paymentConfigs)
    ).toBeUndefined()
    expect(
      paymentPathError([{ ...method, enabled: false }], [])
    ).toBeUndefined()
    expect(
      paymentPathError([{ ...method, payments: [] }], paymentConfigs)
    ).toContain("enabled payment")
  })
  it("renders every built-in subject and detects unknown tokens without removing them", () => {
    for (const template of emailTemplates) {
      expect(templateText(template.subject, emailVariables).unknown).toEqual([])
    }
    const result = templateText(
      "Hello {{customer.first_name}} {{unknown.token}}",
      emailVariables
    )
    expect(result).toEqual({
      rendered: "Hello Jana {{unknown.token}}",
      unknown: ["{{unknown.token}}"],
    })
  })
  it("keeps shoe sizing shared, unsized goods unsized, and unrelated imagery out of the shoe gallery", () => {
    expect(
      storefrontProducts.find((product) => product.id === "sf-2")?.sizes
    ).toEqual(["38", "39", "40", "41", "42", "43", "44"])
    for (const id of ["sf-3", "sf-4", "sf-5", "sf-6", "sf-8"]) {
      expect(
        storefrontProducts.find((product) => product.id === id)?.sizes
      ).toEqual([])
    }
    expect(productGallery).toHaveLength(1)
    expect(productGallery[0]?.src).toBe(
      storefrontProducts.find((product) => product.id === "sf-2")?.image
    )
  })
})

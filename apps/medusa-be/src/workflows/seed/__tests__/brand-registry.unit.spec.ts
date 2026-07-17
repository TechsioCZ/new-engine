import { describe, expect, it } from "vitest"
import { buildBrandRegistry } from "../steps/create-products"

const GPSR_EMAIL_CONFLICT_ERROR =
  /Conflicting gpsr_contact_email values.*product-1.*product-2/
const OUTSIDE_EU_CONFLICT_ERROR =
  /Conflicting gpsr_manufactured_outside_eu values/
const ATTRIBUTE_CONFLICT_ERROR = /Conflicting attribute "supplier" values/

describe("buildBrandRegistry", () => {
  it("canonicalizes brand titles and merges identical non-empty data", () => {
    const registry = buildBrandRegistry([
      {
        handle: "product-1",
        brand: {
          title: "Hérbatika Labs",
          attributes: [{ name: "Supplier", value: "Supplier A" }],
          gpsr_contact_email: "contact@example.com",
          gpsr_manufactured_outside_eu: false,
        },
      },
      {
        handle: "product-2",
        brand: {
          title: "herbatika-labs",
          attributes: [{ name: "supplier", value: "Supplier A" }],
          gpsr_contact_email: "contact@example.com",
          gpsr_manufactured_outside_eu: false,
        },
      },
    ])

    expect(registry.size).toBe(1)
    expect(registry.get("herbatika-labs")).toMatchObject({
      gpsr_contact_email: "contact@example.com",
      gpsr_manufactured_outside_eu: false,
      handle: "herbatika-labs",
      products: ["product-1", "product-2"],
      title: "Hérbatika Labs",
    })
    expect(registry.get("herbatika-labs")?.attributes.get("supplier")).toBe(
      "Supplier A"
    )
  })

  it("ignores blank and null GPSR strings so seed input cannot clear data", () => {
    const registry = buildBrandRegistry([
      {
        handle: "product-1",
        brand: {
          title: "Brand",
          gpsr_contact_email: " ",
          gpsr_manufacturing_company_name: null,
        },
      },
    ])

    expect(registry.get("brand")).not.toHaveProperty("gpsr_contact_email")
    expect(registry.get("brand")).not.toHaveProperty(
      "gpsr_manufacturing_company_name"
    )
  })

  it("rejects conflicting scalar values before mutations", () => {
    expect(() =>
      buildBrandRegistry([
        {
          handle: "product-1",
          brand: {
            title: "Brand",
            gpsr_contact_email: "one@example.com",
          },
        },
        {
          handle: "product-2",
          brand: {
            title: "brand",
            gpsr_contact_email: "two@example.com",
          },
        },
      ])
    ).toThrow(GPSR_EMAIL_CONFLICT_ERROR)
  })

  it("rejects conflicting boolean values before mutations", () => {
    expect(() =>
      buildBrandRegistry([
        {
          handle: "product-1",
          brand: {
            title: "Brand",
            gpsr_manufactured_outside_eu: false,
          },
        },
        {
          handle: "product-2",
          brand: {
            title: "Brand",
            gpsr_manufactured_outside_eu: true,
          },
        },
      ])
    ).toThrow(OUTSIDE_EU_CONFLICT_ERROR)
  })

  it("rejects conflicting normalized attribute values before mutations", () => {
    expect(() =>
      buildBrandRegistry([
        {
          handle: "product-1",
          brand: {
            title: "Brand",
            attributes: [{ name: "Supplier", value: "One" }],
          },
        },
        {
          handle: "product-2",
          brand: {
            title: "brand",
            attributes: [{ name: " supplier ", value: "Two" }],
          },
        },
      ])
    ).toThrow(ATTRIBUTE_CONFLICT_ERROR)
  })
})

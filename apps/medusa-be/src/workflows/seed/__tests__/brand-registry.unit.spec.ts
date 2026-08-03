import { describe, expect, it } from "vitest"

import {
  buildBrandRegistry,
  buildExistingBrandReconciliation,
  getBrandSeedHandleCandidates,
  normalizeBrandRegistryKey,
} from "../steps/create-products"

const GPSR_EMAIL_CONFLICT_ERROR =
  /Conflicting gpsr_contact_email values.*product-1.*product-2/
const OUTSIDE_EU_CONFLICT_ERROR =
  /Conflicting gpsr_manufactured_outside_eu values/
const ATTRIBUTE_CONFLICT_ERROR = /Conflicting attribute "supplier" values/

describe("buildBrandRegistry", () => {
  it.each([
    ["ViolaHerb", "viola-herb"],
    ["BIO RUŽA", "bio-ruza"],
    ["Dr. Fleming", "dr-fleming"],
    ["Aroma'Saules", "aroma-saules"],
    ["PhytoBioTechnologies", "phyto-bio-technologies"],
    ["Šungitové kamene", "sungitove-kamene"],
  ])("creates a deterministic URL-safe handle for %s", (title, expected) => {
    expect(normalizeBrandRegistryKey(title)).toBe(expected)
  })

  it("rejects titles without a deterministic handle", () => {
    expect(normalizeBrandRegistryKey(" ® + ")).toBe("")
  })

  it("retains historical handles only as persistence compatibility candidates", () => {
    expect(getBrandSeedHandleCandidates("ViolaHerb")).toEqual([
      "viola-herb",
      "violaherb",
    ])
    expect(getBrandSeedHandleCandidates("BIO RUŽA")).toEqual([
      "bio-ruza",
      "bio-ruža",
    ])
  })

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

  it("ignores blank GPSR strings but preserves explicit null for authoritative clearing", () => {
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
    expect(registry.get("brand")?.gpsr_manufacturing_company_name).toBeNull()
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

  it("allows product-scoped Supplier values to vary for one Brand", () => {
    const registry = buildBrandRegistry([
      {
        handle: "product-1",
        brand: { title: "Herbatica", attributes: [] },
        productAttributes: [
          {
            input_type: "select",
            is_public: false,
            key: "supplier",
            label: "Supplier",
            option: { label: "Supplier A" },
          },
        ],
      },
      {
        handle: "product-2",
        brand: { title: "Herbatica", attributes: [] },
        productAttributes: [
          {
            input_type: "select",
            is_public: false,
            key: "supplier",
            label: "Supplier",
            option: { label: "Supplier B" },
          },
        ],
      },
    ])

    expect(registry.get("herbatica")?.products).toEqual([
      "product-1",
      "product-2",
    ])
    expect(registry.get("herbatica")?.attributes.size).toBe(0)
  })

  it("authoritatively reconciles source-owned fields and then converges", () => {
    const existing = {
      attributes: [
        {
          value: "Old value",
          attributeType: { name: "Source field" },
        },
        {
          value: "Keep",
          attributeType: { name: "Unrelated" },
        },
      ],
      gpsr_contact_email: "old@example.com",
      gpsr_manufactured_outside_eu: false,
      handle: "violaherb",
      id: "brand_1",
      title: "Edited title",
    }
    const incoming = {
      attributes: new Map([["source field", "Canonical value"]]),
      gpsr_contact_email: "source@example.com",
      gpsr_manufactured_outside_eu: false,
      handle: "viola-herb",
      products: ["shopitem-16576"],
      title: "ViolaHerb",
    }

    const update = buildExistingBrandReconciliation(existing, incoming)

    expect(update).toEqual({
      attributes: [
        { name: "Source field", value: "Canonical value" },
        { name: "Unrelated", value: "Keep" },
      ],
      gpsr_contact_email: "source@example.com",
      handle: "viola-herb",
      title: "ViolaHerb",
    })
    expect(
      buildExistingBrandReconciliation(
        {
          ...existing,
          ...update,
          attributes: update.attributes?.map((attribute) => ({
            value: attribute.value,
            attributeType: { name: attribute.name },
          })),
        },
        incoming
      )
    ).toEqual({})
  })
})

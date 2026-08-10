import { describe, expect, it } from "vitest"

import {
  buildBrandRegistry,
  buildExistingBrandReconciliation,
  getBrandSeedHandleCandidates,
  normalizeBrandRegistryKey,
} from "../steps/create-products"

const GPSR_EMAIL_CONFLICT_ERROR =
  /Conflicting gpsr_contact_email values.*product-1.*product-2/u
const OUTSIDE_EU_CONFLICT_ERROR =
  /Conflicting gpsr_manufactured_outside_eu values/u
const ATTRIBUTE_CONFLICT_ERROR = /Conflicting attribute "supplier" values/u

describe(buildBrandRegistry, () => {
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
    expect(getBrandSeedHandleCandidates("ViolaHerb")).toStrictEqual([
      "viola-herb",
      "violaherb",
    ])
    expect(getBrandSeedHandleCandidates("BIO RUŽA")).toStrictEqual([
      "bio-ruza",
      "bio-ruža",
    ])
  })

  it("canonicalizes brand titles and merges identical non-empty data", () => {
    const registry = buildBrandRegistry([
      {
        brand: {
          attributes: [{ name: "Supplier", value: "Supplier A" }],
          gpsr_contact_email: "contact@example.com",
          gpsr_manufactured_outside_eu: false,
          title: "Hérbatika Labs",
        },
        handle: "product-1",
      },
      {
        brand: {
          attributes: [{ name: "supplier", value: "Supplier A" }],
          gpsr_contact_email: "contact@example.com",
          gpsr_manufactured_outside_eu: false,
          title: "herbatika-labs",
        },
        handle: "product-2",
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
      "Supplier A",
    )
  })

  it("ignores blank GPSR strings but preserves explicit null for authoritative clearing", () => {
    const registry = buildBrandRegistry([
      {
        brand: {
          gpsr_contact_email: " ",
          gpsr_manufacturing_company_name: null,
          title: "Brand",
        },
        handle: "product-1",
      },
    ])

    expect(registry.get("brand")).not.toHaveProperty("gpsr_contact_email")
    expect(registry.get("brand")?.gpsr_manufacturing_company_name).toBeNull()
  })

  it("rejects conflicting scalar values before mutations", () => {
    expect(() =>
      buildBrandRegistry([
        {
          brand: {
            gpsr_contact_email: "one@example.com",
            title: "Brand",
          },
          handle: "product-1",
        },
        {
          brand: {
            gpsr_contact_email: "two@example.com",
            title: "brand",
          },
          handle: "product-2",
        },
      ]),
    ).toThrow(GPSR_EMAIL_CONFLICT_ERROR)
  })

  it("rejects conflicting boolean values before mutations", () => {
    expect(() =>
      buildBrandRegistry([
        {
          brand: {
            gpsr_manufactured_outside_eu: false,
            title: "Brand",
          },
          handle: "product-1",
        },
        {
          brand: {
            gpsr_manufactured_outside_eu: true,
            title: "Brand",
          },
          handle: "product-2",
        },
      ]),
    ).toThrow(OUTSIDE_EU_CONFLICT_ERROR)
  })

  it("rejects conflicting normalized attribute values before mutations", () => {
    expect(() =>
      buildBrandRegistry([
        {
          brand: {
            attributes: [{ name: "Supplier", value: "One" }],
            title: "Brand",
          },
          handle: "product-1",
        },
        {
          brand: {
            attributes: [{ name: " supplier ", value: "Two" }],
            title: "brand",
          },
          handle: "product-2",
        },
      ]),
    ).toThrow(ATTRIBUTE_CONFLICT_ERROR)
  })

  it("allows product-scoped Supplier values to vary for one Brand", () => {
    const registry = buildBrandRegistry([
      {
        brand: { attributes: [], title: "Herbatica" },
        handle: "product-1",
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
        brand: { attributes: [], title: "Herbatica" },
        handle: "product-2",
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

    expect(registry.get("herbatica")?.products).toStrictEqual([
      "product-1",
      "product-2",
    ])
    expect(registry.get("herbatica")?.attributes.size).toBe(0)
  })

  it("authoritatively reconciles source-owned fields and then converges", () => {
    const existing = {
      attributes: [
        {
          attributeType: { name: "Source field" },
          value: "Old value",
        },
        {
          attributeType: { name: "Unrelated" },
          value: "Keep",
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

    expect(update).toStrictEqual({
      attributes: [
        { name: "Source field", value: "Canonical value" },
        { name: "Unrelated", value: "Keep" },
      ],
      gpsr_contact_email: "source@example.com",
      handle: "viola-herb",
      title: "ViolaHerb",
    })
    const reconciledAttributes = update.attributes?.map((attribute) => ({
      attributeType: { name: attribute.name },
      value: attribute.value,
    }))
    expect(
      buildExistingBrandReconciliation(
        {
          ...existing,
          ...update,
          handle: update.handle ?? existing.handle,
          title: update.title ?? existing.title,
          ...(reconciledAttributes === undefined
            ? {}
            : { attributes: reconciledAttributes }),
        },
        incoming,
      ),
    ).toStrictEqual({})
  })
})

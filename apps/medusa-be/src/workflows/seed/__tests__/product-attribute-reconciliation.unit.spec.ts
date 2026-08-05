import { describe, expect, it } from "vitest"

import { resolveHerbaticaProductVisibility } from "../../../scripts/herbatica-seed"
import {
  selectExclusivelyScopedBrandIds,
  selectScopedLegacyBrandAttributeIds,
} from "../steps/cleanup-product-brand-attributes"
import { collectCanonicalProductAttributeDefinitions } from "../steps/reconcile-product-attributes"

const OPTION_COLLISION_PATTERN = /option key collision.*Bio Herba.*Bio-Herba/
const DUPLICATE_DEFINITION_PATTERN =
  /contains duplicate Product Attribute definition "supplier"/

const product = (
  handle: string,
  productAttributes: NonNullable<
    Parameters<
      typeof collectCanonicalProductAttributeDefinitions
    >[0][number]["productAttributes"]
  >
) =>
  ({
    handle,
    productAttributes,
  }) as Parameters<
    typeof collectCanonicalProductAttributeDefinitions
  >[0][number]

describe("Herbatica Product Attribute reconciliation", () => {
  it("collects canonical options while retaining explicit source absence", () => {
    const definitions = collectCanonicalProductAttributeDefinitions([
      product("one", [
        {
          input_type: "select",
          is_public: false,
          key: "supplier",
          label: "Supplier",
          option: { label: "Bio Herba" },
        },
      ]),
      product("two", [
        {
          input_type: "select",
          is_public: false,
          key: "supplier",
          label: "Supplier",
          option: null,
        },
      ]),
    ])

    expect(definitions.get("supplier")?.options.get("bio-herba")).toBe(
      "Bio Herba"
    )
  })

  it("rejects normalized source option collisions", () => {
    expect(() =>
      collectCanonicalProductAttributeDefinitions([
        product("one", [
          {
            input_type: "select",
            is_public: false,
            key: "supplier",
            label: "Supplier",
            option: { label: "Bio Herba" },
          },
        ]),
        product("two", [
          {
            input_type: "select",
            is_public: false,
            key: "supplier",
            label: "Supplier",
            option: { label: "Bio-Herba" },
          },
        ]),
      ])
    ).toThrow(OPTION_COLLISION_PATTERN)
  })

  it("rejects duplicate definitions on one Product", () => {
    expect(() =>
      collectCanonicalProductAttributeDefinitions([
        product("one", [
          {
            input_type: "select",
            is_public: false,
            key: "supplier",
            label: "Supplier",
            option: { label: "Bio Herba" },
          },
          {
            input_type: "select",
            is_public: false,
            key: "supplier",
            label: "Supplier",
            option: { label: "Elevita" },
          },
        ]),
      ])
    ).toThrow(DUPLICATE_DEFINITION_PATTERN)
  })

  it("cleans only matching attributes on Brands linked to imported Products", () => {
    expect(
      selectScopedLegacyBrandAttributeIds({
        attributeTypeIds: new Set(["supplier"]),
        attributes: [
          {
            id: "herbatica-supplier",
            brand_id: "herbatica-brand",
            attributeType: { id: "supplier" },
          },
          {
            id: "herbatica-custom",
            brand_id: "herbatica-brand",
            attributeType: { id: "custom" },
          },
          {
            id: "n1-supplier",
            brand_id: "n1-brand",
            attributeType: { id: "supplier" },
          },
        ],
        brandIds: new Set(["herbatica-brand"]),
      })
    ).toStrictEqual(["herbatica-supplier"])
  })

  it("cleans only Brands linked exclusively to imported Products", () => {
    expect(
      selectExclusivelyScopedBrandIds({
        links: [
          {
            brand_id: "herbatica-brand",
            product_id: "herbatica-product",
          },
          {
            brand_id: "shared-brand",
            product_id: "herbatica-product",
          },
          {
            brand_id: "shared-brand",
            product_id: "n1-product",
          },
        ],
        productIds: new Set(["herbatica-product"]),
      })
    ).toStrictEqual(new Set(["herbatica-brand"]))
  })
})

describe("Herbatica native visibility mapping", () => {
  it.each([
    ["visible", "published", ["Default Sales Channel"], true],
    ["cashDeskOnly", "published", ["Default Sales Channel POS"], false],
    ["hidden", "draft", [], false],
  ])(
    "maps %s to exact status and channel membership",
    (visibility, status, salesChannelNames, storefrontAccessible) => {
      expect(
        resolveHerbaticaProductVisibility({
          topOffer: { visible: true },
          visibility,
        })
      ).toStrictEqual({
        salesChannelNames,
        status,
        storefrontAccessible,
      })
    }
  )

  it("makes an offer marked invisible draft regardless of source visibility", () => {
    expect(
      resolveHerbaticaProductVisibility({
        topOffer: { visible: false },
        visibility: "cashDeskOnly",
      })
    ).toStrictEqual({
      salesChannelNames: [],
      status: "draft",
      storefrontAccessible: false,
    })
  })
})

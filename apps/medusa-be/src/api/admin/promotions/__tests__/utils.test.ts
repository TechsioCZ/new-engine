import type {
  MedusaContainer,
  PromotionRuleDTO,
} from "@medusajs/framework/types"
import { ApplicationMethodTargetType } from "@medusajs/framework/utils"
import { areRulesValidForContext } from "@medusajs/promotion/dist/utils/validations/promotion-rule"
import { isRecord } from "@techsio/std/object"
import { describe, expect, it, vi } from "vitest"

import { BRAND_MODULE } from "../../../../modules/brand"
import { buildBrandPromotionContext } from "../../../../workflows/utils/promotion-brand-context"
import { brandRuleAttribute } from "../const"
import {
  escapeLikePattern,
  getExtendedRuleAttributesMap,
  mapVariantToRuleValueOption,
  validateRuleType,
} from "../utils"

const validRuleTypes = ["rules", "target-rules", "buy-rules"] as const

interface VariantFixture {
  id: string
  title: string
  sku: string | null
  product?: { title: string } | null | undefined
}

const createVariant = (
  overrides: Partial<VariantFixture> = {},
): VariantFixture => ({
  id: "variant_test",
  product: { title: "Test Product" },
  sku: "TEST-SKU",
  title: "Test Variant",
  ...overrides,
})

describe(mapVariantToRuleValueOption, () => {
  it.each<{
    name: string
    variant: VariantFixture
    expected: { label: string; value: string }
  }>([
    {
      expected: {
        label: "Blue T-Shirt - Large (SHIRT-L-BLU)",
        value: "variant_123",
      },
      name: "returns full label with product title, variant title, and SKU",
      variant: createVariant({
        id: "variant_123",
        product: { title: "Blue T-Shirt" },
        sku: "SHIRT-L-BLU",
        title: "Large",
      }),
    },
    {
      expected: { label: "Red Pants - Medium", value: "variant_123" },
      name: "omits SKU when null",
      variant: createVariant({
        id: "variant_123",
        product: { title: "Red Pants" },
        sku: null,
        title: "Medium",
      }),
    },
    {
      expected: { label: "Small (SM-001)", value: "variant_456" },
      name: "omits product title when product is undefined",
      variant: createVariant({
        id: "variant_456",
        product: null,
        sku: "SM-001",
        title: "Small",
      }),
    },
    {
      expected: {
        label: "Single Variant Product (PROD-001)",
        value: "variant_789",
      },
      name: "shows only product title with SKU when variant title is empty",
      variant: createVariant({
        id: "variant_789",
        product: { title: "Single Variant Product" },
        sku: "PROD-001",
        title: "",
      }),
    },
    {
      expected: { label: "variant_fallback", value: "variant_fallback" },
      name: "falls back to variant ID when no title or product available",
      variant: createVariant({
        id: "variant_fallback",
        product: null,
        sku: null,
        title: "",
      }),
    },
    {
      expected: {
        label: "variant_only_sku (SKU-ONLY)",
        value: "variant_only_sku",
      },
      name: "falls back to variant ID with SKU when no titles available",
      variant: createVariant({
        id: "variant_only_sku",
        product: null,
        sku: "SKU-ONLY",
        title: "",
      }),
    },
    {
      expected: { label: "Default", value: "variant_empty_product" },
      name: "handles product with empty title",
      variant: createVariant({
        id: "variant_empty_product",
        product: { title: "" },
        sku: null,
        title: "Default",
      }),
    },
    {
      expected: {
        label: 'Photo Frame (Black & White) - Size: 10" x 12" (ITEM-10x12/A)',
        value: "variant_special",
      },
      name: "handles special characters in titles and SKU",
      variant: createVariant({
        id: "variant_special",
        product: { title: "Photo Frame (Black & White)" },
        sku: "ITEM-10x12/A",
        title: 'Size: 10" x 12"',
      }),
    },
  ])("$name", ({ variant, expected }) => {
    const result = mapVariantToRuleValueOption(variant)
    expect(result).toStrictEqual(expected)
  })
})

describe(escapeLikePattern, () => {
  it("returns empty string unchanged", () => {
    expect(escapeLikePattern("")).toBe("")
  })

  it("returns regular text unchanged", () => {
    expect(escapeLikePattern("hello world")).toBe("hello world")
  })

  it("escapes percent sign", () => {
    expect(escapeLikePattern("50% off")).toBe("50\\% off")
    expect(escapeLikePattern("%%%")).toBe("\\%\\%\\%")
  })

  it("escapes underscore", () => {
    expect(escapeLikePattern("test_value")).toBe("test\\_value")
    expect(escapeLikePattern("___")).toBe("\\_\\_\\_")
  })

  it("escapes backslash", () => {
    expect(escapeLikePattern("path\\to\\file")).toBe("path\\\\to\\\\file")
    expect(escapeLikePattern("\\\\\\")).toBe("\\\\\\\\\\\\")
  })

  it("escapes all special characters together", () => {
    expect(escapeLikePattern("50%_discount\\sale")).toBe(
      "50\\%\\_discount\\\\sale",
    )
  })

  it("handles unicode characters correctly", () => {
    expect(escapeLikePattern("café_50%")).toBe("café\\_50\\%")
  })
})

describe("isRuleType", () => {
  it("is covered by Medusa's validateRuleType utility", () => {
    expect(() => {
      validateRuleType("rules")
    }).not.toThrow()
  })
})

describe(validateRuleType, () => {
  describe("valid rule types", () => {
    it.each(validRuleTypes)('accepts "%s" as valid', (ruleType) => {
      expect(() => {
        validateRuleType(ruleType)
      }).not.toThrow()
    })
  })

  describe("invalid rule types", () => {
    it.each(["invalid", "RULES", "", "rule", "target", "buy"])(
      'throws for invalid rule type "%s"',
      (invalidType) => {
        expect(() => {
          validateRuleType(invalidType)
        }).toThrow(`Invalid param rule_type (${invalidType})`)
      },
    )
  })

  it("narrows type after assertion", () => {
    const [ruleType] = ["target-rules"]
    validateRuleType(ruleType)
    // TypeScript should narrow ruleType to RuleType after validateRuleType
    const narrowed: "rules" | "target-rules" | "buy-rules" = ruleType
    expect(narrowed).toBe("target-rules")
  })
})

describe(getExtendedRuleAttributesMap, () => {
  describe("rules attributes", () => {
    it("includes base rule attributes", () => {
      const map = getExtendedRuleAttributesMap({})
      const { rules } = map

      const ruleIds = rules.map((r) => r.id)
      expect(ruleIds).toContain("customer_group")
      expect(ruleIds).toContain("region")
      expect(ruleIds).toContain("country")
      expect(ruleIds).toContain("sales_channel")
    })

    it("includes cart item total rule for cart-level gift conditions", () => {
      const map = getExtendedRuleAttributesMap({})
      const cartItemTotal = map.rules.find((r) => r.id === "cart_item_total")

      expect(cartItemTotal).toMatchObject({
        field_type: "number",
        id: "cart_item_total",
        value: "item_total",
      })
    })

    it("preserves Medusa currency rule behavior", () => {
      const map = getExtendedRuleAttributesMap({
        applicationMethodType: "fixed",
      })
      const currencyRule = map.rules.find((r) => r.id === "currency_code")

      expect(currencyRule).toBeDefined()
      expect(currencyRule?.required).toBeTruthy()
    })
  })

  describe("target-rules attributes", () => {
    describe("includes item attributes for non-shipping targets", () => {
      it("includes product, category, collection, and type rule ids", () => {
        const map = getExtendedRuleAttributesMap({})
        const targetRules = map["target-rules"]
        const ruleIds = targetRules.map((r) => r.id)

        expect(ruleIds).toContain("product")
        expect(ruleIds).toContain("product_variant")
        expect(ruleIds).toContain("product_category")
        expect(ruleIds).toContain("product_collection")
        expect(ruleIds).toContain("product_type")
      })

      it("includes tag, price, quantity, and brand rule ids", () => {
        const map = getExtendedRuleAttributesMap({})
        const targetRules = map["target-rules"]
        const ruleIds = targetRules.map((r) => r.id)

        expect(ruleIds).toContain("product_tag")
        expect(ruleIds).toContain("item_price")
        expect(ruleIds).toContain("item_quantity")
        expect(ruleIds).toContain("brand")
        expect(targetRules.find((r) => r.id === "brand")).toMatchObject({
          field_type: "multiselect",
          value: "items.brand_ids",
        })
      })
    })

    it("uses shipping method attributes when target type is shipping_methods", () => {
      const map = getExtendedRuleAttributesMap({
        applicationMethodTargetType: "shipping_methods",
      })
      const targetRules = map["target-rules"]

      const ruleIds = targetRules.map((r) => r.id)
      expect(ruleIds).toContain("shipping_option_type")
      expect(ruleIds).not.toContain("product")
      expect(ruleIds).not.toContain("product_variant")
    })

    it("adds apply_to_quantity for buyget promotions", () => {
      const map = getExtendedRuleAttributesMap({
        promotionType: "buyget",
      })
      const targetRules = map["target-rules"]

      const applyToQuantity = targetRules.find(
        (r) => r.id === "apply_to_quantity",
      )
      expect(applyToQuantity).toBeDefined()
      expect(applyToQuantity?.required).toBeTruthy()
      expect(
        applyToQuantity !== undefined &&
          "disguised" in applyToQuantity &&
          applyToQuantity.disguised,
      ).toBeTruthy()
    })
  })

  describe("buy-rules attributes", () => {
    it("includes item attributes for non-shipping targets", () => {
      const map = getExtendedRuleAttributesMap({})
      const buyRules = map["buy-rules"]

      const ruleIds = buyRules.map((r) => r.id)
      expect(ruleIds).toContain("product")
      expect(ruleIds).toContain("product_variant")
      expect(ruleIds).toContain("item_quantity")
      expect(ruleIds).toContain("brand")
    })

    it("uses shipping method attributes when target type is shipping_methods", () => {
      const map = getExtendedRuleAttributesMap({
        applicationMethodTargetType: "shipping_methods",
      })
      const buyRules = map["buy-rules"]

      const ruleIds = buyRules.map((r) => r.id)
      expect(ruleIds).toContain("shipping_option_type")
      expect(ruleIds).not.toContain("product")
    })

    it("adds buy_rules_min_quantity for buyget promotions", () => {
      const map = getExtendedRuleAttributesMap({
        promotionType: "buyget",
      })
      const buyRules = map["buy-rules"]

      const minQuantity = buyRules.find(
        (r) => r.id === "buy_rules_min_quantity",
      )
      expect(minQuantity).toBeDefined()
      expect(minQuantity?.required).toBeTruthy()
      expect(minQuantity?.label).toBe("Minimum quantity of items")
    })
  })

  describe("attribute structure", () => {
    describe("all attributes have required fields", () => {
      it("have id, value, label, field_type, and operators properties", () => {
        const map = getExtendedRuleAttributesMap({})

        for (const ruleType of validRuleTypes) {
          for (const attr of map[ruleType]) {
            expect(attr).toHaveProperty("id")
            expect(attr).toHaveProperty("value")
            expect(attr).toHaveProperty("label")
            expect(attr).toHaveProperty("field_type")
            expect(attr).toHaveProperty("operators")
          }
        }
      })

      it("have operators as an array", () => {
        const map = getExtendedRuleAttributesMap({})

        for (const ruleType of validRuleTypes) {
          for (const attr of map[ruleType]) {
            expect(Array.isArray(attr.operators)).toBeTruthy()
          }
        }
      })
    })
  })

  describe("does not mutate between calls", () => {
    it("returns fresh objects on each call", () => {
      const map1 = getExtendedRuleAttributesMap({ promotionType: "standard" })
      const map2 = getExtendedRuleAttributesMap({ promotionType: "buyget" })

      // buyget should have additional rules
      expect(map2["buy-rules"].length).toBeGreaterThan(map1["buy-rules"].length)

      // original map should not be affected
      expect(
        map1["buy-rules"].find((r) => r.id === "buy_rules_min_quantity"),
      ).toBeUndefined()
    })
  })
})

describe("custom rule operator compatibility", () => {
  it("uses Medusa's supported not-in operator for multiselect rules", () => {
    const operatorValues = brandRuleAttribute.operators.map(
      (operator) => operator.value,
    )

    expect(operatorValues).toContain("ne")
    expect(operatorValues).not.toContain("nin")

    const rule: PromotionRuleDTO = {
      attribute: "items.brand_ids",
      id: "rule_1",
      operator: "ne",
      values: [{ id: "rule_value_1", value: "brand_blocked" }],
    }

    expect(
      areRulesValidForContext(
        [rule],
        { brand_ids: ["brand_allowed"] },
        ApplicationMethodTargetType.ITEMS,
      ),
    ).toBeTruthy()
    expect(
      areRulesValidForContext(
        [rule],
        { brand_ids: ["brand_blocked"] },
        ApplicationMethodTargetType.ITEMS,
      ),
    ).toBeFalsy()
  })
})

/**
 * Asserts that a plain mock object contains a `resolve` method before
 * narrowing it to `MedusaContainer`. Building the mock this way avoids
 * requiring every property of the huge container interface while still
 * validating the shape the code under test actually reads from at runtime.
 */
const assertContainerShape = (
  candidate: unknown,
): asserts candidate is MedusaContainer => {
  if (!isRecord(candidate) || !("resolve" in candidate)) {
    throw new TypeError("Expected a mock container with a resolve method")
  }
}

const createContainer = (
  resolve: ReturnType<typeof vi.fn>,
): MedusaContainer => {
  const candidate: unknown = { resolve }
  assertContainerShape(candidate)
  return candidate
}

describe(buildBrandPromotionContext, () => {
  it("adds brand ids to items without dropping existing item context", async () => {
    const graph = vi
      .fn<
        (query: {
          entity: string
          fields: string[]
          filters: Record<string, unknown>
        }) => Promise<{ data: { brand_id: string; product_id: string }[] }>
      >()
      .mockResolvedValue({
        data: [
          { brand_id: "brand_a", product_id: "prod_1" },
          { brand_id: "brand_b", product_id: "prod_1" },
          { brand_id: "brand_c", product_id: "prod_2" },
        ],
      })
    const listBrands = vi
      .fn<() => Promise<{ id: string }[]>>()
      .mockResolvedValue([
        { id: "brand_a" },
        { id: "brand_b" },
        { id: "brand_c" },
      ])
    const resolve = vi.fn<
      (
        key: string,
      ) => { listBrands: typeof listBrands } | { graph: typeof graph }
    >((key) => (key === BRAND_MODULE ? { listBrands } : { graph }))
    const container = createContainer(resolve)

    const result = await buildBrandPromotionContext(
      {
        items: [
          {
            id: "item_1",
            product: { id: "prod_1" },
            product_id: "prod_1",
            quantity: 2,
          },
          {
            id: "item_2",
            quantity: 1,
            variant: { product_id: "prod_2" },
          },
        ],
      },
      container,
      "product_brand",
    )

    expect(graph).toHaveBeenCalledWith({
      entity: "product_brand",
      fields: ["product_id", "brand_id"],
      filters: {
        product_id: { $in: ["prod_1", "prod_2"] },
      },
    })
    expect(result).toStrictEqual({
      items: [
        expect.objectContaining({
          brand_ids: ["brand_a", "brand_b"],
          id: "item_1",
          quantity: 2,
        }),
        expect.objectContaining({
          brand_ids: ["brand_c"],
          id: "item_2",
          quantity: 1,
        }),
      ],
    })
  })

  it("resolves brand ids from variant ids when cart items omit product ids", async () => {
    const graph = vi
      .fn<
        (query: {
          entity: string
          fields: string[]
          filters: Record<string, unknown>
        }) =>
          | { data: { id: string; product_id: string }[] }
          | { data: { brand_id: string; product_id: string }[] }
      >()
      .mockImplementation(({ entity }) => {
        if (entity === "variant") {
          return {
            data: [
              { id: "variant_1", product_id: "prod_1" },
              { id: "variant_2", product_id: "prod_2" },
            ],
          }
        }

        return {
          data: [{ brand_id: "brand_a", product_id: "prod_1" }],
        }
      })
    const listBrands = vi
      .fn<() => Promise<{ id: string }[]>>()
      .mockResolvedValue([{ id: "brand_a" }])
    const resolve = vi.fn<
      (
        key: string,
      ) => { listBrands: typeof listBrands } | { graph: typeof graph }
    >((key) => (key === BRAND_MODULE ? { listBrands } : { graph }))
    const container = createContainer(resolve)

    const result = await buildBrandPromotionContext(
      {
        items: [
          { id: "item_1", quantity: 1, variant_id: "variant_1" },
          { id: "item_2", quantity: 1, variant_id: "variant_2" },
        ],
      },
      container,
      "product_brand",
    )

    expect(graph).toHaveBeenCalledWith({
      entity: "variant",
      fields: ["id", "product_id"],
      filters: {
        id: { $in: ["variant_1", "variant_2"] },
      },
    })
    expect(graph).toHaveBeenCalledWith({
      entity: "product_brand",
      fields: ["product_id", "brand_id"],
      filters: {
        product_id: { $in: ["prod_1", "prod_2"] },
      },
    })
    expect(result).toStrictEqual({
      items: [
        expect.objectContaining({
          brand_ids: ["brand_a"],
          id: "item_1",
        }),
        expect.objectContaining({
          id: "item_2",
        }),
      ],
    })

    const { items } = result
    if (!Array.isArray(items)) {
      throw new TypeError("expected items to be an array")
    }
    expect(items[1]).not.toHaveProperty("brand_ids")
  })

  it("excludes links to deleted brands from promotion context", async () => {
    const graph = vi
      .fn<
        (query: {
          entity: string
          fields: string[]
          filters: Record<string, unknown>
        }) => Promise<{ data: { brand_id: string; product_id: string }[] }>
      >()
      .mockResolvedValue({
        data: [
          { brand_id: "brand_active", product_id: "prod_1" },
          { brand_id: "brand_deleted", product_id: "prod_1" },
          { brand_id: "brand_deleted", product_id: "prod_2" },
        ],
      })
    const listBrands = vi
      .fn<
        (
          filter: { id: { $in: string[] } },
          options: { select: string[]; withDeleted: boolean },
        ) => Promise<{ id: string }[]>
      >()
      .mockResolvedValue([{ id: "brand_active" }])
    const resolve = vi.fn<
      (
        key: string,
      ) => { listBrands: typeof listBrands } | { graph: typeof graph }
    >((key) => (key === BRAND_MODULE ? { listBrands } : { graph }))
    const container = createContainer(resolve)

    const result = await buildBrandPromotionContext(
      {
        items: [
          { id: "item_1", product_id: "prod_1" },
          { id: "item_2", product_id: "prod_2" },
        ],
      },
      container,
      "product_brand",
    )

    expect(listBrands).toHaveBeenCalledWith(
      {
        id: {
          $in: ["brand_active", "brand_deleted"],
        },
      },
      {
        select: ["id"],
        withDeleted: false,
      },
    )
    expect(result).toStrictEqual({
      items: [
        {
          brand_ids: ["brand_active"],
          id: "item_1",
          product_id: "prod_1",
        },
        {
          id: "item_2",
          product_id: "prod_2",
        },
      ],
    })
  })
})

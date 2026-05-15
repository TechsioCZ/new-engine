import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { describe, expect, it, vi } from "vitest"
import { buildProducerPromotionContext } from "../../../../workflows/utils/promotion-producer-context"
import {
  escapeLikePattern,
  getExtendedRuleAttributesMap,
  mapVariantToRuleValueOption,
  validateRuleType,
} from "../utils"

const validRuleTypes = ["rules", "target-rules", "buy-rules"] as const

type VariantFixture = {
  id: string
  title: string
  sku: string | null
  product?: { title: string }
}

const createVariant = (
  overrides: Partial<VariantFixture> = {}
): VariantFixture => ({
  id: "variant_test",
  title: "Test Variant",
  sku: "TEST-SKU",
  product: { title: "Test Product" },
  ...overrides,
})

describe("mapVariantToRuleValueOption", () => {
  it.each<{
    name: string
    variant: VariantFixture
    expected: { label: string; value: string }
  }>([
    {
      name: "returns full label with product title, variant title, and SKU",
      variant: createVariant({
        id: "variant_123",
        title: "Large",
        sku: "SHIRT-L-BLU",
        product: { title: "Blue T-Shirt" },
      }),
      expected: {
        label: "Blue T-Shirt - Large (SHIRT-L-BLU)",
        value: "variant_123",
      },
    },
    {
      name: "omits SKU when null",
      variant: createVariant({
        id: "variant_123",
        title: "Medium",
        sku: null,
        product: { title: "Red Pants" },
      }),
      expected: { label: "Red Pants - Medium", value: "variant_123" },
    },
    {
      name: "omits product title when product is undefined",
      variant: createVariant({
        id: "variant_456",
        title: "Small",
        sku: "SM-001",
        product: undefined,
      }),
      expected: { label: "Small (SM-001)", value: "variant_456" },
    },
    {
      name: "shows only product title with SKU when variant title is empty",
      variant: createVariant({
        id: "variant_789",
        title: "",
        sku: "PROD-001",
        product: { title: "Single Variant Product" },
      }),
      expected: {
        label: "Single Variant Product (PROD-001)",
        value: "variant_789",
      },
    },
    {
      name: "falls back to variant ID when no title or product available",
      variant: createVariant({
        id: "variant_fallback",
        title: "",
        sku: null,
        product: undefined,
      }),
      expected: { label: "variant_fallback", value: "variant_fallback" },
    },
    {
      name: "falls back to variant ID with SKU when no titles available",
      variant: createVariant({
        id: "variant_only_sku",
        title: "",
        sku: "SKU-ONLY",
        product: undefined,
      }),
      expected: {
        label: "variant_only_sku (SKU-ONLY)",
        value: "variant_only_sku",
      },
    },
    {
      name: "handles product with empty title",
      variant: createVariant({
        id: "variant_empty_product",
        title: "Default",
        sku: null,
        product: { title: "" },
      }),
      expected: { label: "Default", value: "variant_empty_product" },
    },
    {
      name: "handles special characters in titles and SKU",
      variant: createVariant({
        id: "variant_special",
        title: 'Size: 10" x 12"',
        sku: "ITEM-10x12/A",
        product: { title: "Photo Frame (Black & White)" },
      }),
      expected: {
        label: 'Photo Frame (Black & White) - Size: 10" x 12" (ITEM-10x12/A)',
        value: "variant_special",
      },
    },
  ])("$name", ({ variant, expected }) => {
    const result = mapVariantToRuleValueOption(variant)
    expect(result).toEqual(expected)
  })
})

describe("escapeLikePattern", () => {
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
      "50\\%\\_discount\\\\sale"
    )
  })

  it("handles unicode characters correctly", () => {
    expect(escapeLikePattern("café_50%")).toBe("café\\_50\\%")
  })
})

describe("isRuleType", () => {
  it("is covered by Medusa's validateRuleType utility", () => {
    expect(() => validateRuleType("rules")).not.toThrow()
  })
})

describe("validateRuleType", () => {
  describe("valid rule types", () => {
    it.each(validRuleTypes)('accepts "%s" as valid', (ruleType) => {
      expect(() => validateRuleType(ruleType)).not.toThrow()
    })
  })

  describe("invalid rule types", () => {
    it.each([
      "invalid",
      "RULES",
      "",
      "rule",
      "target",
      "buy",
    ])('throws for invalid rule type "%s"', (invalidType) => {
      expect(() => validateRuleType(invalidType)).toThrow(
        `Invalid param rule_type (${invalidType})`
      )
    })
  })

  it("narrows type after assertion", () => {
    const ruleType: string = "target-rules"
    validateRuleType(ruleType)
    // TypeScript should narrow ruleType to RuleType after validateRuleType
    const narrowed: "rules" | "target-rules" | "buy-rules" = ruleType
    expect(narrowed).toBe("target-rules")
  })
})

describe("getExtendedRuleAttributesMap", () => {
  describe("rules attributes", () => {
    it("includes base rule attributes", () => {
      const map = getExtendedRuleAttributesMap({})
      const rules = map.rules

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
        id: "cart_item_total",
        value: "item_total",
        field_type: "number",
      })
    })

    it("preserves Medusa currency rule behavior", () => {
      const map = getExtendedRuleAttributesMap({
        applicationMethodType: "fixed",
      })
      const currencyRule = map.rules.find((r) => r.id === "currency_code")

      expect(currencyRule).toBeDefined()
      expect(currencyRule?.required).toBe(true)
    })
  })

  describe("target-rules attributes", () => {
    it("includes item attributes for non-shipping targets", () => {
      const map = getExtendedRuleAttributesMap({})
      const targetRules = map["target-rules"]

      const ruleIds = targetRules.map((r) => r.id)
      expect(ruleIds).toContain("product")
      expect(ruleIds).toContain("product_variant")
      expect(ruleIds).toContain("product_category")
      expect(ruleIds).toContain("product_collection")
      expect(ruleIds).toContain("product_type")
      expect(ruleIds).toContain("product_tag")
      expect(ruleIds).toContain("item_price")
      expect(ruleIds).toContain("item_quantity")
      expect(ruleIds).toContain("producer")

      expect(targetRules.find((r) => r.id === "producer")).toMatchObject({
        value: "items.producer_ids",
        field_type: "multiselect",
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
        (r) => r.id === "apply_to_quantity"
      )
      expect(applyToQuantity).toBeDefined()
      expect(applyToQuantity?.required).toBe(true)
      expect(applyToQuantity?.disguised).toBe(true)
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
      expect(ruleIds).toContain("producer")
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
        (r) => r.id === "buy_rules_min_quantity"
      )
      expect(minQuantity).toBeDefined()
      expect(minQuantity?.required).toBe(true)
      expect(minQuantity?.label).toBe("Minimum quantity of items")
    })
  })

  describe("attribute structure", () => {
    it("all attributes have required fields", () => {
      const map = getExtendedRuleAttributesMap({})

      for (const ruleType of validRuleTypes) {
        for (const attr of map[ruleType]) {
          expect(attr).toHaveProperty("id")
          expect(attr).toHaveProperty("value")
          expect(attr).toHaveProperty("label")
          expect(attr).toHaveProperty("field_type")
          expect(attr).toHaveProperty("operators")
          expect(Array.isArray(attr.operators)).toBe(true)
        }
      }
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
        map1["buy-rules"].find((r) => r.id === "buy_rules_min_quantity")
      ).toBeUndefined()
    })
  })
})

describe("Medusa route loading assumptions", () => {
  it("keeps the last registered route for the same matcher and method", async () => {
    const { RoutesLoader } = await importMedusaFrameworkInternal(
      "http/routes-loader.js"
    )
    const loader = new RoutesLoader()
    const coreHandler = vi.fn()
    const appHandler = vi.fn()

    loader.registerRoute({
      isRoute: true,
      matcher: "/admin/promotions/rule-attribute-options/:rule_type",
      method: "GET",
      handler: coreHandler,
    })
    loader.registerRoute({
      isRoute: true,
      matcher: "/admin/promotions/rule-attribute-options/:rule_type",
      method: "GET",
      handler: appHandler,
    })

    expect(loader.getRoutes()).toEqual([
      expect.objectContaining({
        matcher: "/admin/promotions/rule-attribute-options/:rule_type",
        method: "GET",
        handler: appHandler,
      }),
    ])
  })

  it("sorts custom static value-option routes before Medusa's generic route", async () => {
    const { RoutesSorter } = await importMedusaFrameworkInternal(
      "http/routes-sorter.js"
    )
    const genericRoute = {
      matcher:
        "/admin/promotions/rule-value-options/:rule_type/:rule_attribute_id",
      methods: ["GET"],
      handler: vi.fn(),
    }
    const producerRoute = {
      matcher: "/admin/promotions/rule-value-options/:rule_type/producer",
      methods: ["GET"],
      handler: vi.fn(),
    }

    expect(new RoutesSorter([genericRoute, producerRoute]).sort()[0]).toBe(
      producerRoute
    )
  })
})

async function importMedusaFrameworkInternal(path: string) {
  const modulePath = resolve(
    process.cwd(),
    "../../node_modules/@medusajs/framework/dist",
    path
  )

  return await import(pathToFileURL(modulePath).href)
}

describe("buildProducerPromotionContext", () => {
  it("adds producer ids to items without dropping existing item context", async () => {
    const graph = vi.fn().mockResolvedValue({
      data: [
        { product_id: "prod_1", producer_id: "producer_a" },
        { product_id: "prod_1", producer_id: "producer_b" },
        { product_id: "prod_2", producer_id: "producer_c" },
      ],
    })
    const container = {
      resolve: vi.fn().mockReturnValue({ graph }),
    }

    const result = await buildProducerPromotionContext(
      {
        items: [
          {
            id: "item_1",
            product_id: "prod_1",
            quantity: 2,
            product: { id: "prod_1" },
          },
          {
            id: "item_2",
            variant: { product_id: "prod_2" },
            quantity: 1,
          },
        ],
      },
      container as never,
      "product_producer"
    )

    expect(graph).toHaveBeenCalledWith({
      entity: expect.any(String),
      fields: ["product_id", "producer_id"],
      filters: {
        product_id: ["prod_1", "prod_2"],
      },
    })
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: "item_1",
          quantity: 2,
          producer_ids: ["producer_a", "producer_b"],
        }),
        expect.objectContaining({
          id: "item_2",
          quantity: 1,
          producer_ids: ["producer_c"],
        }),
      ],
    })
  })
})

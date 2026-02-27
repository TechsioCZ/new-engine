import { validRuleTypes } from "../const"
import {
  escapeLikePattern,
  getExtendedRuleAttributesMap,
  isRuleType,
  mapVariantToRuleValueOption,
  validateRuleType,
} from "../utils"

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
  describe("valid rule types", () => {
    it.each(validRuleTypes)('returns true for "%s"', (ruleType) => {
      expect(isRuleType(ruleType)).toBe(true)
    })
  })

  describe("invalid rule types", () => {
    it.each([
      "invalid",
      "RULES",
      "target_rules",
      "buy_rules",
      "",
      "rule",
      "target",
      "buy",
    ])('returns false for "%s"', (invalidType) => {
      expect(isRuleType(invalidType)).toBe(false)
    })
  })

  it("acts as a type guard", () => {
    const ruleType: string = "rules"
    if (isRuleType(ruleType)) {
      // TypeScript should narrow ruleType to RuleType here
      const narrowed: "rules" | "target-rules" | "buy-rules" = ruleType
      expect(narrowed).toBe("rules")
    }
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
      "target_rules",
      "buy_rules",
      "",
      "rule",
      "target",
      "buy",
    ])('throws for invalid rule type "%s"', (invalidType) => {
      expect(() => validateRuleType(invalidType)).toThrow(
        `Invalid rule type: ${invalidType}. Must be one of: rules, target-rules, buy-rules`
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

    it("includes currency rule as optional by default", () => {
      const map = getExtendedRuleAttributesMap({})
      const currencyRule = map.rules.find((r) => r.id === "currency_code")

      expect(currencyRule).toBeDefined()
      expect(currencyRule?.required).toBe(false)
    })

    it("makes currency rule required when applicationMethodType is fixed", () => {
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
      expect(ruleIds).toContain("producer")
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

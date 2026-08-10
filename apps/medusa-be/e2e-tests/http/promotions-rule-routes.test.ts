import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { authenticateAdmin, resolveRequiredEnv } from "./helpers/client"
import {
  createBrand,
  createProduct,
  createTestContext,
  suffix,
} from "./helpers/promotions"

const ruleAttributeSchema = z.object({
  id: z.string(),
  operators: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  value: z.string(),
})
const ruleAttributesResponseSchema = z.object({
  attributes: z.array(ruleAttributeSchema),
})
const ruleValuesResponseSchema = z.object({
  values: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ),
})
const invalidDataResponseSchema = z.object({ type: z.string() })

describe("Custom promotion rule routes HTTP E2E", () => {
  const backendUrl = resolveRequiredEnv("MEDUSA_E2E_BACKEND_URL")

  it("exposes item target attributes and the canonical brand operator", async () => {
    const admin = await authenticateAdmin(backendUrl)
    const { attributes } = await admin.get(
      "/admin/promotions/rule-attribute-options/target-rules?promotion_type=standard&application_method_type=fixed&application_method_target_type=items",
      ruleAttributesResponseSchema,
    )
    const attributeIds = attributes.map((attribute) => attribute.id)
    const brandAttribute = attributes.find(
      (attribute) => attribute.id === "brand",
    )
    const notInOperator = brandAttribute?.operators?.find(
      (operator) => operator.value === "ne",
    )
    const hasLegacyNotInOperator = brandAttribute?.operators?.some(
      (operator) => operator.value === "nin",
    )

    expect(attributeIds).toStrictEqual(
      expect.arrayContaining([
        "product",
        "product_category",
        "brand",
        "product_variant",
        "item_price",
        "item_quantity",
      ]),
    )
    expect(brandAttribute?.value).toBe("items.brand_ids")
    expect(notInOperator).toStrictEqual({ label: "Not In", value: "ne" })
    expect(hasLegacyNotInOperator).toBeFalsy()
  })

  it("exposes cart and buy rule attributes", async () => {
    const admin = await authenticateAdmin(backendUrl)
    const { attributes: ruleAttributes } = await admin.get(
      "/admin/promotions/rule-attribute-options/rules",
      ruleAttributesResponseSchema,
    )
    const { attributes: buyRuleAttributes } = await admin.get(
      "/admin/promotions/rule-attribute-options/buy-rules?promotion_type=buyget&application_method_target_type=items",
      ruleAttributesResponseSchema,
    )

    expect(ruleAttributes.map((attribute) => attribute.id)).toContain(
      "cart_item_total",
    )
    expect(buyRuleAttributes.map((attribute) => attribute.id)).toStrictEqual(
      expect.arrayContaining([
        "buy_rules_min_quantity",
        "brand",
        "product_variant",
        "item_price",
        "item_quantity",
      ]),
    )
  })

  it("scopes buy-get and shipping target attributes", async () => {
    const admin = await authenticateAdmin(backendUrl)
    const { attributes: buyGetTargetAttributes } = await admin.get(
      "/admin/promotions/rule-attribute-options/target-rules?promotion_type=buyget&application_method_target_type=items",
      ruleAttributesResponseSchema,
    )
    const { attributes: shippingTargetAttributes } = await admin.get(
      "/admin/promotions/rule-attribute-options/target-rules?application_method_target_type=shipping_methods",
      ruleAttributesResponseSchema,
    )
    const shippingTargetIds = shippingTargetAttributes.map(
      (attribute) => attribute.id,
    )

    expect(
      buyGetTargetAttributes.map((attribute) => attribute.id),
    ).toStrictEqual(
      expect.arrayContaining([
        "apply_to_quantity",
        "brand",
        "product_variant",
        "item_price",
        "item_quantity",
      ]),
    )
    expect(shippingTargetIds).toContain("shipping_option_type")
    expect(shippingTargetIds).not.toStrictEqual(
      expect.arrayContaining([
        "brand",
        "product_variant",
        "item_price",
        "item_quantity",
      ]),
    )
  })

  it("rejects unknown rule attribute types with invalid_data", async () => {
    const admin = await authenticateAdmin(backendUrl)
    const invalidResponse = await admin.request(
      "/admin/promotions/rule-attribute-options/not-a-rule-type",
      { decoder: invalidDataResponseSchema },
    )

    expect(invalidResponse.status).toBe(400)
    expect(invalidResponse.data).toStrictEqual({ type: "invalid_data" })
  })

  it("returns custom brand and product variant rule value options", async () => {
    const context = await createTestContext(backendUrl)
    const brand = await createBrand(
      context.admin,
      `Rule Value Brand ${suffix()}`,
    )
    const product = await createProduct(context.admin, context.salesChannelId, {
      title: `Rule Value Product ${suffix()}`,
    })
    const [variant] = product.variants

    const { values: targetBrandValues } = await context.admin.get(
      `/admin/promotions/rule-value-options/target-rules/brand?value=${brand.id}`,
      ruleValuesResponseSchema,
    )
    const { values: buyBrandValues } = await context.admin.get(
      `/admin/promotions/rule-value-options/buy-rules/brand?value=${brand.id}`,
      ruleValuesResponseSchema,
    )
    const { values: variantValues } = await context.admin.get(
      `/admin/promotions/rule-value-options/target-rules/product_variant?value=${variant.id}`,
      ruleValuesResponseSchema,
    )

    expect(targetBrandValues).toStrictEqual([
      { label: brand.title, value: brand.id },
    ])
    expect(buyBrandValues).toStrictEqual([
      { label: brand.title, value: brand.id },
    ])
    expect(variantValues).toStrictEqual([
      {
        label: `${product.title} - ${variant.title} (${variant.sku})`,
        value: variant.id,
      },
    ])
  })
})

vi.setConfig({ testTimeout: 120 * 1000 })

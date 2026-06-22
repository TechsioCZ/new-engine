import { describe, expect, it, vi } from "vitest"
import { authenticateAdmin, resolveRequiredEnv } from "./helpers/client"
import {
  createBrand,
  createProduct,
  createTestContext,
  suffix,
} from "./helpers/promotions"

type RuleAttribute = {
  id: string
  label: string
  operators?: Array<{ label: string; value: string }>
  value: string
}

type RuleAttributesResponse = {
  attributes: RuleAttribute[]
}

type RuleValueOption = {
  label: string
  value: string
}

type RuleValuesResponse = {
  count: number
  limit: number
  offset: number
  values: RuleValueOption[]
}

describe("Custom promotion rule routes HTTP E2E", () => {
  const backendUrl = resolveRequiredEnv("MEDUSA_E2E_BACKEND_URL")

  it("keeps the custom rule attribute route compatible with Medusa attributes", async () => {
    const admin = await authenticateAdmin(backendUrl)
    const { attributes: itemTargetAttributes } =
      await admin.get<RuleAttributesResponse>(
        "/admin/promotions/rule-attribute-options/target-rules?promotion_type=standard&application_method_type=fixed&application_method_target_type=items"
      )
    const itemTargetIds = itemTargetAttributes.map((attribute) => attribute.id)
    const brandAttribute = itemTargetAttributes.find(
      (attribute) => attribute.id === "brand"
    )

    expect(itemTargetIds).toEqual(
      expect.arrayContaining([
        "product",
        "product_category",
        "brand",
        "product_variant",
        "item_price",
        "item_quantity",
      ])
    )
    expect(brandAttribute).toEqual(
      expect.objectContaining({
        value: "items.brand_ids",
        operators: expect.arrayContaining([
          expect.objectContaining({ label: "Not In", value: "ne" }),
        ]),
      })
    )
    expect(brandAttribute?.operators).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: "nin" })])
    )

    const { attributes: ruleAttributes } =
      await admin.get<RuleAttributesResponse>(
        "/admin/promotions/rule-attribute-options/rules"
      )

    expect(ruleAttributes.map((attribute) => attribute.id)).toContain(
      "cart_item_total"
    )

    const { attributes: buyRuleAttributes } =
      await admin.get<RuleAttributesResponse>(
        "/admin/promotions/rule-attribute-options/buy-rules?promotion_type=buyget&application_method_target_type=items"
      )

    expect(buyRuleAttributes.map((attribute) => attribute.id)).toEqual(
      expect.arrayContaining([
        "buy_rules_min_quantity",
        "brand",
        "product_variant",
        "item_price",
        "item_quantity",
      ])
    )

    const { attributes: buyGetTargetAttributes } =
      await admin.get<RuleAttributesResponse>(
        "/admin/promotions/rule-attribute-options/target-rules?promotion_type=buyget&application_method_target_type=items"
      )

    expect(buyGetTargetAttributes.map((attribute) => attribute.id)).toEqual(
      expect.arrayContaining([
        "apply_to_quantity",
        "brand",
        "product_variant",
        "item_price",
        "item_quantity",
      ])
    )

    const { attributes: shippingTargetAttributes } =
      await admin.get<RuleAttributesResponse>(
        "/admin/promotions/rule-attribute-options/target-rules?application_method_target_type=shipping_methods"
      )
    const shippingTargetIds = shippingTargetAttributes.map(
      (attribute) => attribute.id
    )

    expect(shippingTargetIds).toContain("shipping_option_type")
    expect(shippingTargetIds).not.toEqual(
      expect.arrayContaining([
        "brand",
        "product_variant",
        "item_price",
        "item_quantity",
      ])
    )

    const invalidResponse = await admin.request<{
      type?: string
    }>("/admin/promotions/rule-attribute-options/not-a-rule-type")

    expect(invalidResponse.status).toBe(400)
    expect(invalidResponse.data).toEqual(
      expect.objectContaining({ type: "invalid_data" })
    )
  })

  it("returns custom brand and product variant rule value options", async () => {
    const context = await createTestContext(backendUrl)
    const brand = await createBrand(
      context.admin,
      `Rule Value Brand ${suffix()}`
    )
    const product = await createProduct(context.admin, context.salesChannelId, {
      title: `Rule Value Product ${suffix()}`,
    })
    const variant = product.variants[0]

    const { values: targetBrandValues } =
      await context.admin.get<RuleValuesResponse>(
        `/admin/promotions/rule-value-options/target-rules/brand?value=${brand.id}`
      )
    const { values: buyBrandValues } =
      await context.admin.get<RuleValuesResponse>(
        `/admin/promotions/rule-value-options/buy-rules/brand?value=${brand.id}`
      )
    const { values: variantValues } =
      await context.admin.get<RuleValuesResponse>(
        `/admin/promotions/rule-value-options/target-rules/product_variant?value=${variant.id}`
      )

    expect(targetBrandValues).toEqual([
      { label: brand.title, value: brand.id },
    ])
    expect(buyBrandValues).toEqual([
      { label: brand.title, value: brand.id },
    ])
    expect(variantValues).toEqual([
      {
        label: `${product.title} - ${variant.title} (${variant.sku})`,
        value: variant.id,
      },
    ])
  })
})

vi.setConfig({ testTimeout: 120 * 1000 })

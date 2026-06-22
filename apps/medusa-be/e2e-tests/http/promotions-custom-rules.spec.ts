import { describe, expect, it, vi } from "vitest"
import { resolveRequiredEnv } from "./helpers/client"
import type { DraftOrderPreview } from "./helpers/promotions"
import {
  applyPromotion,
  createBuyGetPromotion,
  createCart,
  createCartAndApplyPromotion,
  createDraftOrderWithItem,
  createBrand,
  createProduct,
  createPromotion,
  createTestContext,
  expectAdjusted,
  expectCartDiscounted,
  expectUnadjusted,
  getItem,
  suffix,
} from "./helpers/promotions"

describe("Custom promotion rules HTTP E2E", () => {
  const backendUrl = resolveRequiredEnv("MEDUSA_E2E_BACKEND_URL")

  it("applies brand promotions only to cart items from the matching brand", async () => {
    const context = await createTestContext(backendUrl)
    const brand = await createBrand(context.admin)
    const otherBrand = await createBrand(context.admin)
    const matchingProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        brandId: brand.id,
        title: `Brand Match ${suffix()}`,
      }
    )
    const otherProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        brandId: otherBrand.id,
        title: `Brand Non Match ${suffix()}`,
      }
    )
    const positiveCartBeforePromotion = await createCart(context, [
      { quantity: 1, variantId: matchingProduct.variants[0].id },
      { quantity: 1, variantId: otherProduct.variants[0].id },
    ])
    const negativeCartBeforePromotion = await createCart(context, [
      { quantity: 1, variantId: otherProduct.variants[0].id },
    ])
    const promotion = await createPromotion(context.admin, {
      targetRules: [
        {
          attribute: "items.brand_ids",
          operator: "in",
          values: [brand.id],
        },
      ],
    })
    const positiveCart = await applyPromotion(
      context,
      positiveCartBeforePromotion.id,
      promotion.code
    )

    expectAdjusted(
      getItem(positiveCart, matchingProduct.variants[0].id),
      promotion
    )
    expectUnadjusted(getItem(positiveCart, otherProduct.variants[0].id))
    expectCartDiscounted(positiveCart)

    const negativeCart = await applyPromotion(
      context,
      negativeCartBeforePromotion.id,
      promotion.code
    )

    expectUnadjusted(getItem(negativeCart, otherProduct.variants[0].id))
    expect(negativeCart.discount_total ?? 0).toBe(0)
  })

  it("applies buy-get promotions to the matching get item only", async () => {
    const context = await createTestContext(backendUrl)
    const brand = await createBrand(context.admin)
    const buyProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        amount: 1500,
        brandId: brand.id,
        title: `Buy Get Qualifier ${suffix()}`,
      }
    )
    const getProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        amount: 700,
        title: `Buy Get Target ${suffix()}`,
      }
    )
    const otherProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        amount: 700,
        title: `Buy Get Other ${suffix()}`,
      }
    )
    const promotion = await createBuyGetPromotion(context.admin, {
      buyRules: [
        {
          attribute: "items.brand_ids",
          operator: "in",
          values: [brand.id],
        },
      ],
      targetRules: [
        {
          attribute: "items.variant_id",
          operator: "in",
          values: [getProduct.variants[0].id],
        },
      ],
      value: 700,
    })

    const positiveCart = await createCartAndApplyPromotion(
      context,
      [
        { quantity: 1, variantId: buyProduct.variants[0].id },
        { quantity: 1, variantId: getProduct.variants[0].id },
        { quantity: 1, variantId: otherProduct.variants[0].id },
      ],
      promotion.code
    )

    expectUnadjusted(getItem(positiveCart, buyProduct.variants[0].id))
    expectAdjusted(getItem(positiveCart, getProduct.variants[0].id), promotion)
    expectUnadjusted(getItem(positiveCart, otherProduct.variants[0].id))
    expectCartDiscounted(positiveCart)

    const negativeCart = await createCartAndApplyPromotion(
      context,
      [
        { quantity: 1, variantId: getProduct.variants[0].id },
        { quantity: 1, variantId: otherProduct.variants[0].id },
      ],
      promotion.code
    )

    expectUnadjusted(getItem(negativeCart, getProduct.variants[0].id))
    expectUnadjusted(getItem(negativeCart, otherProduct.variants[0].id))
    expect(negativeCart.discount_total ?? 0).toBe(0)
  })

  it.each([
    {
      attribute: "items.variant_id",
      matchingAmount: 1000,
      matchingQuantity: 1,
      name: "product_variant",
      operator: "in",
      unmatchedAmount: 1000,
      unmatchedQuantity: 1,
      values: (variantId: string) => [variantId],
    },
    {
      attribute: "items.unit_price",
      matchingAmount: 1200,
      matchingQuantity: 1,
      name: "item_price",
      operator: "gte",
      unmatchedAmount: 500,
      unmatchedQuantity: 1,
      values: () => ["1000"],
    },
    {
      attribute: "items.quantity",
      matchingAmount: 1000,
      matchingQuantity: 2,
      name: "item_quantity",
      operator: "gte",
      unmatchedAmount: 1000,
      unmatchedQuantity: 1,
      values: () => ["2"],
    },
  ])("applies $name target rules only to matching cart items", async ({
    attribute,
    matchingAmount,
    matchingQuantity,
    operator,
    unmatchedAmount,
    unmatchedQuantity,
    values,
  }) => {
    const context = await createTestContext(backendUrl)
    const matchingProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        amount: matchingAmount,
        title: `Matching Rule Product ${suffix()}`,
      }
    )
    const unmatchedProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        amount: unmatchedAmount,
        title: `Unmatched Rule Product ${suffix()}`,
      }
    )
    const promotion = await createPromotion(context.admin, {
      targetRules: [
        {
          attribute,
          operator,
          values: values(matchingProduct.variants[0].id),
        },
      ],
    })

    const cart = await createCartAndApplyPromotion(
      context,
      [
        {
          quantity: matchingQuantity,
          variantId: matchingProduct.variants[0].id,
        },
        {
          quantity: unmatchedQuantity,
          variantId: unmatchedProduct.variants[0].id,
        },
      ],
      promotion.code
    )

    expectAdjusted(getItem(cart, matchingProduct.variants[0].id), promotion)
    expectUnadjusted(getItem(cart, unmatchedProduct.variants[0].id))
    expectCartDiscounted(cart)
  })

  it("applies cart item total rules only when the cart reaches the threshold", async () => {
    const context = await createTestContext(backendUrl)
    const highTotalProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        amount: 1200,
        title: `High Cart Total Product ${suffix()}`,
      }
    )
    const lowTotalProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        amount: 500,
        title: `Low Cart Total Product ${suffix()}`,
      }
    )
    const promotion = await createPromotion(context.admin, {
      rules: [
        {
          attribute: "item_total",
          operator: "gte",
          values: ["1000"],
        },
      ],
    })

    const positiveCart = await createCartAndApplyPromotion(
      context,
      [{ quantity: 1, variantId: highTotalProduct.variants[0].id }],
      promotion.code
    )
    const negativeCart = await createCartAndApplyPromotion(
      context,
      [{ quantity: 1, variantId: lowTotalProduct.variants[0].id }],
      promotion.code
    )

    expectAdjusted(
      getItem(positiveCart, highTotalProduct.variants[0].id),
      promotion
    )
    expectUnadjusted(getItem(negativeCart, lowTotalProduct.variants[0].id))
    expectCartDiscounted(positiveCart)
    expect(negativeCart.discount_total ?? 0).toBe(0)
  })

  it("computes brand-targeted promotion adjustments for draft orders", async () => {
    const context = await createTestContext(backendUrl)
    const brand = await createBrand(context.admin)
    const product = await createProduct(context.admin, context.salesChannelId, {
      brandId: brand.id,
      title: `Draft Brand Match ${suffix()}`,
    })
    const otherProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        title: `Draft Brand Non Match ${suffix()}`,
      }
    )
    const variant = product.variants[0]
    const otherVariant = otherProduct.variants[0]
    const promotion = await createPromotion(context.admin, {
      targetRules: [
        {
          attribute: "items.brand_ids",
          operator: "in",
          values: [brand.id],
        },
      ],
    })
    const draftOrder = await createDraftOrderWithItem(context, variant.id)

    await context.admin.post(`/admin/draft-orders/${draftOrder.id}/edit`, {})
    const { draft_order_preview } = await context.admin.post<{
      draft_order_preview: DraftOrderPreview
    }>(`/admin/draft-orders/${draftOrder.id}/edit/promotions`, {
      promo_codes: [promotion.code],
    })

    const adjustedItem = getItem(draft_order_preview, variant.id)

    expectAdjusted(adjustedItem, promotion)
    expect(draft_order_preview.discount_total ?? 0).toBeGreaterThan(0)

    const { draft_order_preview: updatedDraftOrderPreview } =
      await context.admin.post<{
        draft_order_preview: DraftOrderPreview
      }>(`/admin/draft-orders/${draftOrder.id}/edit/items`, {
        items: [{ quantity: 1, variant_id: otherVariant.id }],
      })

    expectAdjusted(getItem(updatedDraftOrderPreview, variant.id), promotion)
    expectUnadjusted(getItem(updatedDraftOrderPreview, otherVariant.id))
    expect(updatedDraftOrderPreview.discount_total ?? 0).toBeGreaterThan(0)
  })
})

vi.setConfig({ testTimeout: 120 * 1000 })

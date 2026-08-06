import { randomUUID } from "node:crypto"

import { z } from "zod"

import type { ApiClient } from "./client"
import { assertOk, authenticateAdmin, createClient } from "./client"

const apiKeySchema = z.object({
  id: z.string(),
  token: z.string(),
})
const brandSchema = z.object({
  id: z.string(),
  title: z.string(),
})
const regionSchema = z.object({
  countries: z
    .array(
      z.object({
        iso_2: z.string().optional(),
      }),
    )
    .optional(),
  currency_code: z.string().optional(),
  id: z.string(),
})
const productVariantSchema = z.object({
  id: z.string(),
  sku: z.string().optional(),
  title: z.string(),
})
const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  variants: z.tuple([productVariantSchema], productVariantSchema),
})
const promotionSchema = z.object({
  code: z.string(),
  id: z.string(),
  is_automatic: z.boolean().optional(),
})
const cartItemSchema = z.object({
  adjustments: z
    .array(
      z.object({
        code: z.string().optional(),
        promotion_id: z.string().optional(),
      }),
    )
    .optional(),
  discount_total: z.number().optional(),
  variant_id: z.string(),
})
const cartSchema = z.object({
  discount_total: z.number().optional(),
  id: z.string(),
  items: z.array(cartItemSchema),
})
const draftOrderPreviewSchema = z.object({
  discount_total: z.number().optional(),
  items: z.array(cartItemSchema),
})
const promotionsResponseSchema = z.object({
  promotions: z.array(
    z.object({
      id: z.string(),
      is_automatic: z.boolean().optional(),
    }),
  ),
})
const regionResponseSchema = z.object({ region: regionSchema })
const regionsResponseSchema = z.object({ regions: z.array(regionSchema) })
const salesChannelResponseSchema = z.object({
  sales_channel: z.object({ id: z.string() }),
})
const apiKeyResponseSchema = z.object({ api_key: apiKeySchema })
const brandResponseSchema = z.object({ brand: brandSchema })
const productResponseSchema = z.object({ product: productSchema })
const promotionResponseSchema = z.object({ promotion: promotionSchema })
const cartResponseSchema = z.object({ cart: cartSchema })
const draftOrderResponseSchema = z.object({
  draft_order: z.object({ id: z.string() }),
})
export const draftOrderPreviewResponseSchema = z.object({
  draft_order_preview: draftOrderPreviewSchema,
})

export type Brand = z.infer<typeof brandSchema>
export type Product = z.infer<typeof productSchema>
export type ProductVariant = z.infer<typeof productVariantSchema>
export type Promotion = z.infer<typeof promotionSchema>
export type CartItem = z.infer<typeof cartItemSchema>
export type Cart = z.infer<typeof cartSchema>
export type DraftOrderPreview = z.infer<typeof draftOrderPreviewSchema>

export interface PromotionRule {
  attribute: string
  operator: string
  values: string[]
}

export interface TestContext {
  admin: ApiClient
  regionId: string
  salesChannelId: string
  store: ApiClient
}

const cartFields =
  "+discount_total,+items.discount_total,+items.adjustments.*,+items.variant_id,+items.quantity,+items.unit_price,+items.subtotal,+items.total"
const e2eRegionName = "Promotions Custom Rules E2E"

const shippingAddress = {
  address_1: "123 Test Street",
  city: "Prague",
  country_code: "us",
  first_name: "Test",
  last_name: "Customer",
  postal_code: "10001",
}

export const suffix = () => `${Date.now()}-${randomUUID().slice(0, 8)}`

const deleteAutomaticPromotions = async (admin: ApiClient) => {
  const { promotions } = await admin.get(
    "/admin/promotions?limit=100&fields=id,is_automatic",
    promotionsResponseSchema,
  )
  const automaticPromotions = promotions.filter(
    (promotion) => promotion.is_automatic === true,
  )

  await Promise.all(
    automaticPromotions.map(async (promotion) => {
      assertOk(
        await admin.request(`/admin/promotions/${promotion.id}`, {
          method: "DELETE",
        }),
      )
    }),
  )
}

const getOrCreateE2eRegion = async (admin: ApiClient) => {
  const created = await admin.request("/admin/regions", {
    body: {
      countries: ["us"],
      currency_code: "usd",
      name: e2eRegionName,
    },
    method: "POST",
  })

  if (created.status === 200) {
    return regionResponseSchema.parse(created.data).region
  }

  const { regions } = await admin.get(
    "/admin/regions?limit=100&fields=id,name,currency_code,*countries",
    regionsResponseSchema,
  )
  const existing = regions.find(
    (region) =>
      region.currency_code === "usd" &&
      (region.countries?.some((country) => country.iso_2 === "us") ?? false),
  )

  if (!existing) {
    throw new Error(
      `Unable to create or locate USD/US region: ${JSON.stringify(
        created.data,
      )}`,
    )
  }

  return existing
}

export const createTestContext = async (
  baseUrl: string,
): Promise<TestContext> => {
  const admin = await authenticateAdmin(baseUrl)
  const id = suffix()

  await deleteAutomaticPromotions(admin)

  const region = await getOrCreateE2eRegion(admin)
  const { sales_channel } = await admin.post(
    "/admin/sales-channels",
    {
      description: "Promotion custom rule E2E channel",
      name: `Promotions E2E ${id}`,
    },
    salesChannelResponseSchema,
  )
  const { api_key } = await admin.post(
    "/admin/api-keys",
    {
      title: `Promotions E2E ${id}`,
      type: "publishable",
    },
    apiKeyResponseSchema,
  )

  await admin.post(`/admin/api-keys/${api_key.id}/sales-channels`, {
    add: [sales_channel.id],
  })

  return {
    admin,
    regionId: region.id,
    salesChannelId: sales_channel.id,
    store: createClient(baseUrl, { "x-publishable-api-key": api_key.token }),
  }
}

export const createBrand = async (
  admin: ApiClient,
  title = `Brand ${suffix()}`,
) => {
  const handle = title.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-")
  const { brand } = await admin.post(
    "/admin/brands",
    {
      handle,
      title,
    },
    brandResponseSchema,
  )

  return brand
}

export const createProduct = async (
  admin: ApiClient,
  salesChannelId: string,
  options: {
    amount?: number
    brandId?: string
    title?: string
  } = {},
) => {
  const id = suffix()
  const title = options.title ?? `Promo Product ${id}`
  const { product } = await admin.post(
    "/admin/products",
    {
      handle: title.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-"),
      options: [{ title: "Size", values: ["One Size"] }],
      sales_channels: [{ id: salesChannelId }],
      status: "published",
      title,
      variants: [
        {
          manage_inventory: false,
          options: { Size: "One Size" },
          prices: [{ amount: options.amount ?? 1000, currency_code: "usd" }],
          sku: `promo-${id}`,
          title: "One Size",
        },
      ],
    },
    productResponseSchema,
  )

  if (options.brandId !== undefined && options.brandId !== "") {
    await admin.post(`/admin/products/${product.id}/brands`, {
      brand_ids: [options.brandId],
    })
  }

  return product
}

export const createPromotion = async (
  admin: ApiClient,
  options: {
    code?: string
    rules?: PromotionRule[]
    targetRules?: PromotionRule[]
    value?: number
  },
) => {
  const code = options.code ?? `PROMO-${suffix()}`
  const { promotion } = await admin.post(
    "/admin/promotions",
    {
      application_method: {
        allocation: "each",
        currency_code: "usd",
        max_quantity: 100,
        target_rules: options.targetRules ?? [],
        target_type: "items",
        type: "fixed",
        value: options.value ?? 100,
      },
      code,
      is_automatic: false,
      rules: options.rules ?? [],
      status: "active",
      type: "standard",
    },
    promotionResponseSchema,
  )

  const { promotion: manualPromotion } = await admin.post(
    `/admin/promotions/${promotion.id}?fields=id,code,is_automatic`,
    { is_automatic: false },
    promotionResponseSchema,
  )

  return manualPromotion
}

export const createBuyGetPromotion = async (
  admin: ApiClient,
  options: {
    buyRules: PromotionRule[]
    code?: string
    targetRules: PromotionRule[]
    value?: number
  },
) => {
  const code = options.code ?? `BUYGET-${suffix()}`
  const { promotion } = await admin.post(
    "/admin/promotions",
    {
      application_method: {
        allocation: "each",
        apply_to_quantity: 1,
        buy_rules: options.buyRules,
        buy_rules_min_quantity: 1,
        currency_code: "usd",
        max_quantity: 1,
        target_rules: options.targetRules,
        target_type: "items",
        type: "fixed",
        value: options.value ?? 100,
      },
      code,
      is_automatic: false,
      status: "active",
      type: "buyget",
    },
    promotionResponseSchema,
  )

  const { promotion: manualPromotion } = await admin.post(
    `/admin/promotions/${promotion.id}?fields=id,code,is_automatic`,
    { is_automatic: false },
    promotionResponseSchema,
  )

  return manualPromotion
}

export const createCart = async (
  context: TestContext,
  items: { quantity: number; variantId: string }[],
) => {
  const { cart } = await context.store.post(
    `/store/carts?fields=${cartFields}`,
    {
      currency_code: "usd",
      items: items.map((item) => ({
        quantity: item.quantity,
        variant_id: item.variantId,
      })),
      region_id: context.regionId,
      sales_channel_id: context.salesChannelId,
      shipping_address: shippingAddress,
    },
    cartResponseSchema,
  )

  return cart
}

export const applyPromotion = async (
  context: TestContext,
  cartId: string,
  code: string,
) => {
  const { cart } = await context.store.post(
    `/store/carts/${cartId}/promotions?fields=${cartFields}`,
    { promo_codes: [code] },
    cartResponseSchema,
  )

  return cart
}

export const createCartAndApplyPromotion = async (
  context: TestContext,
  items: { quantity: number; variantId: string }[],
  promotionCode: string,
) => {
  const cart = await createCart(context, items)

  return await applyPromotion(context, cart.id, promotionCode)
}

export const getItem = (cart: Cart | DraftOrderPreview, variantId: string) => {
  const item = cart.items.find(
    (candidate) => candidate.variant_id === variantId,
  )

  if (!item) {
    throw new Error(`Expected cart item for variant ${variantId}`)
  }

  return item
}

export const expectAdjusted = (item: CartItem, promotion: Promotion) => {
  const hasPromotionAdjustment = (item.adjustments ?? []).some(
    (adjustment) =>
      adjustment.code === promotion.code &&
      adjustment.promotion_id === promotion.id,
  )
  const discountTotal = item.discount_total ?? 0

  if (!hasPromotionAdjustment || discountTotal <= 0) {
    throw new Error(`Expected adjustment for promotion ${promotion.code}`)
  }
}

export const expectCartDiscounted = (cart: Cart) => {
  if ((cart.discount_total ?? 0) <= 0) {
    throw new Error("Expected cart to have a promotion discount")
  }
}

export const expectUnadjusted = (item: CartItem) => {
  const adjustmentCount = item.adjustments?.length ?? 0
  const discountTotal = item.discount_total ?? 0

  if (adjustmentCount !== 0 || discountTotal !== 0) {
    throw new Error("Expected item to have no promotion adjustments")
  }
}

export const createDraftOrderWithItem = async (
  context: TestContext,
  variantId: string,
) => {
  const { draft_order } = await context.admin.post(
    "/admin/draft-orders",
    {
      email: `promotions-${suffix()}@example.com`,
      region_id: context.regionId,
      sales_channel_id: context.salesChannelId,
      shipping_address: shippingAddress,
    },
    draftOrderResponseSchema,
  )

  await context.admin.post(`/admin/draft-orders/${draft_order.id}/edit`, {})
  await context.admin.post(`/admin/draft-orders/${draft_order.id}/edit/items`, {
    items: [{ quantity: 1, variant_id: variantId }],
  })
  await context.admin.post(
    `/admin/draft-orders/${draft_order.id}/edit/confirm`,
    {},
  )

  return draft_order
}

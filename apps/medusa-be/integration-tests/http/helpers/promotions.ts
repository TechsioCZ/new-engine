import type { ApiClient } from "./client"
import { assertOk, authenticateAdmin, createClient } from "./client"

type ApiKey = {
  id: string
  token: string
}

export type Producer = {
  id: string
  title: string
}

type Region = {
  countries?: Array<{ iso_2?: string }>
  currency_code?: string
  id: string
  name?: string
}

export type Product = {
  id: string
  title: string
  variants: ProductVariant[]
}

export type ProductVariant = {
  id: string
  sku?: string
  title: string
}

export type Promotion = {
  code: string
  id: string
  is_automatic?: boolean
}

export type PromotionRule = {
  attribute: string
  operator: string
  values: string[]
}

export type CartItem = {
  adjustments?: Array<{ code?: string; promotion_id?: string }>
  discount_total?: number
  id: string
  variant_id: string
}

export type Cart = {
  discount_total?: number
  id: string
  items: CartItem[]
}

export type DraftOrderPreview = {
  discount_total?: number
  id: string
  items: Array<CartItem & { product_id?: string }>
}

export type TestContext = {
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
  postal_code: "10001",
  first_name: "Test",
  last_name: "Customer",
}

export function suffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function createTestContext(baseUrl: string): Promise<TestContext> {
  const admin = await authenticateAdmin(baseUrl)
  const id = suffix()

  await deleteAutomaticPromotions(admin)

  const region = await getOrCreateE2eRegion(admin)
  const { sales_channel } = await admin.post<{
    sales_channel: { id: string }
  }>("/admin/sales-channels", {
    description: "Promotion custom rule E2E channel",
    name: `Promotions E2E ${id}`,
  })
  const { api_key } = await admin.post<{ api_key: ApiKey }>("/admin/api-keys", {
    title: `Promotions E2E ${id}`,
    type: "publishable",
  })

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

async function deleteAutomaticPromotions(admin: ApiClient) {
  const { promotions } = await admin.get<{ promotions: Promotion[] }>(
    "/admin/promotions?limit=100&fields=id,is_automatic"
  )
  const automaticPromotions = promotions.filter(
    (promotion) => promotion.is_automatic
  )

  await Promise.all(
    automaticPromotions.map(async (promotion) => {
      assertOk(
        await admin.request(`/admin/promotions/${promotion.id}`, {
          method: "DELETE",
        })
      )
    })
  )
}

async function getOrCreateE2eRegion(admin: ApiClient) {
  const created = await admin.request<{ region: Region }>("/admin/regions", {
    body: {
      countries: ["us"],
      currency_code: "usd",
      name: e2eRegionName,
    },
    method: "POST",
  })

  if (created.status === 200) {
    return created.data.region
  }

  const { regions } = await admin.get<{ regions: Region[] }>(
    "/admin/regions?limit=100&fields=id,name,currency_code,*countries"
  )
  const existing = regions.find(
    (region) =>
      region.currency_code === "usd" &&
      region.countries?.some((country) => country.iso_2 === "us")
  )

  if (!existing) {
    throw new Error(
      `Unable to create or locate USD/US region: ${JSON.stringify(
        created.data
      )}`
    )
  }

  return existing
}

export async function createProducer(
  admin: ApiClient,
  title = `Producer ${suffix()}`
) {
  const handle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const { producer } = await admin.post<{ producer: Producer }>(
    "/admin/producers",
    {
      handle,
      title,
    }
  )

  return producer
}

export async function createProduct(
  admin: ApiClient,
  salesChannelId: string,
  options: {
    amount?: number
    producerId?: string
    title?: string
  } = {}
) {
  const id = suffix()
  const title = options.title ?? `Promo Product ${id}`
  const { product } = await admin.post<{ product: Product }>(
    "/admin/products",
    {
      handle: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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
    }
  )

  if (options.producerId) {
    await admin.post(`/admin/products/${product.id}/producers`, {
      producer_ids: [options.producerId],
    })
  }

  return product
}

export async function createPromotion(
  admin: ApiClient,
  options: {
    code?: string
    rules?: PromotionRule[]
    targetRules?: PromotionRule[]
    value?: number
  }
) {
  const code = options.code ?? `PROMO-${suffix()}`
  const { promotion } = await admin.post<{ promotion: Promotion }>(
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
    }
  )

  const { promotion: manualPromotion } = await admin.post<{
    promotion: Promotion
  }>(`/admin/promotions/${promotion.id}?fields=id,code,is_automatic`, {
    is_automatic: false,
  })

  return manualPromotion
}

export async function createBuyGetPromotion(
  admin: ApiClient,
  options: {
    buyRules: PromotionRule[]
    code?: string
    targetRules: PromotionRule[]
    value?: number
  }
) {
  const code = options.code ?? `BUYGET-${suffix()}`
  const { promotion } = await admin.post<{ promotion: Promotion }>(
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
    }
  )

  const { promotion: manualPromotion } = await admin.post<{
    promotion: Promotion
  }>(`/admin/promotions/${promotion.id}?fields=id,code,is_automatic`, {
    is_automatic: false,
  })

  return manualPromotion
}

export async function createCart(
  context: TestContext,
  items: Array<{ quantity: number; variantId: string }>
) {
  const { cart } = await context.store.post<{ cart: Cart }>(
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
    }
  )

  return cart
}

export async function applyPromotion(
  context: TestContext,
  cartId: string,
  code: string
) {
  const { cart } = await context.store.post<{ cart: Cart }>(
    `/store/carts/${cartId}/promotions?fields=${cartFields}`,
    { promo_codes: [code] }
  )

  return cart
}

export async function createCartAndApplyPromotion(
  context: TestContext,
  items: Array<{ quantity: number; variantId: string }>,
  promotionCode: string
) {
  const cart = await createCart(context, items)

  return await applyPromotion(context, cart.id, promotionCode)
}

export function getItem(cart: Cart | DraftOrderPreview, variantId: string) {
  const item = cart.items.find(
    (candidate) => candidate.variant_id === variantId
  )

  if (!item) {
    throw new Error(`Expected cart item for variant ${variantId}`)
  }

  return item as CartItem
}

export function expectAdjusted(item: CartItem, promotion: Promotion) {
  const hasPromotionAdjustment = (item.adjustments ?? []).some(
    (adjustment) =>
      adjustment.code === promotion.code &&
      adjustment.promotion_id === promotion.id
  )
  const discountTotal = item.discount_total ?? 0

  if (!hasPromotionAdjustment || discountTotal <= 0) {
    throw new Error(`Expected adjustment for promotion ${promotion.code}`)
  }
}

export function expectCartDiscounted(cart: Cart) {
  if ((cart.discount_total ?? 0) <= 0) {
    throw new Error("Expected cart to have a promotion discount")
  }
}

export function expectUnadjusted(item: CartItem) {
  const adjustmentCount = item.adjustments?.length ?? 0
  const discountTotal = item.discount_total ?? 0

  if (adjustmentCount !== 0 || discountTotal !== 0) {
    throw new Error("Expected item to have no promotion adjustments")
  }
}

export async function createDraftOrderWithItem(
  context: TestContext,
  variantId: string
) {
  const { draft_order } = await context.admin.post<{
    draft_order: { id: string }
  }>("/admin/draft-orders", {
    email: `promotions-${suffix()}@example.com`,
    region_id: context.regionId,
    sales_channel_id: context.salesChannelId,
    shipping_address: shippingAddress,
  })

  await context.admin.post(`/admin/draft-orders/${draft_order.id}/edit`, {})
  await context.admin.post(`/admin/draft-orders/${draft_order.id}/edit/items`, {
    items: [{ quantity: 1, variant_id: variantId }],
  })
  await context.admin.post(
    `/admin/draft-orders/${draft_order.id}/edit/confirm`,
    {}
  )

  return draft_order
}

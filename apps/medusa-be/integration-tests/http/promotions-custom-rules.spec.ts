import { describe, expect, it, vi } from "vitest"

type JsonObject = Record<string, unknown>

type JsonResponse<T extends JsonObject = JsonObject> = {
  status: number
  data: T
}

type ApiClient = {
  get: <T extends JsonObject = JsonObject>(path: string) => Promise<T>
  post: <T extends JsonObject = JsonObject>(
    path: string,
    body?: JsonObject
  ) => Promise<T>
  request: <T extends JsonObject = JsonObject>(
    path: string,
    options?: { body?: JsonObject; method?: string }
  ) => Promise<JsonResponse<T>>
}

type ApiKey = {
  id: string
  token: string
}

type Attribute = {
  id: string
  label: string
  value: string
  operators?: Array<{ label: string; value: string }>
}

type Producer = {
  id: string
  title: string
}

type Region = {
  countries?: Array<{ iso_2?: string }>
  currency_code?: string
  id: string
  name?: string
}

type Product = {
  id: string
  title: string
  variants: ProductVariant[]
}

type ProductVariant = {
  id: string
  sku?: string
  title: string
}

type Promotion = {
  code: string
  id: string
  is_automatic?: boolean
}

type PromotionRule = {
  attribute: string
  operator: string
  values: string[]
}

type CartItem = {
  adjustments?: Array<{ code?: string; promotion_id?: string }>
  discount_total?: number
  id: string
  variant_id: string
}

type Cart = {
  discount_total?: number
  id: string
  items: CartItem[]
}

type DraftOrderPreview = {
  discount_total?: number
  id: string
  items: Array<CartItem & { product_id?: string }>
}

type TestContext = {
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

function resolveRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Run the isolated e2e harness or provide it explicitly.`
    )
  }

  return value
}

function suffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function requestJson<T extends JsonObject = JsonObject>(
  baseUrl: string,
  path: string,
  options?: {
    body?: JsonObject
    headers?: Record<string, string>
    method?: string
  }
): Promise<JsonResponse<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      ...(options?.body ? { "content-type": "application/json" } : {}),
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })
  const rawBody = await response.text()
  const data = rawBody ? (JSON.parse(rawBody) as T) : ({} as T)

  return {
    data,
    status: response.status,
  }
}

function assertOk<T extends JsonObject>(response: JsonResponse<T>): T {
  if (response.status !== 200) {
    throw new Error(
      `Expected HTTP 200, received ${response.status}: ${JSON.stringify(
        response.data
      )}`
    )
  }

  return response.data
}

function createClient(
  baseUrl: string,
  headers: Record<string, string>
): ApiClient {
  return {
    get: async <T extends JsonObject = JsonObject>(path: string) =>
      assertOk(await requestJson<T>(baseUrl, path, { headers })),
    post: async <T extends JsonObject = JsonObject>(
      path: string,
      body: JsonObject = {}
    ) =>
      assertOk(
        await requestJson<T>(baseUrl, path, {
          body,
          headers,
          method: "POST",
        })
      ),
    request: async <T extends JsonObject = JsonObject>(
      path: string,
      options?: { body?: JsonObject; method?: string }
    ) =>
      await requestJson<T>(baseUrl, path, {
        body: options?.body,
        headers,
        method: options?.method,
      }),
  }
}

async function authenticateAdmin(baseUrl: string) {
  const response = await requestJson<{ token: string }>(
    baseUrl,
    "/auth/user/emailpass",
    {
      body: {
        email: resolveRequiredEnv("MEDUSA_E2E_ADMIN_EMAIL"),
        password: resolveRequiredEnv("MEDUSA_E2E_ADMIN_PASSWORD"),
      },
      method: "POST",
    }
  )

  if (response.status !== 200 || typeof response.data.token !== "string") {
    throw new Error("Admin authentication failed")
  }

  return createClient(baseUrl, {
    authorization: `Bearer ${response.data.token}`,
  })
}

async function createTestContext(baseUrl: string): Promise<TestContext> {
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

async function createProducer(
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

async function createProduct(
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

async function createPromotion(
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

async function createBuyGetPromotion(
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

async function createCart(
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

async function applyPromotion(
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

async function createCartAndApplyPromotion(
  context: TestContext,
  items: Array<{ quantity: number; variantId: string }>,
  promotionCode: string
) {
  const cart = await createCart(context, items)

  return await applyPromotion(context, cart.id, promotionCode)
}

function getItem(cart: Cart | DraftOrderPreview, variantId: string) {
  const item = cart.items.find(
    (candidate) => candidate.variant_id === variantId
  )

  if (!item) {
    throw new Error(`Expected cart item for variant ${variantId}`)
  }

  return item as CartItem
}

function expectAdjusted(item: CartItem, promotion: Promotion) {
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

function expectCartDiscounted(cart: Cart) {
  if ((cart.discount_total ?? 0) <= 0) {
    throw new Error("Expected cart to have a promotion discount")
  }
}

function expectUnadjusted(item: CartItem) {
  const adjustmentCount = item.adjustments?.length ?? 0
  const discountTotal = item.discount_total ?? 0

  if (adjustmentCount !== 0 || discountTotal !== 0) {
    throw new Error("Expected item to have no promotion adjustments")
  }
}

async function createDraftOrderWithItem(
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

describe("Custom promotion rules HTTP E2E", () => {
  const backendUrl = resolveRequiredEnv("MEDUSA_E2E_BACKEND_URL")

  it("keeps the custom rule attribute route compatible with Medusa attributes", async () => {
    const admin = await authenticateAdmin(backendUrl)
    const targetAttributes = (
      await admin.get<{
        attributes: Attribute[]
      }>(
        "/admin/promotions/rule-attribute-options/target-rules?promotion_type=standard&application_method_type=fixed&application_method_target_type=items"
      )
    ).attributes
    const targetIds = targetAttributes.map((attribute) => attribute.id)
    const producer = targetAttributes.find(
      (attribute) => attribute.id === "producer"
    )

    expect(targetIds).toEqual(
      expect.arrayContaining([
        "product",
        "product_category",
        "producer",
        "product_variant",
        "item_price",
        "item_quantity",
      ])
    )
    expect(producer).toEqual(
      expect.objectContaining({
        value: "items.producer_ids",
      })
    )
    expect(producer?.operators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Not In", value: "ne" }),
      ])
    )
    expect(
      producer?.operators?.map((operator) => operator.value)
    ).not.toContain("nin")

    const cartRuleIds = (
      await admin.get<{
        attributes: Attribute[]
      }>("/admin/promotions/rule-attribute-options/rules")
    ).attributes.map((attribute) => attribute.id)

    expect(cartRuleIds).toContain("cart_item_total")

    const buyRuleIds = (
      await admin.get<{
        attributes: Attribute[]
      }>(
        "/admin/promotions/rule-attribute-options/buy-rules?promotion_type=buyget&application_method_target_type=items"
      )
    ).attributes.map((attribute) => attribute.id)
    const buyGetTargetRuleIds = (
      await admin.get<{
        attributes: Attribute[]
      }>(
        "/admin/promotions/rule-attribute-options/target-rules?promotion_type=buyget&application_method_target_type=items"
      )
    ).attributes.map((attribute) => attribute.id)

    expect(buyRuleIds).toEqual(
      expect.arrayContaining([
        "buy_rules_min_quantity",
        "producer",
        "product_variant",
        "item_price",
        "item_quantity",
      ])
    )
    expect(buyGetTargetRuleIds).toEqual(
      expect.arrayContaining([
        "apply_to_quantity",
        "producer",
        "product_variant",
        "item_price",
        "item_quantity",
      ])
    )

    const shippingTargetIds = (
      await admin.get<{
        attributes: Attribute[]
      }>(
        "/admin/promotions/rule-attribute-options/target-rules?application_method_target_type=shipping_methods"
      )
    ).attributes.map((attribute) => attribute.id)

    expect(shippingTargetIds).toContain("shipping_option_type")
    expect(shippingTargetIds).not.toEqual(
      expect.arrayContaining([
        "producer",
        "product_variant",
        "item_price",
        "item_quantity",
      ])
    )

    const invalidRuleType = await admin.request<{
      message?: string
      type?: string
    }>("/admin/promotions/rule-attribute-options/not-a-rule-type")

    expect(invalidRuleType.status).toBe(400)
    expect(invalidRuleType.data).toEqual(
      expect.objectContaining({
        type: "invalid_data",
      })
    )
  })

  it("returns custom producer and product variant rule value options", async () => {
    const context = await createTestContext(backendUrl)
    const producer = await createProducer(
      context.admin,
      `Rule Value Producer ${suffix()}`
    )
    const product = await createProduct(context.admin, context.salesChannelId, {
      title: `Rule Value Product ${suffix()}`,
    })
    const variant = product.variants[0]

    const producerOptions = await context.admin.get<{
      values: Array<{ label: string; value: string }>
    }>(
      `/admin/promotions/rule-value-options/target-rules/producer?value=${producer.id}`
    )
    const buyRuleProducerOptions = await context.admin.get<{
      values: Array<{ label: string; value: string }>
    }>(
      `/admin/promotions/rule-value-options/buy-rules/producer?value=${producer.id}`
    )
    const variantOptions = await context.admin.get<{
      values: Array<{ label: string; value: string }>
    }>(
      `/admin/promotions/rule-value-options/target-rules/product_variant?value=${variant.id}`
    )

    expect(producerOptions.values).toEqual([
      { label: producer.title, value: producer.id },
    ])
    expect(buyRuleProducerOptions.values).toEqual([
      { label: producer.title, value: producer.id },
    ])
    expect(variantOptions.values).toEqual([
      {
        label: `${product.title} - ${variant.title} (${variant.sku})`,
        value: variant.id,
      },
    ])
  })

  it("applies producer promotions only to cart items from the matching producer", async () => {
    const context = await createTestContext(backendUrl)
    const producer = await createProducer(context.admin)
    const otherProducer = await createProducer(context.admin)
    const matchingProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        producerId: producer.id,
        title: `Producer Match ${suffix()}`,
      }
    )
    const otherProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        producerId: otherProducer.id,
        title: `Producer Non Match ${suffix()}`,
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
          attribute: "items.producer_ids",
          operator: "in",
          values: [producer.id],
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
    const producer = await createProducer(context.admin)
    const buyProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        amount: 1500,
        producerId: producer.id,
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
          attribute: "items.producer_ids",
          operator: "in",
          values: [producer.id],
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

  it("computes producer-targeted promotion adjustments for draft orders", async () => {
    const context = await createTestContext(backendUrl)
    const producer = await createProducer(context.admin)
    const product = await createProduct(context.admin, context.salesChannelId, {
      producerId: producer.id,
      title: `Draft Producer Match ${suffix()}`,
    })
    const otherProduct = await createProduct(
      context.admin,
      context.salesChannelId,
      {
        title: `Draft Producer Non Match ${suffix()}`,
      }
    )
    const variant = product.variants[0]
    const otherVariant = otherProduct.variants[0]
    const promotion = await createPromotion(context.admin, {
      targetRules: [
        {
          attribute: "items.producer_ids",
          operator: "in",
          values: [producer.id],
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

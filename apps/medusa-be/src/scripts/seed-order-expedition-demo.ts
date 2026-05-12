import type {
  ExecArgs,
  IOrderModuleService,
  IProductModuleService,
  IRegionModuleService,
  ISalesChannelModuleService,
  Logger,
  ProductCategoryDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"

type DemoVariant = {
  id: string
  sku?: string | null
  title?: string | null
  product?: {
    id?: string | null
    title?: string | null
    handle?: string | null
  } | null
}

type DemoRegion = {
  id: string
  name?: string | null
  currency_code?: string | null
}

type DemoSalesChannel = {
  id: string
  name?: string | null
}

type DemoOrder = {
  carrierName: string
  carrierData: Record<string, unknown>
  city: string
  company?: string
  createdAt: Date
  email: string
  firstName: string
  lastName: string
  postalCode: string
  status:
    | "pending"
    | "completed"
    | "draft"
    | "archived"
    | "canceled"
    | "requires_action"
}

type DemoProductInput = {
  handle: string
} & Record<string, unknown>

type QueryService = {
  graph: (input: {
    entity: string
    fields: string[]
  }) => Promise<{ data?: unknown }>
}

type DatabaseConnection = {
  raw: (sql: string, bindings?: unknown[]) => Promise<unknown>
}

type ExistingDemoOrder = {
  id: string
  display_id?: number | null
  email?: string | null
  metadata?: Record<string, unknown> | null
}

const PRODUCT_IMAGE_URLS = [
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png",
]

const PRODUCT_GROUPS = [
  { category: "Shirts", handle: "shirts", title: "Expedition Tee" },
  {
    category: "Sweatshirts",
    handle: "sweatshirts",
    title: "Expedition Hoodie",
  },
  { category: "Pants", handle: "pants", title: "Expedition Pants" },
  { category: "Merch", handle: "merch", title: "Expedition Kit" },
] as const

const SIZES = ["S", "M", "L"] as const
const COLORS = ["Black", "Olive", "Natural", "Navy"] as const
const DEMO_ORDER_COUNT = 36
const DEMO_ORDER_EMAIL_REGEX = /^expedition\.demo\.(\d+)@example\.test$/u
const DEMO_ORDER_DATE_OFFSETS = [
  { daysAgo: 0, hour: 8, minute: 10 },
  { daysAgo: 0, hour: 10, minute: 45 },
  { daysAgo: 0, hour: 13, minute: 20 },
  { daysAgo: 0, hour: 16, minute: 35 },
  { daysAgo: 1, hour: 9, minute: 5 },
  { daysAgo: 1, hour: 14, minute: 50 },
  { daysAgo: 2, hour: 11, minute: 25 },
  { daysAgo: 3, hour: 15, minute: 40 },
  { daysAgo: 4, hour: 10, minute: 15 },
  { daysAgo: 6, hour: 17, minute: 30 },
  { daysAgo: 8, hour: 8, minute: 55 },
  { daysAgo: 10, hour: 12, minute: 20 },
  { daysAgo: 14, hour: 15, minute: 5 },
  { daysAgo: 18, hour: 9, minute: 35 },
  { daysAgo: 21, hour: 13, minute: 45 },
  { daysAgo: 27, hour: 16, minute: 10 },
  { daysAgo: 32, hour: 11, minute: 15 },
  { daysAgo: 38, hour: 14, minute: 25 },
  { daysAgo: 45, hour: 8, minute: 40 },
  { daysAgo: 52, hour: 12, minute: 50 },
  { daysAgo: 61, hour: 15, minute: 30 },
  { daysAgo: 74, hour: 10, minute: 5 },
  { daysAgo: 88, hour: 17, minute: 15 },
  { daysAgo: 104, hour: 9, minute: 45 },
  { daysAgo: 119, hour: 14, minute: 10 },
  { daysAgo: 137, hour: 11, minute: 55 },
  { daysAgo: 158, hour: 16, minute: 20 },
  { daysAgo: 183, hour: 8, minute: 30 },
  { daysAgo: 205, hour: 13, minute: 15 },
  { daysAgo: 226, hour: 15, minute: 45 },
  { daysAgo: 248, hour: 10, minute: 25 },
  { daysAgo: 270, hour: 12, minute: 5 },
  { daysAgo: 292, hour: 17, minute: 35 },
  { daysAgo: 315, hour: 9, minute: 20 },
  { daysAgo: 338, hour: 14, minute: 40 },
  { daysAgo: 360, hour: 11, minute: 10 },
] as const

export default async function seedOrderExpeditionDemo({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const orderService = container.resolve<IOrderModuleService>(Modules.ORDER)
  const pgConnection = container.resolve<DatabaseConnection>(
    ContainerRegistrationKeys.PG_CONNECTION
  )

  logger.info("Starting order expedition demo seed...")

  const [region, salesChannel] = await Promise.all([
    ensureRegion(container),
    ensureSalesChannel(container),
  ])

  await ensureProducts(container, logger)

  const existingDemoOrders = await fetchExistingDemoOrders(query)
  await normalizeExistingDemoOrderDates(
    pgConnection,
    existingDemoOrders,
    logger
  )

  if (existingDemoOrders.length >= DEMO_ORDER_COUNT) {
    logger.info(
      `Order expedition demo already has ${existingDemoOrders.length} orders, skipping order creation.`
    )
    return
  }

  const variants = await fetchVariants(query)
  if (variants.length < 6) {
    throw new Error(
      "Not enough product variants for order expedition demo seed"
    )
  }

  const ordersToCreate = buildDemoOrders().slice(existingDemoOrders.length)

  for (const [index, order] of ordersToCreate.entries()) {
    const absoluteIndex = existingDemoOrders.length + index
    const orderVariants = [
      variants[absoluteIndex % variants.length],
      variants[(absoluteIndex + 7) % variants.length],
      variants[(absoluteIndex + 13) % variants.length],
    ].filter((variant): variant is DemoVariant => Boolean(variant))

    const { result } = await createOrderWorkflow(container).run({
      input: {
        currency_code: region.currency_code ?? "czk",
        email: order.email,
        items: orderVariants.map((variant, itemIndex) => ({
          product_handle: variant.product?.handle ?? undefined,
          product_id: variant.product?.id ?? undefined,
          product_title: variant.product?.title ?? "Demo product",
          quantity: itemIndex === 0 ? 2 : 1,
          title: variant.product?.title ?? variant.title ?? "Demo item",
          unit_price: 250 + itemIndex * 75,
          variant_id: variant.id,
          variant_sku: variant.sku ?? undefined,
          variant_title: variant.title ?? undefined,
        })),
        metadata: {
          order_expedition_demo: true,
          order_expedition_demo_index: absoluteIndex,
        },
        no_notification: true,
        region_id: region.id,
        sales_channel_id: salesChannel.id,
        shipping_address: {
          address_1: `${100 + absoluteIndex} Demo street`,
          city: order.city,
          company: order.company,
          country_code: "cz",
          first_name: order.firstName,
          last_name: order.lastName,
          phone: `+420777${String(100_000 + absoluteIndex).slice(-6)}`,
          postal_code: order.postalCode,
        },
        shipping_methods: [
          {
            amount: 99,
            data: order.carrierData,
            name: order.carrierName,
          },
        ],
        status: order.status,
        transactions: [
          {
            amount: 1099 + absoluteIndex * 10,
            currency_code: region.currency_code ?? "czk",
            reference: absoluteIndex % 3 === 0 ? "cod" : "card",
            reference_id: `order-expedition-demo-${absoluteIndex + 1}`,
          },
        ],
      },
    })

    await updateOrderCreatedAt(pgConnection, result.id, order.createdAt)

    if (order.status === "draft") {
      await orderService.updateOrders([
        {
          id: result.id,
          is_draft_order: true,
        },
      ])
    }
  }

  logger.info(
    `Created ${ordersToCreate.length} order expedition demo orders. Total demo orders: ${
      existingDemoOrders.length + ordersToCreate.length
    }.`
  )
}

async function ensureRegion(container: ExecArgs["container"]) {
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)
  const existing = await regionService.listRegions({ name: "Czechia" })
  const region = existing[0]

  if (region) {
    return region as DemoRegion
  }

  return (await regionService.createRegions({
    countries: ["cz"],
    currency_code: "czk",
    name: "Czechia",
  })) as DemoRegion
}

async function ensureSalesChannel(container: ExecArgs["container"]) {
  const salesChannelService = container.resolve<ISalesChannelModuleService>(
    Modules.SALES_CHANNEL
  )
  const existing = await salesChannelService.listSalesChannels({
    name: "Default Sales Channel",
  })
  const salesChannel = existing[0]

  if (salesChannel) {
    return salesChannel as DemoSalesChannel
  }

  return (await salesChannelService.createSalesChannels({
    name: "Default Sales Channel",
  })) as DemoSalesChannel
}

async function ensureProducts(
  container: ExecArgs["container"],
  logger: Logger
) {
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const categories = await ensureCategories(productService)
  const existingProducts = await productService.listProducts(
    {},
    {
      select: ["handle"],
    }
  )
  const demoHandles = new Set(buildDemoProductHandles())
  const existingHandles = new Set(
    existingProducts
      .map((product) => product.handle)
      .filter((handle): handle is string => demoHandles.has(handle ?? ""))
  )
  const missingProducts = buildDemoProducts(categories).filter(
    (product) => !existingHandles.has(product.handle)
  )

  if (!missingProducts.length) {
    logger.info("Order expedition demo products already exist.")
    return
  }

  await productService.createProducts(missingProducts as never)
  logger.info(
    `Created ${missingProducts.length} order expedition demo products.`
  )
}

async function ensureCategories(productService: IProductModuleService) {
  const existing = await productService.listProductCategories(
    {},
    {
      select: ["id", "handle", "name"],
    }
  )
  const demoHandles = new Set<string>(
    PRODUCT_GROUPS.map((group) => group.handle)
  )
  const existingHandles = new Set(existing.map((category) => category.handle))
  const missing = PRODUCT_GROUPS.filter(
    (group) => !existingHandles.has(group.handle)
  )

  if (missing.length) {
    await productService.createProductCategories(
      missing.map((group) => ({
        handle: group.handle,
        is_active: true,
        name: group.category,
      }))
    )
  }

  const categories = await productService.listProductCategories(
    {},
    {
      select: ["id", "handle", "name"],
    }
  )

  return new Map(
    categories
      .filter((category) => demoHandles.has(category.handle))
      .map((category) => [category.handle, category])
  )
}

function buildDemoProducts(
  categories: Map<string, ProductCategoryDTO>
): DemoProductInput[] {
  return Array.from({ length: 24 }, (_, index) => {
    const group = pickCircular(PRODUCT_GROUPS, index)
    const category = categories.get(group.handle)
    const color = pickCircular(COLORS, index)
    const productNumber = index + 1

    return {
      category_ids: category ? [category.id] : undefined,
      description: `Demo product ${productNumber} for order expedition testing.`,
      handle: `order-expedition-demo-${productNumber}`,
      images: [{ url: pickCircular(PRODUCT_IMAGE_URLS, index) }],
      metadata: {
        order_expedition_demo: true,
      },
      options: [
        {
          title: "Size",
          values: [...SIZES],
        },
        {
          title: "Color",
          values: [color],
        },
      ],
      status: ProductStatus.PUBLISHED,
      title: `${group.title} ${productNumber}`,
      variants: SIZES.map((size) => ({
        allow_backorder: true,
        manage_inventory: false,
        options: {
          Color: color,
          Size: size,
        },
        sku: `EXP-${String(productNumber).padStart(2, "0")}-${size}`,
        title: `${size} / ${color}`,
      })),
      weight: 400,
    }
  })
}

function buildDemoProductHandles() {
  return Array.from(
    { length: 24 },
    (_, index) => `order-expedition-demo-${index + 1}`
  )
}

function buildDemoOrders(now = new Date()): DemoOrder[] {
  const names = [
    ["Jana", "Novakova", "Praha"],
    ["Petr", "Svoboda", "Brno"],
    ["Eva", "Dvorakova", "Ostrava"],
    ["Tomas", "Prochazka", "Plzen"],
    ["Lucie", "Cerna", "Liberec"],
    ["Martin", "Vesely", "Olomouc"],
    ["Katerina", "Kralova", "Hradec Kralove"],
    ["Marek", "Fiala", "Zlin"],
    ["Barbora", "Kucerova", "Pardubice"],
    ["David", "Marek", "Ceske Budejovice"],
  ] as const
  const carriers = [
    {
      carrierData: { provider: "ppl", service: "parcelshop" },
      carrierName: "PPL ParcelShop",
    },
    {
      carrierData: { provider: "ppl", service: "home" },
      carrierName: "PPL Home Delivery",
    },
    {
      carrierData: { pickupPoint: "Z-123", provider: "Packeta" },
      carrierName: "Packeta Z-Point",
    },
    {
      carrierData: { provider: "Zasilkovna", service: "home" },
      carrierName: "Packeta Home Delivery",
    },
    {
      carrierData: { provider: "manual", service: "courier" },
      carrierName: "Courier Pickup",
    },
  ] as const
  const statuses: DemoOrder["status"][] = [
    "pending",
    "pending",
    "requires_action",
    "draft",
    "completed",
    "archived",
    "canceled",
  ]

  return Array.from({ length: DEMO_ORDER_COUNT }, (_, index) => {
    const [firstName, lastName, city] = pickCircular(names, index)
    const carrier = pickCircular(carriers, index)

    return {
      ...carrier,
      city,
      company: index % 7 === 0 ? `Demo Company ${index + 1}` : undefined,
      createdAt: getDemoOrderCreatedAt(index, now),
      email: `expedition.demo.${index + 1}@example.test`,
      firstName,
      lastName,
      postalCode: `${11_000 + index}`,
      status: pickCircular(statuses, index),
    }
  })
}

function pickCircular<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length]

  if (item === undefined) {
    throw new Error("Cannot pick from an empty demo seed collection")
  }

  return item
}

async function fetchExistingDemoOrders(query: QueryService) {
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "metadata"],
  })

  const orders = Array.isArray(data)
    ? data.filter(
        (order): order is ExistingDemoOrder =>
          typeof order === "object" &&
          order !== null &&
          "id" in order &&
          typeof order.id === "string" &&
          "metadata" in order &&
          (order as { metadata?: Record<string, unknown> }).metadata
            ?.order_expedition_demo === true
      )
    : []

  return sortExistingDemoOrders(orders)
}

async function fetchVariants(query: QueryService) {
  const { data } = await query.graph({
    entity: "variant",
    fields: [
      "id",
      "sku",
      "title",
      "product.id",
      "product.title",
      "product.handle",
    ],
  })
  const demoHandles = new Set(buildDemoProductHandles())

  return Array.isArray(data)
    ? (data as DemoVariant[]).filter((variant) =>
        demoHandles.has(variant.product?.handle ?? "")
      )
    : []
}

async function normalizeExistingDemoOrderDates(
  pgConnection: DatabaseConnection,
  existingDemoOrders: ExistingDemoOrder[],
  logger: Logger
) {
  if (!existingDemoOrders.length) {
    return
  }

  const now = new Date()

  for (const [index, order] of existingDemoOrders.entries()) {
    await updateOrderCreatedAt(
      pgConnection,
      order.id,
      getDemoOrderCreatedAt(index, now)
    )
  }

  logger.info(
    `Normalized created_at dates for ${existingDemoOrders.length} existing order expedition demo orders.`
  )
}

async function updateOrderCreatedAt(
  pgConnection: DatabaseConnection,
  orderId: string,
  createdAt: Date
) {
  await pgConnection.raw('update "order" set "created_at" = ? where "id" = ?', [
    createdAt,
    orderId,
  ])
}

function getDemoOrderCreatedAt(index: number, now: Date) {
  const offset = pickCircular(DEMO_ORDER_DATE_OFFSETS, index)
  const createdAt = new Date(now)

  createdAt.setHours(offset.hour, offset.minute, 0, 0)
  createdAt.setDate(createdAt.getDate() - offset.daysAgo)

  return createdAt
}

function sortExistingDemoOrders(orders: ExistingDemoOrder[]) {
  return orders
    .map((order, index) => ({
      order,
      sortIndex: getExistingDemoOrderSortIndex(order, index),
    }))
    .sort((left, right) => {
      if (left.sortIndex !== right.sortIndex) {
        return left.sortIndex - right.sortIndex
      }

      return left.order.id.localeCompare(right.order.id)
    })
    .map(({ order }) => order)
}

function getExistingDemoOrderSortIndex(
  order: ExistingDemoOrder,
  fallbackIndex: number
) {
  const metadataIndex = order.metadata?.order_expedition_demo_index
  if (typeof metadataIndex === "number" && Number.isFinite(metadataIndex)) {
    return metadataIndex
  }

  if (typeof metadataIndex === "string") {
    const parsedIndex = Number(metadataIndex)
    if (Number.isFinite(parsedIndex)) {
      return parsedIndex
    }
  }

  const emailIndex = getDemoOrderEmailIndex(order.email)
  if (emailIndex !== null) {
    return emailIndex
  }

  return order.display_id ?? fallbackIndex
}

function getDemoOrderEmailIndex(email?: string | null) {
  const match = email?.match(DEMO_ORDER_EMAIL_REGEX)
  const index = match?.[1] ? Number(match[1]) - 1 : null

  return index !== null && Number.isFinite(index) ? index : null
}

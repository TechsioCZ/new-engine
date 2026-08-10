import type { ExecArgs, Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import { omitKeys } from "@techsio/std/object"

import { ORDER_BUSINESS_STATUS_METADATA_KEY } from "../utils/order-business-status"
import type {
  ManualOrderBusinessStatusId,
  OrderBusinessStatusId,
} from "../utils/order-business-status"
import seedOrderExpeditionDemo from "./seed-order-expedition-demo"

const optionalNullableStringSchema = z.string().nullable().optional()
const demoVariantSchema = z.object({
  id: z.string(),
  product: z
    .object({
      handle: optionalNullableStringSchema,
      id: optionalNullableStringSchema,
      title: optionalNullableStringSchema,
    })
    .nullable()
    .optional(),
  sku: optionalNullableStringSchema,
  title: optionalNullableStringSchema,
})
type DemoVariant = z.infer<typeof demoVariantSchema>

const demoRegionSchema = z.object({
  currency_code: optionalNullableStringSchema,
  id: z.string(),
  name: z.string().optional(),
})
type DemoRegion = z.infer<typeof demoRegionSchema>

const demoSalesChannelSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
})
type DemoSalesChannel = z.infer<typeof demoSalesChannelSchema>

const demoOrderMetadataSchema = z
  .object({
    order_business_status_demo: z.boolean().optional(),
    order_business_status_demo_expected_label: z.json().optional(),
    order_business_status_demo_expected_status: z.string().optional(),
    order_business_status_demo_key: z.string().optional(),
    order_business_status_manual: z.string().optional(),
  })
  .catchall(z.json())
type DemoOrderMetadata = z.infer<typeof demoOrderMetadataSchema>

const demoOrderSchema = z.object({
  email: optionalNullableStringSchema,
  id: z.string(),
  metadata: demoOrderMetadataSchema.nullable().optional(),
})
type DemoOrder = z.infer<typeof demoOrderSchema>

interface QueryService {
  graph: (input: {
    entity: string
    fields: string[]
  }) => Promise<{ data?: unknown }>
}

interface DatabaseConnection {
  raw: <T = unknown>(sql: string, bindings?: unknown[]) => Promise<T>
}

type RawRows<T> = T[] | { rows?: T[] }

interface BusinessStatusDemo {
  key: string
  email: string
  expectedStatus: OrderBusinessStatusId
  paid: boolean
  orderStatus: "pending" | "canceled"
  manualStatus?: ManualOrderBusinessStatusId
  fulfillment?: "shipped" | "delivered"
}

interface UpsertCompletedPaymentCollectionInput {
  demo: BusinessStatusDemo
  index: number
  order: DemoOrder
  pgConnection: DatabaseConnection
  region: DemoRegion
}

interface UpsertDemoFulfillmentInput {
  demo: BusinessStatusDemo
  order: DemoOrder
  pgConnection: DatabaseConnection
  stockLocationId: string
  timestamp: Date
}

const DEMO_PRODUCT_HANDLE_PREFIX = "order-expedition-demo-"
const DEMO_ITEM_BASE_AMOUNT = 500
const DEMO_ITEM_AMOUNT_STEP = 25
const DEMO_SHIPPING_AMOUNT = 99
const BUSINESS_STATUS_DEMOS: BusinessStatusDemo[] = [
  {
    email: "business-status.demo.awaiting-payment@example.test",
    expectedStatus: "awaiting_payment",
    key: "awaiting-payment",
    orderStatus: "pending",
    paid: false,
  },
  {
    email: "business-status.demo.paid@example.test",
    expectedStatus: "paid",
    key: "paid",
    orderStatus: "pending",
    paid: true,
  },
  {
    email: "business-status.demo.processing@example.test",
    expectedStatus: "processing",
    key: "processing",
    manualStatus: "processing",
    orderStatus: "pending",
    paid: true,
  },
  {
    email: "business-status.demo.waiting-for-supplier@example.test",
    expectedStatus: "waiting_for_supplier",
    key: "waiting-for-supplier",
    manualStatus: "waiting_for_supplier",
    orderStatus: "pending",
    paid: true,
  },
  {
    email: "business-status.demo.shipped@example.test",
    expectedStatus: "shipped",
    fulfillment: "shipped",
    key: "shipped-over-processing",
    manualStatus: "processing",
    orderStatus: "pending",
    paid: true,
  },
  {
    email: "business-status.demo.delivered@example.test",
    expectedStatus: "delivered",
    fulfillment: "delivered",
    key: "delivered-over-supplier",
    manualStatus: "waiting_for_supplier",
    orderStatus: "pending",
    paid: true,
  },
  {
    email: "business-status.demo.canceled@example.test",
    expectedStatus: "canceled",
    fulfillment: "shipped",
    key: "canceled-over-paid-shipped",
    manualStatus: "canceled",
    orderStatus: "canceled",
    paid: true,
  },
]

const buildDemoMetadata = (
  metadata: DemoOrderMetadata | null | undefined,
  demo: BusinessStatusDemo,
) => ({
  ...omitKeys(metadata ?? {}, [
    "order_business_status_demo_expected_label",
    "order_business_status_manual",
  ]),
  order_business_status_demo: true,
  order_business_status_demo_expected_status: demo.expectedStatus,
  order_business_status_demo_key: demo.key,
  ...(demo.manualStatus === undefined
    ? {}
    : { [ORDER_BUSINESS_STATUS_METADATA_KEY]: demo.manualStatus }),
})

const getRows = <T>(result: RawRows<T>) =>
  Array.isArray(result) ? result : (result.rows ?? [])

const getDemoKey = (order: DemoOrder) => {
  const key = order.metadata?.order_business_status_demo_key
  return typeof key === "string" ? key : undefined
}

const getDemoItemAmount = (index: number) =>
  DEMO_ITEM_BASE_AMOUNT + index * DEMO_ITEM_AMOUNT_STEP

const getDemoOrderTotal = (index: number) =>
  getDemoItemAmount(index) + DEMO_SHIPPING_AMOUNT

const getDemoIdSlug = (demo: BusinessStatusDemo) =>
  demo.key.replaceAll("-", "_")

const getPaymentCollectionId = (demo: BusinessStatusDemo) =>
  `paycol_obs_demo_${getDemoIdSlug(demo)}`

const getFulfillmentId = (demo: BusinessStatusDemo) =>
  `ful_obs_demo_${getDemoIdSlug(demo)}`

const fetchBusinessStatusDemoStockLocationId = async (
  pgConnection: DatabaseConnection,
) => {
  const result = await pgConnection.raw<RawRows<{ id: string }>>(
    `select "id" from "stock_location" where "deleted_at" is null order by "created_at" asc limit 1`,
  )
  const stockLocationId = getRows(result)[0]?.id

  if (stockLocationId === undefined || stockLocationId.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "At least one stock location is required for business status demo seed",
    )
  }

  return stockLocationId
}

const fetchCzechRegion = async (query: QueryService) => {
  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  })

  const parsed = z.array(demoRegionSchema).safeParse(data)
  return parsed.success
    ? parsed.data.find((region) => region.name === "Czechia")
    : undefined
}

const fetchDefaultSalesChannel = async (query: QueryService) => {
  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })

  const parsed = z.array(demoSalesChannelSchema).safeParse(data)
  return parsed.success
    ? parsed.data.find(
        (salesChannel) => salesChannel.name === "Default Sales Channel",
      )
    : undefined
}

const fetchDemoVariants = async (query: QueryService) => {
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

  const parsed = z.array(demoVariantSchema).safeParse(data)
  return parsed.success
    ? parsed.data.filter(
        (variant) =>
          variant.product?.handle?.startsWith(DEMO_PRODUCT_HANDLE_PREFIX) ===
          true,
      )
    : []
}

const fetchBusinessStatusDemoOrders = async (query: QueryService) => {
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "email", "metadata"],
  })

  const parsed = z.array(demoOrderSchema).safeParse(data)
  return parsed.success
    ? parsed.data.filter(
        (order) => order.metadata?.order_business_status_demo === true,
      )
    : []
}

const nonEmptyStringProperty = (
  key: string,
  value: string | null | undefined,
): Record<string, string> =>
  value === undefined || value === null || value.length === 0
    ? {}
    : { [key]: value }

const createDemoOrder = async ({
  container,
  demo,
  index,
  region,
  salesChannel,
  variant,
}: {
  container: ExecArgs["container"]
  demo: BusinessStatusDemo
  index: number
  region: DemoRegion
  salesChannel: DemoSalesChannel
  variant: DemoVariant
}) => {
  await createOrderWorkflow(container).run({
    input: {
      currency_code: region.currency_code ?? "czk",
      email: demo.email,
      items: [
        {
          ...nonEmptyStringProperty("product_handle", variant.product?.handle),
          ...nonEmptyStringProperty("product_id", variant.product?.id),
          product_title: variant.product?.title ?? "Business status demo",
          quantity: 1,
          title: variant.product?.title ?? variant.title ?? "Demo item",
          unit_price: getDemoItemAmount(index),
          variant_id: variant.id,
          ...nonEmptyStringProperty("variant_sku", variant.sku),
          ...nonEmptyStringProperty("variant_title", variant.title),
        },
      ],
      metadata: buildDemoMetadata({}, demo),
      no_notification: true,
      region_id: region.id,
      sales_channel_id: salesChannel.id,
      shipping_address: {
        address_1: `${200 + index} Business status street`,
        city: "Praha",
        country_code: "cz",
        first_name: "Business",
        last_name: `Status ${index + 1}`,
        phone: `+420777${String(200_000 + index).slice(-6)}`,
        postal_code: `${12_000 + index}`,
      },
      shipping_methods: [
        {
          amount: DEMO_SHIPPING_AMOUNT,
          data: { provider: "manual", seed: "order-business-status-demo" },
          name: "Business Status Demo Delivery",
        },
      ],
      status: demo.orderStatus,
      transactions: [],
    },
  })
}

const upsertCompletedPaymentCollection = async ({
  demo,
  index,
  order,
  pgConnection,
  region,
}: UpsertCompletedPaymentCollectionInput) => {
  const paymentCollectionId = getPaymentCollectionId(demo)
  const amount = getDemoOrderTotal(index)
  const rawAmount = { precision: 20, value: amount }
  const metadata = {
    order_business_status_demo: true,
    order_business_status_demo_key: demo.key,
  }

  await pgConnection.raw(
    `insert into "payment_collection" (
        "id",
        "currency_code",
        "amount",
        "raw_amount",
        "captured_amount",
        "raw_captured_amount",
        "completed_at",
        "status",
        "metadata",
        "created_at",
        "updated_at"
      )
      values (?, ?, ?, ?::jsonb, ?, ?::jsonb, now(), 'completed', ?::jsonb, now(), now())
      on conflict ("id") do update
      set "currency_code" = excluded."currency_code",
          "amount" = excluded."amount",
          "raw_amount" = excluded."raw_amount",
          "captured_amount" = excluded."captured_amount",
          "raw_captured_amount" = excluded."raw_captured_amount",
          "completed_at" = excluded."completed_at",
          "status" = excluded."status",
          "metadata" = excluded."metadata",
          "deleted_at" = null,
          "updated_at" = now()`,
    [
      paymentCollectionId,
      region.currency_code ?? "czk",
      amount,
      JSON.stringify(rawAmount),
      amount,
      JSON.stringify(rawAmount),
      JSON.stringify(metadata),
    ],
  )

  await pgConnection.raw(
    `insert into "order_payment_collection" (
        "order_id",
        "payment_collection_id",
        "id",
        "created_at",
        "updated_at"
      )
      values (?, ?, ?, now(), now())
      on conflict ("order_id", "payment_collection_id") do update
      set "deleted_at" = null,
          "updated_at" = now()`,
    [order.id, paymentCollectionId, `ordpaycol_${demo.key}`],
  )
}

const removeDemoPaymentCollection = async (
  pgConnection: DatabaseConnection,
  demo: BusinessStatusDemo,
) => {
  const paymentCollectionId = getPaymentCollectionId(demo)

  await pgConnection.raw(
    `delete from "order_payment_collection" where "payment_collection_id" = ?`,
    [paymentCollectionId],
  )
  await pgConnection.raw(`delete from "payment_collection" where "id" = ?`, [
    paymentCollectionId,
  ])
}

const upsertDemoFulfillment = async ({
  demo,
  order,
  pgConnection,
  stockLocationId,
  timestamp,
}: UpsertDemoFulfillmentInput) => {
  const fulfillmentId = getFulfillmentId(demo)
  const shippedAt = timestamp
  const deliveredAt = demo.fulfillment === "delivered" ? timestamp : null
  const metadata = {
    order_business_status_demo: true,
    order_business_status_demo_key: demo.key,
  }

  await pgConnection.raw(
    `insert into "fulfillment" (
        "id",
        "location_id",
        "packed_at",
        "shipped_at",
        "delivered_at",
        "data",
        "metadata",
        "requires_shipping",
        "created_at",
        "updated_at"
      )
      values (?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, false, now(), now())
      on conflict ("id") do update
      set "packed_at" = excluded."packed_at",
          "shipped_at" = excluded."shipped_at",
          "delivered_at" = excluded."delivered_at",
          "data" = excluded."data",
          "metadata" = excluded."metadata",
          "requires_shipping" = excluded."requires_shipping",
          "deleted_at" = null,
          "updated_at" = now()`,
    [
      fulfillmentId,
      stockLocationId,
      shippedAt,
      shippedAt,
      deliveredAt,
      JSON.stringify({
        provider: "manual",
        seed: "order-business-status-demo",
      }),
      JSON.stringify(metadata),
    ],
  )

  await pgConnection.raw(
    `insert into "order_fulfillment" (
        "order_id",
        "fulfillment_id",
        "id",
        "created_at",
        "updated_at"
      )
      values (?, ?, ?, now(), now())
      on conflict ("order_id", "fulfillment_id") do update
      set "deleted_at" = null,
          "updated_at" = now()`,
    [order.id, fulfillmentId, `ordful_${demo.key}`],
  )
}

const removeDemoFulfillment = async (
  pgConnection: DatabaseConnection,
  demo: BusinessStatusDemo,
) => {
  const fulfillmentId = getFulfillmentId(demo)

  await pgConnection.raw(
    `delete from "order_fulfillment" where "fulfillment_id" = ?`,
    [fulfillmentId],
  )
  await pgConnection.raw(`delete from "fulfillment" where "id" = ?`, [
    fulfillmentId,
  ])
}

const normalizeDemoOrder = async ({
  demo,
  index,
  order,
  pgConnection,
  region,
  stockLocationId,
}: {
  demo: BusinessStatusDemo
  index: number
  order: DemoOrder
  pgConnection: DatabaseConnection
  region: DemoRegion
  stockLocationId: string
}) => {
  const createdAt = new Date(Date.now() - index * 60_000)
  const metadata = buildDemoMetadata(order.metadata, demo)

  // Direct SQL keeps demo chronology deterministic and intentionally bypasses order workflows/subscribers.
  await pgConnection.raw(
    `update "order"
      set "email" = ?,
          "status" = ?,
          "canceled_at" = ?,
          "metadata" = ?::jsonb,
          "created_at" = ?,
          "updated_at" = now()
      where "id" = ?`,
    [
      demo.email,
      demo.orderStatus,
      demo.orderStatus === "canceled" ? createdAt : null,
      JSON.stringify(metadata),
      createdAt,
      order.id,
    ],
  )

  await (demo.paid
    ? upsertCompletedPaymentCollection({
        demo,
        index,
        order,
        pgConnection,
        region,
      })
    : removeDemoPaymentCollection(pgConnection, demo))

  await removeDemoFulfillment(pgConnection, demo)

  if (demo.fulfillment) {
    await upsertDemoFulfillment({
      demo,
      order,
      pgConnection,
      stockLocationId,
      timestamp: createdAt,
    })
  }
}

export default async function seedOrderBusinessStatusDemo({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const pgConnection = container.resolve<DatabaseConnection>(
    ContainerRegistrationKeys.PG_CONNECTION,
  )

  logger.info("Starting order business status demo seed...")

  await seedOrderExpeditionDemo({ args: [], container })
  const stockLocationId =
    await fetchBusinessStatusDemoStockLocationId(pgConnection)

  const [region, salesChannel, variants] = await Promise.all([
    fetchCzechRegion(query),
    fetchDefaultSalesChannel(query),
    fetchDemoVariants(query),
  ])

  if (!region) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Czechia region is required for business status demo seed",
    )
  }

  if (!salesChannel) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Default Sales Channel is required for business status demo seed",
    )
  }

  if (!variants.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "At least one demo product variant is required",
    )
  }

  const existingOrders = await fetchBusinessStatusDemoOrders(query)
  const demosToCreate = BUSINESS_STATUS_DEMOS.flatMap((demo, index) => {
    if (existingOrders.some((order) => getDemoKey(order) === demo.key)) {
      return []
    }

    const variant = variants[index % variants.length]
    if (variant === undefined) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Missing variant for business status demo ${demo.key}`,
      )
    }

    return [{ demo, index, variant }]
  })

  await Promise.all(
    demosToCreate.map(async ({ demo, index, variant }) => {
      await createDemoOrder({
        container,
        demo,
        index,
        region,
        salesChannel,
        variant,
      })
    }),
  )

  const createdOrders = await fetchBusinessStatusDemoOrders(query)
  const ordersToNormalize = BUSINESS_STATUS_DEMOS.map((demo, index) => {
    const order = createdOrders.find(
      (candidate) => getDemoKey(candidate) === demo.key,
    )

    if (order === undefined) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Business status demo order ${demo.key} was not created`,
      )
    }

    return { demo, index, order }
  })

  await Promise.all(
    ordersToNormalize.map(async ({ demo, index, order }) => {
      await normalizeDemoOrder({
        demo,
        index,
        order,
        pgConnection,
        region,
        stockLocationId,
      })
    }),
  )

  logger.info(
    `Order business status demo seed ready with ${BUSINESS_STATUS_DEMOS.length} orders.`,
  )
}

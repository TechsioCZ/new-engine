import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import {
  type ManualOrderBusinessStatusId,
  ORDER_BUSINESS_STATUS_METADATA_KEY,
  type OrderBusinessStatusId,
} from "../utils/order-business-status"
import seedOrderExpeditionDemo from "./seed-order-expedition-demo"

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
  currency_code?: string | null
}

type DemoSalesChannel = {
  id: string
}

type DemoOrder = {
  id: string
  email?: string | null
  metadata?: Record<string, unknown> | null
}

type QueryService = {
  graph: (input: {
    entity: string
    fields: string[]
  }) => Promise<{ data?: unknown }>
}

type DatabaseConnection = {
  raw: <T = unknown>(sql: string, bindings?: unknown[]) => Promise<T>
}

type RawRows<T> = T[] | { rows?: T[] }

type BusinessStatusDemo = {
  key: string
  email: string
  expectedStatus: OrderBusinessStatusId
  paid: boolean
  orderStatus: "pending" | "canceled"
  manualStatus?: ManualOrderBusinessStatusId
  fulfillment?: "shipped" | "delivered"
}

type UpsertCompletedPaymentCollectionInput = {
  demo: BusinessStatusDemo
  index: number
  order: DemoOrder
  pgConnection: DatabaseConnection
  region: DemoRegion
}

type UpsertDemoFulfillmentInput = {
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
    key: "awaiting-payment",
    email: "business-status.demo.awaiting-payment@example.test",
    expectedStatus: "awaiting_payment",
    orderStatus: "pending",
    paid: false,
  },
  {
    key: "paid",
    email: "business-status.demo.paid@example.test",
    expectedStatus: "paid",
    orderStatus: "pending",
    paid: true,
  },
  {
    key: "processing",
    email: "business-status.demo.processing@example.test",
    expectedStatus: "processing",
    manualStatus: "processing",
    orderStatus: "pending",
    paid: true,
  },
  {
    key: "waiting-for-supplier",
    email: "business-status.demo.waiting-for-supplier@example.test",
    expectedStatus: "waiting_for_supplier",
    manualStatus: "waiting_for_supplier",
    orderStatus: "pending",
    paid: true,
  },
  {
    key: "shipped-over-processing",
    email: "business-status.demo.shipped@example.test",
    expectedStatus: "shipped",
    fulfillment: "shipped",
    manualStatus: "processing",
    orderStatus: "pending",
    paid: true,
  },
  {
    key: "delivered-over-supplier",
    email: "business-status.demo.delivered@example.test",
    expectedStatus: "delivered",
    fulfillment: "delivered",
    manualStatus: "waiting_for_supplier",
    orderStatus: "pending",
    paid: true,
  },
  {
    key: "canceled-over-paid-shipped",
    email: "business-status.demo.canceled@example.test",
    expectedStatus: "canceled",
    fulfillment: "shipped",
    manualStatus: "canceled",
    orderStatus: "canceled",
    paid: true,
  },
]

export default async function seedOrderBusinessStatusDemo({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const pgConnection = container.resolve<DatabaseConnection>(
    ContainerRegistrationKeys.PG_CONNECTION
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
    throw new Error("Czechia region is required for business status demo seed")
  }

  if (!salesChannel) {
    throw new Error(
      "Default Sales Channel is required for business status demo seed"
    )
  }

  if (!variants.length) {
    throw new Error("At least one demo product variant is required")
  }

  let existingOrders = await fetchBusinessStatusDemoOrders(query)

  for (const [index, demo] of BUSINESS_STATUS_DEMOS.entries()) {
    if (existingOrders.some((order) => getDemoKey(order) === demo.key)) {
      continue
    }

    const variant = variants[index % variants.length]
    if (!variant) {
      throw new Error(`Missing variant for business status demo ${demo.key}`)
    }

    await createDemoOrder({
      container,
      demo,
      index,
      region,
      salesChannel,
      variant,
    })
  }

  existingOrders = await fetchBusinessStatusDemoOrders(query)

  for (const [index, demo] of BUSINESS_STATUS_DEMOS.entries()) {
    const order = existingOrders.find(
      (candidate) => getDemoKey(candidate) === demo.key
    )

    if (!order) {
      throw new Error(`Business status demo order ${demo.key} was not created`)
    }

    await normalizeDemoOrder({
      demo,
      index,
      order,
      pgConnection,
      region,
      stockLocationId,
    })
  }

  logger.info(
    `Order business status demo seed ready with ${BUSINESS_STATUS_DEMOS.length} orders.`
  )
}

async function createDemoOrder({
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
}) {
  await createOrderWorkflow(container).run({
    input: {
      currency_code: region.currency_code ?? "czk",
      email: demo.email,
      items: [
        {
          product_handle: variant.product?.handle ?? undefined,
          product_id: variant.product?.id ?? undefined,
          product_title: variant.product?.title ?? "Business status demo",
          quantity: 1,
          title: variant.product?.title ?? variant.title ?? "Demo item",
          unit_price: getDemoItemAmount(index),
          variant_id: variant.id,
          variant_sku: variant.sku ?? undefined,
          variant_title: variant.title ?? undefined,
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

async function normalizeDemoOrder({
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
}) {
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
    ]
  )

  if (demo.paid) {
    await upsertCompletedPaymentCollection({
      demo,
      index,
      order,
      pgConnection,
      region,
    })
  } else {
    await removeDemoPaymentCollection(pgConnection, demo)
  }

  await removeDemoFulfillment(pgConnection, demo)

  if (demo.fulfillment) {
    await upsertDemoFulfillment({
      demo,
      pgConnection,
      order,
      stockLocationId,
      timestamp: createdAt,
    })
  }
}

async function upsertCompletedPaymentCollection({
  demo,
  index,
  order,
  pgConnection,
  region,
}: UpsertCompletedPaymentCollectionInput) {
  const paymentCollectionId = getPaymentCollectionId(demo)
  const amount = getDemoOrderTotal(index)
  const rawAmount = { value: amount, precision: 20 }
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
    ]
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
    [order.id, paymentCollectionId, `ordpaycol_${demo.key}`]
  )
}

async function removeDemoPaymentCollection(
  pgConnection: DatabaseConnection,
  demo: BusinessStatusDemo
) {
  const paymentCollectionId = getPaymentCollectionId(demo)

  await pgConnection.raw(
    `delete from "order_payment_collection" where "payment_collection_id" = ?`,
    [paymentCollectionId]
  )
  await pgConnection.raw(`delete from "payment_collection" where "id" = ?`, [
    paymentCollectionId,
  ])
}

async function upsertDemoFulfillment({
  demo,
  order,
  pgConnection,
  stockLocationId,
  timestamp,
}: UpsertDemoFulfillmentInput) {
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
    ]
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
    [order.id, fulfillmentId, `ordful_${demo.key}`]
  )
}

async function removeDemoFulfillment(
  pgConnection: DatabaseConnection,
  demo: BusinessStatusDemo
) {
  const fulfillmentId = getFulfillmentId(demo)

  await pgConnection.raw(
    `delete from "order_fulfillment" where "fulfillment_id" = ?`,
    [fulfillmentId]
  )
  await pgConnection.raw(`delete from "fulfillment" where "id" = ?`, [
    fulfillmentId,
  ])
}

async function fetchBusinessStatusDemoStockLocationId(
  pgConnection: DatabaseConnection
) {
  const result = await pgConnection.raw<RawRows<{ id: string }>>(
    `select "id" from "stock_location" where "deleted_at" is null order by "created_at" asc limit 1`
  )
  const stockLocationId = getRows(result)[0]?.id

  if (!stockLocationId) {
    throw new Error(
      "At least one stock location is required for business status demo seed"
    )
  }

  return stockLocationId
}

async function fetchCzechRegion(query: QueryService) {
  const { data } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  })

  return (
    Array.isArray(data) ? (data as (DemoRegion & { name?: string })[]) : []
  ).find((region) => region.name === "Czechia")
}

async function fetchDefaultSalesChannel(query: QueryService) {
  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })

  return (
    Array.isArray(data)
      ? (data as (DemoSalesChannel & { name?: string })[])
      : []
  ).find((salesChannel) => salesChannel.name === "Default Sales Channel")
}

async function fetchDemoVariants(query: QueryService) {
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

  return Array.isArray(data)
    ? (data as DemoVariant[]).filter((variant) =>
        variant.product?.handle?.startsWith(DEMO_PRODUCT_HANDLE_PREFIX)
      )
    : []
}

async function fetchBusinessStatusDemoOrders(query: QueryService) {
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "email", "metadata"],
  })

  return Array.isArray(data)
    ? (data as DemoOrder[]).filter(
        (order) => order.metadata?.order_business_status_demo === true
      )
    : []
}

function buildDemoMetadata(
  metadata: Record<string, unknown> | null | undefined,
  demo: BusinessStatusDemo
) {
  const nextMetadata: Record<string, unknown> = {
    ...(metadata ?? {}),
    order_business_status_demo: true,
    order_business_status_demo_expected_status: demo.expectedStatus,
    order_business_status_demo_key: demo.key,
  }

  // biome-ignore lint/performance/noDelete: remove a legacy seed marker from serialized demo metadata.
  delete nextMetadata.order_business_status_demo_expected_label

  if (demo.manualStatus) {
    nextMetadata[ORDER_BUSINESS_STATUS_METADATA_KEY] = demo.manualStatus
  } else {
    delete nextMetadata[ORDER_BUSINESS_STATUS_METADATA_KEY]
  }

  return nextMetadata
}

function getRows<T>(result: RawRows<T>) {
  return Array.isArray(result) ? result : (result.rows ?? [])
}

function getDemoKey(order: DemoOrder) {
  const key = order.metadata?.order_business_status_demo_key
  return typeof key === "string" ? key : undefined
}

function getDemoItemAmount(index: number) {
  return DEMO_ITEM_BASE_AMOUNT + index * DEMO_ITEM_AMOUNT_STEP
}

function getDemoOrderTotal(index: number) {
  return getDemoItemAmount(index) + DEMO_SHIPPING_AMOUNT
}

function getDemoIdSlug(demo: BusinessStatusDemo) {
  return demo.key.replace(/-/g, "_")
}

function getPaymentCollectionId(demo: BusinessStatusDemo) {
  return `paycol_obs_demo_${getDemoIdSlug(demo)}`
}

function getFulfillmentId(demo: BusinessStatusDemo) {
  return `ful_obs_demo_${getDemoIdSlug(demo)}`
}

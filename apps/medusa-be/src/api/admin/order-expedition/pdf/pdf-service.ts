import type { MedusaRequest } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import bwipjs from "bwip-js"
import { PageSizes, rgb } from "pdf-lib"
import {
  fetchOrderedOrderExpeditionOrdersByIds,
  type OrderExpeditionItemDto,
  type OrderExpeditionOrderDto,
  type OrderExpeditionRawOrder,
  toOrderExpeditionDto,
} from "../../../../utils/order-expedition"
import type { PostAdminOrderExpeditionPdfSchemaType } from "../validators"
import { createExpeditionPdfContext } from "./pdf-context"
import type { DrawState } from "./types"

const PAGE_MARGIN = 28
const PAGE_BOTTOM = 34
const HEADER_Y = PageSizes.A4[1] - 20
const FOOTER_Y = 18
const BODY_SIZE = 8
const SMALL_SIZE = 7
const HEADING_SIZE = 10
const LINE_HEIGHT = 11
const SECTION_GAP = 10
const FILENAME_SAFE_CHARS_REGEX = /[^a-z0-9-]+/gi
const ORDER_DISPLAY_PREFIX_REGEX = /^#/
const WHITESPACE_REGEX = /\s+/
const TABLE_RIGHT = PageSizes.A4[0] - PAGE_MARGIN
const ORDER_COLUMNS = {
  sku: { x: 34, width: 62 },
  image: { x: 102, width: 34 },
  description: { x: 144, width: 224 },
  quantity: { x: 376, width: 42 },
  stock: { x: 424, width: 46 },
  price: { x: 476, width: 56 },
  complete: { x: 542, width: 24 },
} as const

const SUMMARY_COLUMNS = {
  sku: { x: 34, width: 54 },
  description: { x: 96, width: 300 },
  quantity: { x: 404, width: 38 },
  stock: { x: 448, width: 38 },
  claims: { x: 492, width: 44 },
  real: { x: 530, width: 35 },
} as const

type SummaryItem = {
  key: string
  sku: string
  stock_claims?: number | null
  stock_quantity?: number | null
  title: string
  quantity: number
  real_stock?: number | null
  unit_price?: number | string | null
  variant?: string | null
}

type InventoryItemLink = {
  inventory_item_id: string
  required_quantity?: number | null
  variant_id: string
}

type InventoryLevel = {
  inventory_item_id: string
  reserved_quantity?: number | string | null
  stocked_quantity?: number | string | null
}

type FulfillmentLabel = {
  fulfillment_id: string
  tracking_number?: string | null
}

export async function createOrderExpeditionPdfResponse(
  req: MedusaRequest<PostAdminOrderExpeditionPdfSchemaType>,
  orderIds: string[]
) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { missingOrderIds, orders } =
    await fetchOrderedOrderExpeditionOrdersByIds(query, orderIds)

  if (missingOrderIds.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Orders not found: ${missingOrderIds.join(", ")}`
    )
  }

  const stockQuantitiesByVariantId = await fetchStockQuantitiesByVariantId(
    query,
    orders
  )
  const packetaBarcodesByOrderId = await fetchPacketaBarcodesByOrderId(
    query,
    orders
  )
  const orderedDtos = orders.map((order) =>
    withPacketaBarcode(
      withStockQuantities(
        toOrderExpeditionDto(order),
        stockQuantitiesByVariantId
      ),
      packetaBarcodesByOrderId.get(order.id)
    )
  )
  const pdfBytes = await generateExpeditionPdf(orderedDtos, req)

  return {
    buffer: Buffer.from(pdfBytes),
    filename: buildFilename(orderedDtos),
  }
}
async function fetchStockQuantitiesByVariantId(
  query: Query,
  orders: OrderExpeditionRawOrder[]
) {
  const variantIds = [
    ...new Set(
      orders
        .flatMap((order) => order.items ?? [])
        .map((item) => item.variant_id)
        .filter((variantId): variantId is string => Boolean(variantId))
    ),
  ]

  if (variantIds.length === 0) {
    return new Map<string, number>()
  }

  const { data: rawLinks } = await query.graph({
    entity: "product_variant_inventory_item",
    fields: ["variant_id", "inventory_item_id", "required_quantity"],
    filters: { variant_id: variantIds },
  })

  const links = (rawLinks ?? []).filter(isInventoryItemLink)
  const inventoryItemIds = [
    ...new Set(links.map((link) => link.inventory_item_id)),
  ]

  if (inventoryItemIds.length === 0) {
    return new Map<string, number>()
  }

  const { data: rawLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["inventory_item_id", "stocked_quantity", "reserved_quantity"],
    filters: { inventory_item_id: inventoryItemIds },
  })

  const levels = (rawLevels ?? []).filter(isInventoryLevel)
  const availableByInventoryItemId = new Map<string, number>()
  for (const level of levels) {
    const current = availableByInventoryItemId.get(level.inventory_item_id) ?? 0
    availableByInventoryItemId.set(
      level.inventory_item_id,
      current +
        toNumber(level.stocked_quantity) -
        toNumber(level.reserved_quantity)
    )
  }

  const stockByVariantId = new Map<string, number>()
  for (const link of links) {
    const current = stockByVariantId.get(link.variant_id) ?? 0
    const requiredQuantity = link.required_quantity || 1
    const available =
      availableByInventoryItemId.get(link.inventory_item_id) ?? 0
    stockByVariantId.set(
      link.variant_id,
      current + Math.floor(available / requiredQuantity)
    )
  }

  return stockByVariantId
}

function isInventoryItemLink(value: unknown): value is InventoryItemLink {
  return (
    typeof value === "object" &&
    value !== null &&
    "variant_id" in value &&
    typeof value.variant_id === "string" &&
    "inventory_item_id" in value &&
    typeof value.inventory_item_id === "string"
  )
}

function isInventoryLevel(value: unknown): value is InventoryLevel {
  return (
    typeof value === "object" &&
    value !== null &&
    "inventory_item_id" in value &&
    typeof value.inventory_item_id === "string"
  )
}

async function fetchPacketaBarcodesByOrderId(
  query: Query,
  orders: OrderExpeditionRawOrder[]
) {
  const packetaFulfillments = orders.flatMap((order) =>
    (order.fulfillments ?? [])
      .filter(
        (fulfillment) =>
          !fulfillment.canceled_at &&
          fulfillment.id &&
          fulfillment.provider_id?.toLowerCase().includes("packeta")
      )
      .map((fulfillment) => ({ fulfillment, orderId: order.id }))
  )

  const barcodeByOrderId = new Map<string, string>()
  for (const { fulfillment, orderId } of packetaFulfillments) {
    const barcode = getFulfillmentDataBarcode(fulfillment.data)
    if (barcode) {
      barcodeByOrderId.set(orderId, barcode)
    }
  }

  const fulfillmentIdsMissingBarcode = packetaFulfillments
    .filter(({ orderId }) => !barcodeByOrderId.has(orderId))
    .map(({ fulfillment }) => fulfillment.id)
    .filter((id): id is string => Boolean(id))

  if (fulfillmentIdsMissingBarcode.length === 0) {
    return barcodeByOrderId
  }

  const { data: rawLabels } = await query.graph({
    entity: "fulfillment_label",
    fields: ["fulfillment_id", "tracking_number"],
    filters: { fulfillment_id: fulfillmentIdsMissingBarcode },
  })
  const labels = (rawLabels ?? []).filter(isFulfillmentLabel)
  const trackingByFulfillmentId = new Map(
    labels
      .filter((label) => label.tracking_number)
      .map((label) => [label.fulfillment_id, label.tracking_number as string])
  )

  for (const { fulfillment, orderId } of packetaFulfillments) {
    if (barcodeByOrderId.has(orderId) || !fulfillment.id) {
      continue
    }

    const trackingNumber = trackingByFulfillmentId.get(fulfillment.id)
    if (trackingNumber) {
      barcodeByOrderId.set(orderId, trackingNumber)
    }
  }

  return barcodeByOrderId
}

function getFulfillmentDataBarcode(data?: Record<string, unknown> | null) {
  if (!data) {
    return null
  }

  for (const key of [
    "barcode",
    "barcodeText",
    "tracking_number",
    "packet_id",
  ]) {
    const value = data[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
    if (typeof value === "number") {
      return String(value)
    }
  }

  return null
}

function isFulfillmentLabel(value: unknown): value is FulfillmentLabel {
  return (
    typeof value === "object" &&
    value !== null &&
    "fulfillment_id" in value &&
    typeof value.fulfillment_id === "string"
  )
}

function withPacketaBarcode(
  order: OrderExpeditionOrderDto,
  packetaBarcode?: string
): OrderExpeditionOrderDto {
  return {
    ...order,
    packeta_barcode: packetaBarcode ?? order.packeta_barcode,
  }
}

function withStockQuantities(
  order: OrderExpeditionOrderDto,
  stockQuantitiesByVariantId: Map<string, number>
): OrderExpeditionOrderDto {
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      stock_quantity: item.variant_id
        ? (stockQuantitiesByVariantId.get(item.variant_id) ?? null)
        : null,
    })),
  }
}

function toNumber(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

async function generateExpeditionPdf(
  orders: OrderExpeditionOrderDto[],
  req: MedusaRequest<PostAdminOrderExpeditionPdfSchemaType>
) {
  const { document, state } = await createExpeditionPdfContext(req)

  drawHeader(state)
  await drawOrdersByCarrier(state, orders)
  await drawSummary(state, orders)
  drawFooter(state)

  return document.save()
}

async function drawOrdersByCarrier(
  state: DrawState,
  orders: OrderExpeditionOrderDto[]
) {
  const groups = groupOrdersByCarrier(orders)

  for (const group of groups) {
    ensureSpace(state, 40)
    drawText(
      state,
      `Objednávky k expedici - ${group.label}`,
      PAGE_MARGIN,
      state.y,
      {
        font: state.boldFont,
        size: HEADING_SIZE,
      }
    )
    state.y -= 18

    for (const order of group.orders) {
      await drawOrder(state, order)
      state.y -= SECTION_GAP
    }
  }
}

async function drawOrder(state: DrawState, order: OrderExpeditionOrderDto) {
  ensureSpace(state, order.packeta_barcode ? 136 : 78)
  drawText(
    state,
    `Objednávka ${order.order_display_id.replace(ORDER_DISPLAY_PREFIX_REGEX, "")}`,
    PAGE_MARGIN,
    state.y,
    {
      font: state.boldFont,
      size: HEADING_SIZE,
    }
  )

  const address = buildOrderAddressLine(order)
  drawWrappedRight(state, address, 280, state.y, 286, {
    font: state.regularFont,
    size: BODY_SIZE,
    lineHeight: LINE_HEIGHT,
  })
  state.y -= 16

  if (order.packeta_barcode) {
    await drawPacketaBarcode(state, order.packeta_barcode)
  } else {
    state.y -= 10
  }

  drawOrderTableHeader(state)

  for (const item of order.items) {
    await drawOrderItemRow(state, item, order.currency_code)
  }

  if (order.note) {
    ensureSpace(state, LINE_HEIGHT * 2)
    state.y -= 4
    drawWrappedText(
      state,
      `Poznámka k objednávce: ${order.note}`,
      PAGE_MARGIN,
      state.y,
      420,
      {
        font: state.regularFont,
        size: BODY_SIZE,
        lineHeight: LINE_HEIGHT,
      }
    )
  }
}

function drawOrderTableHeader(state: DrawState) {
  ensureSpace(state, 28)
  const topY = state.y + 8
  const textY = state.y - 6
  const bottomY = state.y - 18

  drawTableFrame(state, topY, bottomY)
  drawText(state, "Kód", ORDER_COLUMNS.sku.x + 2, textY, {
    font: state.boldFont,
    size: BODY_SIZE,
  })
  drawText(state, "Obr.", ORDER_COLUMNS.image.x + 2, textY, {
    font: state.boldFont,
    size: BODY_SIZE,
  })
  drawText(state, "Popis položky", ORDER_COLUMNS.description.x + 2, textY, {
    font: state.boldFont,
    size: BODY_SIZE,
  })
  drawText(state, "Množství", ORDER_COLUMNS.quantity.x + 2, textY, {
    font: state.boldFont,
    size: BODY_SIZE,
  })
  drawText(state, "Stav", ORDER_COLUMNS.stock.x + 2, textY, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })
  drawText(state, "skladu", ORDER_COLUMNS.stock.x + 2, textY - 8, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })
  drawText(state, "Cena za", ORDER_COLUMNS.price.x + 2, textY, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })
  drawText(state, "m. j.", ORDER_COLUMNS.price.x + 2, textY - 8, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })
  drawText(state, "Hotovo", ORDER_COLUMNS.complete.x - 2, textY, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })

  state.y = bottomY - 8
}

async function drawOrderItemRow(
  state: DrawState,
  item: OrderExpeditionItemDto,
  currencyCode?: string | null
) {
  const description = buildItemDescription(item)
  const descriptionLines = wrapText(
    toPdfSafeText(description),
    state.regularFont,
    BODY_SIZE,
    ORDER_COLUMNS.description.width - 4
  )
  const skuLines = wrapText(
    toPdfSafeText(item.sku ?? "-"),
    state.regularFont,
    SMALL_SIZE,
    ORDER_COLUMNS.sku.width - 4
  )
  const rowHeight = Math.max(
    42,
    Math.max(descriptionLines.length, skuLines.length) * LINE_HEIGHT + 10
  )
  ensureSpace(state, rowHeight + 8)

  const topY = state.y + 6
  const startY = state.y - 4
  const bottomY = topY - rowHeight
  drawTableFrame(state, topY, bottomY)

  skuLines.forEach((line, index) => {
    drawText(
      state,
      line,
      ORDER_COLUMNS.sku.x + 2,
      startY - index * LINE_HEIGHT,
      {
        font: state.regularFont,
        size: SMALL_SIZE,
      }
    )
  })

  const image = await getEmbeddedImage(state, item.thumbnail)
  if (image) {
    state.page.drawImage(image, {
      height: 28,
      width: 28,
      x: ORDER_COLUMNS.image.x + 3,
      y: bottomY + Math.max(5, (rowHeight - 28) / 2),
    })
  }

  descriptionLines.forEach((line, index) => {
    drawText(
      state,
      line,
      ORDER_COLUMNS.description.x + 2,
      startY - index * LINE_HEIGHT,
      {
        font: state.regularFont,
        size: BODY_SIZE,
      }
    )
  })
  drawText(
    state,
    `${formatQuantity(item.quantity)} ks`,
    ORDER_COLUMNS.quantity.x + 2,
    startY,
    {
      font: state.regularFont,
      size: BODY_SIZE,
    }
  )
  drawText(
    state,
    formatStock(item.stock_quantity),
    ORDER_COLUMNS.stock.x + 8,
    startY,
    {
      font: state.regularFont,
      size: BODY_SIZE,
    }
  )
  drawRightText(
    state,
    formatMoney(item.unit_price, currencyCode),
    ORDER_COLUMNS.price.x + ORDER_COLUMNS.price.width - 3,
    startY,
    { font: state.regularFont, size: SMALL_SIZE }
  )
  drawCheckbox(state, ORDER_COLUMNS.complete.x + 8, startY - 2)
  state.y = bottomY - 6
}

async function drawSummary(
  state: DrawState,
  orders: OrderExpeditionOrderDto[]
) {
  addPage(state)
  drawText(state, "Položky objednávek", PAGE_MARGIN, state.y, {
    font: state.boldFont,
    size: HEADING_SIZE,
  })
  state.y -= 20
  drawSummaryHeader(state)

  for (const item of buildSummaryItems(orders)) {
    drawSummaryItemRow(state, item)
  }
}

function drawSummaryHeader(state: DrawState) {
  ensureSpace(state, 28)
  const topY = state.y + 8
  const textY = state.y - 6
  const bottomY = state.y - 18

  drawSummaryTableFrame(state, topY, bottomY)
  drawText(state, "Kód", SUMMARY_COLUMNS.sku.x + 2, textY, {
    font: state.boldFont,
    size: BODY_SIZE,
  })
  drawText(state, "Popis položky", SUMMARY_COLUMNS.description.x + 2, textY, {
    font: state.boldFont,
    size: BODY_SIZE,
  })
  drawText(state, "Množství", SUMMARY_COLUMNS.quantity.x + 2, textY, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })
  drawText(state, "Stav", SUMMARY_COLUMNS.stock.x + 2, textY, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })
  drawText(state, "skladu", SUMMARY_COLUMNS.stock.x + 2, textY - 8, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })
  drawText(state, "Sklad.", SUMMARY_COLUMNS.claims.x + 2, textY, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })
  drawText(state, "nároky", SUMMARY_COLUMNS.claims.x + 2, textY - 8, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })
  drawText(state, "Reálný", SUMMARY_COLUMNS.real.x + 2, textY, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })
  drawText(state, "stav", SUMMARY_COLUMNS.real.x + 2, textY - 8, {
    font: state.boldFont,
    size: SMALL_SIZE,
  })

  state.y = bottomY - 8
}

function drawSummaryItemRow(state: DrawState, item: SummaryItem) {
  const description = buildItemDescription(item)
  const descriptionLines = wrapText(
    toPdfSafeText(description),
    state.regularFont,
    BODY_SIZE,
    SUMMARY_COLUMNS.description.width - 4
  )
  const skuLines = wrapText(
    toPdfSafeText(item.sku || "-"),
    state.regularFont,
    SMALL_SIZE,
    SUMMARY_COLUMNS.sku.width - 4
  )
  const rowHeight = Math.max(
    24,
    Math.max(descriptionLines.length, skuLines.length) * LINE_HEIGHT + 10
  )
  ensureSpace(state, rowHeight + 8)

  const topY = state.y + 6
  const startY = state.y - 4
  const bottomY = topY - rowHeight
  drawSummaryTableFrame(state, topY, bottomY)

  skuLines.forEach((line, index) => {
    drawText(
      state,
      line,
      SUMMARY_COLUMNS.sku.x + 2,
      startY - index * LINE_HEIGHT,
      {
        font: state.regularFont,
        size: SMALL_SIZE,
      }
    )
  })
  descriptionLines.forEach((line, index) => {
    drawText(
      state,
      line,
      SUMMARY_COLUMNS.description.x + 2,
      startY - index * LINE_HEIGHT,
      {
        font: state.regularFont,
        size: BODY_SIZE,
      }
    )
  })
  drawCenteredText(
    state,
    `${formatQuantity(item.quantity)} ks`,
    SUMMARY_COLUMNS.quantity.x,
    SUMMARY_COLUMNS.quantity.width,
    startY,
    {
      font: state.regularFont,
      size: BODY_SIZE,
    }
  )
  drawCenteredText(
    state,
    formatStock(item.stock_quantity),
    SUMMARY_COLUMNS.stock.x,
    SUMMARY_COLUMNS.stock.width,
    startY,
    {
      font: state.regularFont,
      size: BODY_SIZE,
    }
  )
  drawCenteredText(
    state,
    formatNullableQuantity(item.stock_claims ?? item.quantity),
    SUMMARY_COLUMNS.claims.x,
    SUMMARY_COLUMNS.claims.width,
    startY,
    {
      font: state.regularFont,
      size: BODY_SIZE,
    }
  )
  drawCenteredText(
    state,
    formatNullableQuantity(item.real_stock ?? item.stock_quantity),
    SUMMARY_COLUMNS.real.x,
    SUMMARY_COLUMNS.real.width,
    startY,
    {
      font: state.regularFont,
      size: BODY_SIZE,
    }
  )
  state.y = bottomY - 6
}

function groupOrdersByCarrier(orders: OrderExpeditionOrderDto[]) {
  const groups = new Map<
    string,
    { label: string; orders: OrderExpeditionOrderDto[] }
  >()

  for (const order of orders) {
    const method = order.carrier.shipping_method_name ?? order.carrier.label
    const label = formatCarrierLabel(method || order.carrier.label)
    const existing = groups.get(label)
    if (existing) {
      existing.orders.push(order)
    } else {
      groups.set(label, { label, orders: [order] })
    }
  }

  return Array.from(groups.values())
}

function formatCarrierLabel(label: string) {
  return label
    .replace(/\bvydejni\b/gi, "výdejní")
    .replace(/\bmisto\b/gi, "místo")
    .replace(/\bzasilkovna\b/gi, "Zásilkovna")
    .replace(/\bpacketa\b/gi, "Packeta")
}

function buildSummaryItems(orders: OrderExpeditionOrderDto[]) {
  const itemsByKey = new Map<string, SummaryItem>()

  for (const order of orders) {
    for (const item of order.items) {
      const key = [item.sku ?? "", item.title, item.variant ?? ""].join("|")
      const existing = itemsByKey.get(key)
      if (existing) {
        existing.quantity += item.quantity
        existing.stock_claims = (existing.stock_claims ?? 0) + item.quantity
        existing.real_stock = existing.stock_quantity
      } else {
        itemsByKey.set(key, {
          key,
          quantity: item.quantity,
          sku: item.sku ?? "",
          stock_claims: item.quantity,
          stock_quantity: item.stock_quantity,
          title: item.title,
          real_stock: item.stock_quantity,
          unit_price: item.unit_price,
          variant: item.variant,
        })
      }
    }
  }

  return Array.from(itemsByKey.values()).sort(
    (left, right) =>
      left.sku.localeCompare(right.sku) || left.title.localeCompare(right.title)
  )
}

function buildOrderAddressLine(order: OrderExpeditionOrderDto) {
  const parts = [order.customer, ...order.delivery_address]
    .map((part) => part?.trim())
    .filter(Boolean)

  return parts.join(", ")
}

function buildItemDescription(
  item: Pick<OrderExpeditionItemDto, "title" | "variant">
) {
  return item.variant ? `${item.title}\nVarianta: ${item.variant}` : item.title
}

function formatMoney(
  value: number | string | null | undefined,
  currencyCode?: string | null
) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) {
    return "-"
  }

  return new Intl.NumberFormat("cs-CZ", {
    currency: (currencyCode ?? "EUR").toUpperCase(),
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(amount)
}

function formatQuantity(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : String(value).replace(".", ",")
}

function formatNullableQuantity(value: number | null | undefined) {
  return typeof value === "number" ? formatQuantity(value) : "-"
}

function formatStock(value: null | number | undefined) {
  return typeof value === "number" ? `${formatQuantity(value)} ks` : "-"
}

function drawHeader(state: DrawState) {
  const now = new Date()
  const date = new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
    .format(now)
    .replace(",", "")

  drawText(state, date, PAGE_MARGIN, HEADER_Y, {
    font: state.regularFont,
    size: BODY_SIZE,
  })
  drawRightText(state, state.title, PageSizes.A4[0] - PAGE_MARGIN, HEADER_Y, {
    font: state.regularFont,
    size: BODY_SIZE,
  })
}

function drawFooter(state: DrawState) {
  const pageCount = state.document.getPageCount()
  for (const [index, page] of state.document.getPages().entries()) {
    drawPageText(page, toPdfSafeText(state.url), PAGE_MARGIN, FOOTER_Y, {
      font: state.regularFont,
      size: SMALL_SIZE,
    })
    const label = `${index + 1}/${pageCount}`
    drawPageRightText(page, label, PageSizes.A4[0] - PAGE_MARGIN, FOOTER_Y, {
      font: state.regularFont,
      size: SMALL_SIZE,
    })
  }
}

function addPage(state: DrawState) {
  state.page = state.document.addPage(PageSizes.A4)
  state.pageNumber += 1
  state.y = HEADER_Y - 28
  drawHeader(state)
}

function ensureSpace(state: DrawState, requiredHeight: number) {
  if (state.y - requiredHeight >= PAGE_BOTTOM) {
    return
  }

  addPage(state)
}

function drawTableFrame(state: DrawState, topY: number, bottomY: number) {
  drawFrame(state, topY, bottomY, [
    PAGE_MARGIN,
    ORDER_COLUMNS.image.x - 6,
    ORDER_COLUMNS.description.x - 6,
    ORDER_COLUMNS.quantity.x - 6,
    ORDER_COLUMNS.stock.x - 6,
    ORDER_COLUMNS.price.x - 6,
    ORDER_COLUMNS.complete.x - 6,
    TABLE_RIGHT,
  ])
}

function drawSummaryTableFrame(
  state: DrawState,
  topY: number,
  bottomY: number
) {
  drawFrame(state, topY, bottomY, [
    PAGE_MARGIN,
    SUMMARY_COLUMNS.description.x - 6,
    SUMMARY_COLUMNS.quantity.x - 6,
    SUMMARY_COLUMNS.stock.x - 6,
    SUMMARY_COLUMNS.claims.x - 6,
    SUMMARY_COLUMNS.real.x - 6,
    TABLE_RIGHT,
  ])
}

function drawFrame(
  state: DrawState,
  topY: number,
  bottomY: number,
  verticalLines: number[]
) {
  for (const x of verticalLines) {
    state.page.drawLine({
      color: rgb(0.78, 0.78, 0.78),
      end: { x, y: bottomY },
      start: { x, y: topY },
      thickness: 0.35,
    })
  }

  for (const y of [topY, bottomY]) {
    state.page.drawLine({
      color: rgb(0.78, 0.78, 0.78),
      end: { x: TABLE_RIGHT, y },
      start: { x: PAGE_MARGIN, y },
      thickness: 0.35,
    })
  }
}

async function getEmbeddedImage(
  state: DrawState,
  imageUrl: null | string | undefined
) {
  if (!imageUrl) {
    return null
  }

  const resolvedUrl = resolveImageUrl(imageUrl, state.url)
  const cached = state.imageCache.get(resolvedUrl)
  if (cached !== undefined) {
    return cached
  }

  try {
    const response = await fetch(resolvedUrl)
    if (!response.ok) {
      state.imageCache.set(resolvedUrl, null)
      return null
    }

    const bytes = new Uint8Array(await response.arrayBuffer())
    const contentType = response.headers.get("content-type") ?? ""
    const image = contentType.includes("png")
      ? await state.document.embedPng(bytes)
      : await state.document.embedJpg(bytes)

    state.imageCache.set(resolvedUrl, image)
    return image
  } catch {
    state.imageCache.set(resolvedUrl, null)
    return null
  }
}

async function drawPacketaBarcode(state: DrawState, barcode: string) {
  const embeddedBarcode = await getEmbeddedPacketaBarcode(state, barcode)

  if (embeddedBarcode) {
    const dimensions = embeddedBarcode.scaleToFit(160, 30)
    state.page.drawImage(embeddedBarcode, {
      height: dimensions.height,
      width: dimensions.width,
      x: PAGE_MARGIN,
      y: state.y - dimensions.height,
    })
    state.y -= dimensions.height + 14
    return
  }

  drawText(state, `Packeta čárový kód: ${barcode}`, PAGE_MARGIN, state.y, {
    font: state.boldFont,
    size: BODY_SIZE,
  })
  state.y -= 12
}

async function getEmbeddedPacketaBarcode(state: DrawState, barcode: string) {
  const cached = state.barcodeCache.get(barcode)
  if (cached !== undefined) {
    return cached
  }

  try {
    const png = await bwipjs.toBuffer({
      bcid: "code128",
      backgroundcolor: "FFFFFF",
      includetext: false,
      paddingheight: 0,
      paddingwidth: 0,
      scale: 1,
      text: barcode,
    })
    const image = await state.document.embedPng(png)
    state.barcodeCache.set(barcode, image)
    return image
  } catch {
    state.barcodeCache.set(barcode, null)
    return null
  }
}

function resolveImageUrl(imageUrl: string, baseUrl: string) {
  try {
    return new URL(imageUrl, baseUrl).toString()
  } catch {
    return imageUrl
  }
}

function drawCheckbox(state: DrawState, x: number, y: number) {
  state.page.drawRectangle({
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.8,
    height: 7,
    width: 7,
    x,
    y,
  })
}

// biome-ignore lint/nursery/useMaxParams: PDF drawing helpers are clearer with x/y/width arguments.
function drawWrappedRight(
  state: DrawState,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: { font: DrawState["regularFont"]; lineHeight: number; size: number }
) {
  const lines = wrapText(
    toPdfSafeText(text),
    options.font,
    options.size,
    maxWidth
  )
  lines.forEach((line, index) => {
    drawRightText(
      state,
      line,
      x + maxWidth,
      y - index * options.lineHeight,
      options
    )
  })
}

// biome-ignore lint/nursery/useMaxParams: PDF drawing helpers are clearer with x/y/width arguments.
function drawWrappedText(
  state: DrawState,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: { font: DrawState["regularFont"]; lineHeight: number; size: number }
) {
  const lines = toPdfSafeText(text)
    .split("\n")
    .flatMap((line) => wrapText(line, options.font, options.size, maxWidth))

  lines.forEach((line, index) => {
    ensureSpace(state, options.lineHeight)
    drawText(state, line, x, y - index * options.lineHeight, options)
    state.y = y - (index + 1) * options.lineHeight
  })
}

// biome-ignore lint/nursery/useMaxParams: PDF drawing helpers are clearer with x/y arguments.
function drawText(
  state: DrawState,
  text: string,
  x: number,
  y: number,
  options: { font: DrawState["regularFont"]; size: number }
) {
  drawPageText(state.page, text, x, y, options)
}

// biome-ignore lint/nursery/useMaxParams: PDF drawing helpers are clearer with x/y arguments.
function drawRightText(
  state: DrawState,
  text: string,
  rightX: number,
  y: number,
  options: { font: DrawState["regularFont"]; size: number }
) {
  drawPageRightText(state.page, text, rightX, y, options)
}

// biome-ignore lint/nursery/useMaxParams: PDF drawing helpers are clearer with x/y arguments.
function drawCenteredText(
  state: DrawState,
  text: string,
  x: number,
  width: number,
  y: number,
  options: { font: DrawState["regularFont"]; size: number }
) {
  drawPageCenteredText(state.page, text, x, width, y, options)
}

// biome-ignore lint/nursery/useMaxParams: PDF drawing helpers are clearer with x/y arguments.
function drawPageText(
  page: DrawState["page"],
  text: string,
  x: number,
  y: number,
  options: { font: DrawState["regularFont"]; size: number }
) {
  page.drawText(toPdfSafeText(text), {
    color: rgb(0, 0, 0),
    font: options.font,
    size: options.size,
    x,
    y,
  })
}

// biome-ignore lint/nursery/useMaxParams: PDF drawing helpers are clearer with x/y arguments.
function drawPageRightText(
  page: DrawState["page"],
  text: string,
  rightX: number,
  y: number,
  options: { font: DrawState["regularFont"]; size: number }
) {
  const safeText = toPdfSafeText(text)
  page.drawText(safeText, {
    color: rgb(0, 0, 0),
    font: options.font,
    size: options.size,
    x: rightX - options.font.widthOfTextAtSize(safeText, options.size),
    y,
  })
}

// biome-ignore lint/nursery/useMaxParams: PDF drawing helpers are clearer with x/y arguments.
function drawPageCenteredText(
  page: DrawState["page"],
  text: string,
  x: number,
  width: number,
  y: number,
  options: { font: DrawState["regularFont"]; size: number }
) {
  const safeText = toPdfSafeText(text)
  page.drawText(safeText, {
    color: rgb(0, 0, 0),
    font: options.font,
    size: options.size,
    x: x + (width - options.font.widthOfTextAtSize(safeText, options.size)) / 2,
    y,
  })
}

function wrapText(
  text: string,
  font: DrawState["regularFont"],
  size: number,
  maxWidth: number
) {
  return text
    .split("\n")
    .flatMap((line) => wrapTextLine(line, font, size, maxWidth))
}

function wrapTextLine(
  text: string,
  font: DrawState["regularFont"],
  size: number,
  maxWidth: number
) {
  const words = text.split(WHITESPACE_REGEX)
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = ""
      }

      lines.push(...splitLongWord(word, font, size, maxWidth))
      continue
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
    }
    currentLine = word
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : [""]
}

function splitLongWord(
  word: string,
  font: DrawState["regularFont"],
  size: number,
  maxWidth: number
) {
  const chunks: string[] = []
  let chunk = ""

  for (const char of word) {
    const candidate = `${chunk}${char}`
    if (chunk && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      chunks.push(chunk)
      chunk = char
      continue
    }

    chunk = candidate
  }

  if (chunk) {
    chunks.push(chunk)
  }

  return chunks
}

function buildFilename(orders: OrderExpeditionOrderDto[]) {
  const firstOrder = orders[0]

  if (orders.length === 1 && firstOrder) {
    return `expedition-${firstOrder.order_display_id.replace(FILENAME_SAFE_CHARS_REGEX, "")}.pdf`
  }

  return `expedition-orders-${new Date().toISOString().slice(0, 10)}.pdf`
}

const PDF_SAFE_CHAR_REPLACEMENTS: Record<string, string> = {
  "\u00a0": " ",
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2212": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u2026": "...",
  "Ł": "L",
  "ł": "l",
}

function toPdfSafeText(value: string) {
  return value
    .replaceAll("\t", " ")
    .replaceAll("\n", " ")
    .replaceAll("\r", " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split("")
    .map((char) => {
      if (char in PDF_SAFE_CHAR_REPLACEMENTS) {
        return PDF_SAFE_CHAR_REPLACEMENTS[char] ?? ""
      }

      return /[\x20-\x7E]/.test(char) ? char : "?"
    })
    .join("")
}

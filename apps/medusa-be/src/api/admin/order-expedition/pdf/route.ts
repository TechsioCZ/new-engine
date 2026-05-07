import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { PDFFont, PDFPage } from "pdf-lib"
import { PageSizes, PDFDocument, rgb, StandardFonts } from "pdf-lib"
import {
  findMissingOrderIds,
  ORDER_EXPEDITION_ORDER_FIELDS,
  type OrderExpeditionOrderDto,
  type OrderExpeditionRawOrder,
  orderOrdersByRequestedIds,
  toOrderExpeditionDto,
} from "../../../../utils/order-expedition"
import type { PostAdminOrderExpeditionPdfSchemaType } from "../validators"

const PAGE_MARGIN = 40
const PAGE_BOTTOM = 40
const BODY_SIZE = 10
const BODY_LINE_HEIGHT = 14
const HEADING_SIZE = 16
const SECTION_GAP = 12
const FILENAME_SAFE_CHARS_REGEX = /[^a-z0-9-]+/gi
const WHITESPACE_REGEX = /\s+/

type DrawState = {
  document: PDFDocument
  page: PDFPage
  y: number
}

type DrawContext = DrawState & {
  boldFont: PDFFont
  regularFont: PDFFont
}

export async function POST(
  req: MedusaRequest<PostAdminOrderExpeditionPdfSchemaType>,
  res: MedusaResponse
): Promise<void> {
  const { order_ids: orderIds } = req.validatedBody
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_EXPEDITION_ORDER_FIELDS,
    filters: {
      id: orderIds,
    },
  })

  const orders = data as OrderExpeditionRawOrder[]
  const missingOrderIds = findMissingOrderIds(orderIds, orders)

  if (missingOrderIds.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Orders not found: ${missingOrderIds.join(", ")}`
    )
  }

  const orderedDtos = orderOrdersByRequestedIds(orderIds, orders).map(
    toOrderExpeditionDto
  )
  const pdfBytes = await generateExpeditionPdf(orderedDtos)
  const buffer = Buffer.from(pdfBytes)

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${buildFilename(orderedDtos)}"`,
    "Content-Length": buffer.length,
  })
  res.send(buffer)
}

async function generateExpeditionPdf(orders: OrderExpeditionOrderDto[]) {
  const document = await PDFDocument.create()
  const regularFont = await document.embedFont(StandardFonts.Helvetica)
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold)
  const state: DrawContext = {
    boldFont,
    document,
    page: document.addPage(PageSizes.A4),
    regularFont,
    y: PageSizes.A4[1] - PAGE_MARGIN,
  }

  for (const [index, order] of orders.entries()) {
    if (index > 0) {
      state.page = document.addPage(PageSizes.A4)
      state.y = PageSizes.A4[1] - PAGE_MARGIN
    }

    drawOrderSection(state, order)
  }

  return document.save()
}

function drawOrderSection(state: DrawContext, order: OrderExpeditionOrderDto) {
  drawLine(state, `Expedicni prehled - ${order.order_display_id}`, {
    font: state.boldFont,
    size: HEADING_SIZE,
  })
  state.y -= SECTION_GAP

  drawKeyValue(state, "Zakaznik", order.customer)
  drawKeyValue(state, "E-mail", order.email ?? "-")
  drawKeyValue(
    state,
    "Dopravce",
    order.carrier.shipping_method_name ?? order.carrier.label
  )
  drawKeyValue(state, "Zpusob platby", order.payment_method)
  drawKeyValue(state, "Stav", order.status ?? "-")

  state.y -= SECTION_GAP
  drawLine(state, "Dorucovaci adresa", { font: state.boldFont })
  const addressLines =
    order.delivery_address.length > 0 ? order.delivery_address : ["-"]
  for (const line of addressLines) {
    drawLine(state, line, { font: state.regularFont })
  }

  state.y -= SECTION_GAP
  drawLine(state, "Polozky", { font: state.boldFont })
  drawLine(state, "Mnozstvi  Nazev", { font: state.boldFont })

  for (const item of order.items) {
    const sku = item.sku ? ` (${item.sku})` : ""
    drawWrappedText(state, `${item.quantity}x  ${item.title}${sku}`, {
      font: state.regularFont,
      size: BODY_SIZE,
      maxWidth: PageSizes.A4[0] - PAGE_MARGIN * 2,
    })
  }
}

function drawKeyValue(state: DrawContext, label: string, value: string) {
  ensureSpace(state, BODY_LINE_HEIGHT)
  const labelX = PAGE_MARGIN
  const valueX = PAGE_MARGIN + 120

  state.page.drawText(toPdfSafeText(`${label}:`), {
    x: labelX,
    y: state.y,
    size: BODY_SIZE,
    font: state.boldFont,
    color: rgb(0, 0, 0),
  })
  state.page.drawText(toPdfSafeText(value), {
    x: valueX,
    y: state.y,
    size: BODY_SIZE,
    font: state.regularFont,
    color: rgb(0, 0, 0),
  })
  state.y -= BODY_LINE_HEIGHT
}

function drawLine(
  state: DrawState,
  text: string,
  options: {
    font: PDFFont
    size?: number
  }
) {
  drawWrappedText(state, text, {
    font: options.font,
    size: options.size ?? BODY_SIZE,
    maxWidth: PageSizes.A4[0] - PAGE_MARGIN * 2,
  })
}

function drawWrappedText(
  state: DrawState,
  text: string,
  options: {
    font: PDFFont
    size: number
    maxWidth: number
  }
) {
  const lines = wrapText(
    toPdfSafeText(text),
    options.font,
    options.size,
    options.maxWidth
  )

  for (const line of lines) {
    ensureSpace(state, BODY_LINE_HEIGHT)
    state.page.drawText(line, {
      x: PAGE_MARGIN,
      y: state.y,
      size: options.size,
      font: options.font,
      color: rgb(0, 0, 0),
    })
    state.y -= BODY_LINE_HEIGHT
  }
}

function ensureSpace(state: DrawState, requiredHeight: number) {
  if (state.y - requiredHeight >= PAGE_BOTTOM) {
    return
  }

  state.page = state.document.addPage(PageSizes.A4)
  state.y = PageSizes.A4[1] - PAGE_MARGIN
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(WHITESPACE_REGEX)
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
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

function buildFilename(orders: OrderExpeditionOrderDto[]) {
  const firstOrder = orders[0]

  if (orders.length === 1 && firstOrder) {
    return `expedition-${firstOrder.order_display_id.replace(FILENAME_SAFE_CHARS_REGEX, "")}.pdf`
  }

  return `expedition-orders-${new Date().toISOString().slice(0, 10)}.pdf`
}

function toPdfSafeText(value: string) {
  return value
    .replace(/[áàâä]/gi, (match) => preserveCase(match, "a"))
    .replace(/[č]/gi, (match) => preserveCase(match, "c"))
    .replace(/[ď]/gi, (match) => preserveCase(match, "d"))
    .replace(/[éèêëě]/gi, (match) => preserveCase(match, "e"))
    .replace(/[íìîï]/gi, (match) => preserveCase(match, "i"))
    .replace(/[ň]/gi, (match) => preserveCase(match, "n"))
    .replace(/[óòôö]/gi, (match) => preserveCase(match, "o"))
    .replace(/[ř]/gi, (match) => preserveCase(match, "r"))
    .replace(/[š]/gi, (match) => preserveCase(match, "s"))
    .replace(/[ť]/gi, (match) => preserveCase(match, "t"))
    .replace(/[úùûüů]/gi, (match) => preserveCase(match, "u"))
    .replace(/[ýÿ]/gi, (match) => preserveCase(match, "y"))
    .replace(/[ž]/gi, (match) => preserveCase(match, "z"))
    .replace(/€/g, "EUR")
    .replace(/₽|£|¥|¢/g, "")
}

function preserveCase(source: string, replacement: string) {
  return source === source.toUpperCase()
    ? replacement.toUpperCase()
    : replacement
}

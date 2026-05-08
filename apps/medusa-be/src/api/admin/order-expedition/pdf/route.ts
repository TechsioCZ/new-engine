import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { PDFFont, PDFPage } from "pdf-lib"
import { PageSizes, PDFDocument, rgb, StandardFonts } from "pdf-lib"
import {
  fetchOrderExpeditionOrdersByIds,
  findMissingOrderIds,
  type OrderExpeditionOrderDto,
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
const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g
const PDF_SAFE_ASCII_REGEX = /[^\x20-\x7e]/gu
const PDF_TEXT_REPLACEMENT_REGEX = /[ŁłĐđÐðØøÞþÆæŒœßĦħı€£¥₽¢–—−“”„‟‘’‚‛•…]/g
const PDF_TEXT_REPLACEMENTS: Record<string, string> = {
  Æ: "AE",
  æ: "ae",
  Ð: "D",
  ð: "d",
  Đ: "D",
  đ: "d",
  Ħ: "H",
  ħ: "h",
  Ł: "L",
  ł: "l",
  Œ: "OE",
  œ: "oe",
  Ø: "O",
  ø: "o",
  Þ: "Th",
  þ: "th",
  ß: "ss",
  ı: "i",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₽": "RUB",
  "¢": "c",
  "–": "-",
  "—": "-",
  "−": "-",
  "“": '"',
  "”": '"',
  "„": '"',
  "‟": '"',
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  "•": "-",
  "…": "...",
}

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

  const orders = await fetchOrderExpeditionOrdersByIds(query, orderIds)
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
  const lineHeight = Math.max(BODY_LINE_HEIGHT, Math.ceil(options.size * 1.2))

  for (const line of lines) {
    ensureSpace(state, lineHeight)
    state.page.drawText(line, {
      x: PAGE_MARGIN,
      y: state.y,
      size: options.size,
      font: options.font,
      color: rgb(0, 0, 0),
    })
    state.y -= lineHeight
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
    .normalize("NFKD")
    .replace(COMBINING_MARKS_REGEX, "")
    .replace(
      PDF_TEXT_REPLACEMENT_REGEX,
      (match) => PDF_TEXT_REPLACEMENTS[match] ?? ""
    )
    .replace(PDF_SAFE_ASCII_REGEX, "?")
}

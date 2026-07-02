import { orderPaymentQr } from "../../utils/order-payment-qr"
import { QR_PAYMENT_MEDUSA_PROVIDER_ID } from "../payment-qr/constants"
import {
  formatDate,
  formatMoney,
  getAddressLines,
  getItemQuantity,
  getItemSubtotal,
  getItemTaxLabel,
  getItemTitle,
  getItemUnitPrice,
  getOrderNumber,
  getOrderReceiptFilename,
  getShippingSubtotalTotal,
  getSubtotal,
  getTaxTotal,
  getTotal,
  type OrderReceiptAddress,
  type OrderReceiptAttachment,
  type OrderReceiptOrder,
  PDF_CZECH_ENCODING_DIFFERENCES,
  type PdfCommand,
  pdfLine,
  pdfText,
  toNumber,
  truncate,
} from "./helpers"

export type {
  OrderReceiptAddress,
  OrderReceiptAttachment,
  OrderReceiptLineItem,
  OrderReceiptOrder,
} from "./helpers"

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const LEFT = 64
const RIGHT = 531
const TOP = 770
const FONT_NORMAL = "F1" as const
const FONT_BOLD = "F2" as const
const PAYMENT_QR_MODULE_SIZE = 4
const PAYMENT_QR_X = LEFT
const PAYMENT_QR_PROVIDER_IDS = new Set([QR_PAYMENT_MEDUSA_PROVIDER_ID])
const SUPPLIER_Y = 626
const SUPPLIER_Y_WITH_PAYMENT_QR = 560
const FIRST_PAGE_TABLE_TOP = 436
const CONTINUATION_PAGE_TABLE_TOP = 720
const TABLE_ROW_HEIGHT = 22
const TABLE_ROW_TOP_OFFSET = 24
const TABLE_BOTTOM_OFFSET = 34
const TABLE_BOTTOM_MIN = 80
const SUMMARY_TABLE_BOTTOM_MIN = 238
const SUMMARY_OFFSET = 38
const FIRST_PAGE_ROWS_WITH_SUMMARY = 8
const FIRST_PAGE_ROWS_WITHOUT_SUMMARY = 15
const CONTINUATION_PAGE_ROWS_WITH_SUMMARY = 21
const CONTINUATION_PAGE_ROWS_WITHOUT_SUMMARY = 28

type ReceiptTableRow = {
  quantity: number
  taxLabel: string
  title: string
  total: number
  unitPriceNet: number
}

type ReceiptTablePage = {
  includeSummary: boolean
  isFirstPage: boolean
  rows: ReceiptTableRow[]
  tableTop: number
}

function customerBlock(
  address?: OrderReceiptAddress | null,
  email?: string | null
) {
  const lines = getAddressLines(address)

  if (email) {
    lines.push(email)
  }

  return lines.length ? lines : ["Zákazník"]
}

function buildTableRows(order: OrderReceiptOrder): ReceiptTableRow[] {
  return (order.items ?? []).map((item) => ({
    quantity: getItemQuantity(item),
    taxLabel: getItemTaxLabel(item),
    title: getItemTitle(item) || "Položka",
    total: getItemSubtotal(item),
    unitPriceNet: getItemUnitPrice(item),
  }))
}

function renderTableHeader(commands: PdfCommand[], tableTop: number) {
  commands.push(pdfText("ks", LEFT, tableTop + 14, { size: 9 }))
  commands.push(pdfText("Položka", LEFT + 32, tableTop + 14, { size: 9 }))
  commands.push(pdfText("DPH", 335, tableTop + 14, { align: "right", size: 9 }))
  commands.push(
    pdfText("Cena za MJ bez DPH", 430, tableTop + 14, {
      align: "right",
      size: 8,
    })
  )
  commands.push(
    pdfText("Celkem bez DPH", RIGHT, tableTop + 14, {
      align: "right",
      size: 9,
    })
  )
  commands.push(pdfLine({ x1: LEFT, x2: RIGHT, y1: tableTop, y2: tableTop }))
}

function renderTableRows(
  commands: PdfCommand[],
  tableRows: ReceiptTableRow[],
  tableTop: number,
  currency?: string | null
) {
  tableRows.forEach((row, index) => {
    const y = tableTop - TABLE_ROW_TOP_OFFSET - index * TABLE_ROW_HEIGHT

    commands.push(pdfText(row.quantity, LEFT, y, { size: 9 }))
    commands.push(pdfText(truncate(row.title, 36), LEFT + 32, y, { size: 9 }))
    commands.push(pdfText(row.taxLabel, 335, y, { align: "right", size: 9 }))
    commands.push(
      pdfText(formatMoney(row.unitPriceNet, currency), 430, y, {
        align: "right",
        size: 8,
      })
    )
    commands.push(
      pdfText(formatMoney(row.total, currency), RIGHT, y, {
        align: "right",
        size: 9,
      })
    )
  })
}

function renderSummary(
  commands: PdfCommand[],
  {
    currency,
    discountTotal,
    shippingTotal,
    subtotal,
    summaryY,
    taxTotal,
    total,
  }: {
    currency?: string | null
    discountTotal: number
    shippingTotal: number
    subtotal: number
    summaryY: number
    taxTotal: number
    total: number
  }
) {
  const summaryLabelX = 336
  commands.push(
    pdfText("Cena bez DPH (zboží)", summaryLabelX, summaryY, { size: 10 })
  )
  commands.push(
    pdfText(formatMoney(subtotal, currency), RIGHT, summaryY, {
      align: "right",
      size: 10,
    })
  )
  if (discountTotal > 0) {
    commands.push(pdfText("Sleva", summaryLabelX, summaryY - 16, { size: 10 }))
    commands.push(
      pdfText(
        `-${formatMoney(discountTotal, currency)}`,
        RIGHT,
        summaryY - 16,
        {
          align: "right",
          size: 10,
        }
      )
    )
  }
  if (shippingTotal > 0) {
    commands.push(
      pdfText("Doprava", summaryLabelX, summaryY - 32, { size: 10 })
    )
    commands.push(
      pdfText(formatMoney(shippingTotal, currency), RIGHT, summaryY - 32, {
        align: "right",
        size: 10,
      })
    )
  }
  commands.push(pdfText("DPH", summaryLabelX, summaryY - 48, { size: 10 }))
  commands.push(
    pdfText(formatMoney(taxTotal, currency), RIGHT, summaryY - 48, {
      align: "right",
      size: 10,
    })
  )
  commands.push(
    pdfLine({
      x1: summaryLabelX,
      x2: RIGHT,
      y1: summaryY - 58,
      y2: summaryY - 58,
    })
  )
  commands.push(
    pdfText(formatMoney(total, currency), RIGHT, summaryY - 86, {
      align: "right",
      font: FONT_BOLD,
      size: 22,
    })
  )
}

function renderFooter(commands: PdfCommand[]) {
  commands.push(pdfText("Děkujeme za objednávku.", LEFT, 66, { size: 8 }))
  commands.push(
    pdfText("Doklad byl vygenerován automaticky.", LEFT, 53, {
      size: 8,
    })
  )
}

function renderFirstPageHeader(
  commands: PdfCommand[],
  {
    billingAddress,
    order,
    orderNumber,
    paymentQrCommands,
    supplierName,
    supplierY,
  }: {
    billingAddress?: OrderReceiptAddress | null
    order: OrderReceiptOrder
    orderNumber: string
    paymentQrCommands: PdfCommand[]
    supplierName: string
    supplierY: number
  }
) {
  commands.push(pdfText("Faktura", 330, TOP, { font: FONT_BOLD, size: 24 }))
  commands.push(
    pdfText(orderNumber, 330, TOP - 28, { font: FONT_NORMAL, size: 22 })
  )
  commands.push(pdfText("Daňový doklad", 330, TOP - 58, { size: 10 }))
  commands.push(...paymentQrCommands)
  commands.push(pdfText("Datum vystavení", 330, TOP - 104, { size: 10 }))
  commands.push(
    pdfText(formatDate(order.created_at), RIGHT, TOP - 104, {
      align: "right",
      size: 10,
    })
  )

  commands.push(pdfText("Dodavatel", LEFT, supplierY, { size: 11 }))
  commands.push(
    pdfText(supplierName, LEFT, supplierY - 23, { font: FONT_BOLD, size: 12 })
  )
  commands.push(
    pdfText("Faktura vystavena automaticky.", LEFT, supplierY - 40, {
      size: 10,
    })
  )
  commands.push(pdfText("Objednávka", LEFT, supplierY - 81, { size: 10 }))
  commands.push(
    pdfText(orderNumber, 205, supplierY - 81, { align: "right", size: 10 })
  )

  commands.push(pdfText("Odběratel", 322, 626, { size: 11 }))
  customerBlock(billingAddress, order.email)
    .slice(0, 6)
    .forEach((lineValue, index) => {
      commands.push(
        pdfText(lineValue, 322, 603 - index * 16, {
          font: index === 0 ? FONT_BOLD : FONT_NORMAL,
          size: index === 0 ? 12 : 10,
        })
      )
    })
}

function renderContinuationHeader(commands: PdfCommand[], orderNumber: string) {
  commands.push(pdfText("Faktura", LEFT, TOP, { font: FONT_BOLD, size: 16 }))
  commands.push(pdfText(orderNumber, RIGHT, TOP, { align: "right", size: 12 }))
}

function paginateTableRows(tableRows: ReceiptTableRow[]): ReceiptTablePage[] {
  const pages: ReceiptTablePage[] = []
  let offset = 0
  let tableTop = FIRST_PAGE_TABLE_TOP
  let pageCapacity = FIRST_PAGE_ROWS_WITHOUT_SUMMARY

  while (
    tableRows.length - offset >
    pageCapacity + CONTINUATION_PAGE_ROWS_WITH_SUMMARY
  ) {
    pages.push({
      includeSummary: false,
      isFirstPage: offset === 0,
      rows: tableRows.slice(offset, offset + pageCapacity),
      tableTop,
    })
    offset += pageCapacity
    tableTop = CONTINUATION_PAGE_TABLE_TOP
    pageCapacity = CONTINUATION_PAGE_ROWS_WITHOUT_SUMMARY
  }

  const remainingRows = tableRows.length - offset
  const currentPageCount = Math.min(
    pageCapacity,
    Math.max(
      1,
      remainingRows - CONTINUATION_PAGE_ROWS_WITH_SUMMARY,
      Math.ceil(remainingRows / 2)
    )
  )

  pages.push({
    includeSummary: false,
    isFirstPage: offset === 0,
    rows: tableRows.slice(offset, offset + currentPageCount),
    tableTop,
  })
  offset += currentPageCount
  pages.push({
    includeSummary: true,
    isFirstPage: false,
    rows: tableRows.slice(offset),
    tableTop: CONTINUATION_PAGE_TABLE_TOP,
  })

  return pages
}

function buildPdfBuffer(pageCommands: PdfCommand[][]) {
  const pageStreams = pageCommands.map((commands) => `${commands.join("\n")}\n`)
  const pages = pageStreams.map((stream, index) => ({
    contentObjectId: 5 + pageStreams.length + index,
    objectId: 3 + index,
    stream,
  }))
  const fontNormalObjectId = 3 + pageStreams.length
  const fontBoldObjectId = fontNormalObjectId + 1

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Kids [${pages
      .map((page) => `${page.objectId} 0 R`)
      .join(" ")}] /Count ${pageStreams.length} >>\nendobj\n`,
    ...pages.map(
      (page) =>
        `${page.objectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontNormalObjectId} 0 R /F2 ${fontBoldObjectId} 0 R >> >> /Contents ${page.contentObjectId} 0 R >>\nendobj\n`
    ),
    `${fontNormalObjectId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${PDF_CZECH_ENCODING_DIFFERENCES} >> >>\nendobj\n`,
    `${fontBoldObjectId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${PDF_CZECH_ENCODING_DIFFERENCES} >> >>\nendobj\n`,
    ...pages.map(
      (page) =>
        `${page.contentObjectId} 0 obj\n<< /Length ${Buffer.byteLength(
          page.stream,
          "utf8"
        )} >>\nstream\n${page.stream}endstream\nendobj\n`
    ),
  ]

  let pdf = "%PDF-1.4\n"
  const offsets = [0]

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"))
    pdf += object
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8")
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, "utf8")
}

function buildPaginatedPdf(
  order: OrderReceiptOrder,
  tableRows: ReceiptTableRow[],
  paymentQrCommands: PdfCommand[],
  supplierY: number
) {
  const orderNumber = getOrderNumber(order)
  const billingAddress = order.billing_address ?? order.shipping_address
  const currency = order.currency_code
  const subtotal = getSubtotal(order)
  const taxTotal = getTaxTotal(order)
  const discountTotal = toNumber(order.discount_total)
  const shippingTotal = getShippingSubtotalTotal(order)
  const total = getTotal(order)
  const supplierName = process.env.STORE_NAME || "N1 Shop"
  const pages = paginateTableRows(tableRows).map((page) => {
    const commands: PdfCommand[] = []

    if (page.isFirstPage) {
      renderFirstPageHeader(commands, {
        billingAddress,
        order,
        orderNumber,
        paymentQrCommands,
        supplierName,
        supplierY,
      })
    } else {
      renderContinuationHeader(commands, orderNumber)
    }

    renderTableHeader(commands, page.tableTop)
    if (page.rows.length) {
      renderTableRows(commands, page.rows, page.tableTop, currency)
    } else {
      commands.push(
        pdfText(
          "Bez položek",
          LEFT + 32,
          page.tableTop - TABLE_ROW_TOP_OFFSET,
          {
            size: 10,
          }
        )
      )
    }

    const tableBottom = Math.max(
      page.includeSummary ? SUMMARY_TABLE_BOTTOM_MIN : TABLE_BOTTOM_MIN,
      page.tableTop - TABLE_BOTTOM_OFFSET - page.rows.length * TABLE_ROW_HEIGHT
    )
    commands.push(
      pdfLine({ x1: LEFT, x2: RIGHT, y1: tableBottom, y2: tableBottom })
    )

    if (page.includeSummary) {
      renderSummary(commands, {
        currency,
        discountTotal,
        shippingTotal,
        subtotal,
        summaryY: tableBottom - SUMMARY_OFFSET,
        taxTotal,
        total,
      })
      renderFooter(commands)
    }

    return commands
  })

  return buildPdfBuffer(pages)
}

function buildPdf(order: OrderReceiptOrder) {
  const orderNumber = getOrderNumber(order)
  const billingAddress = order.billing_address ?? order.shipping_address
  const currency = order.currency_code
  const subtotal = getSubtotal(order)
  const taxTotal = getTaxTotal(order)
  const discountTotal = toNumber(order.discount_total)
  const shippingTotal = getShippingSubtotalTotal(order)
  const total = getTotal(order)
  const supplierName = process.env.STORE_NAME || "N1 Shop"
  const paymentQrCommands = buildPaymentQrCommands(order)
  const supplierY = paymentQrCommands.length
    ? SUPPLIER_Y_WITH_PAYMENT_QR
    : SUPPLIER_Y
  const tableRows = buildTableRows(order)

  if (tableRows.length > FIRST_PAGE_ROWS_WITH_SUMMARY) {
    return buildPaginatedPdf(order, tableRows, paymentQrCommands, supplierY)
  }

  const commands: PdfCommand[] = []

  commands.push(pdfText("Faktura", 330, TOP, { font: FONT_BOLD, size: 24 }))
  commands.push(
    pdfText(orderNumber, 330, TOP - 28, { font: FONT_NORMAL, size: 22 })
  )
  commands.push(pdfText("Daňový doklad", 330, TOP - 58, { size: 10 }))
  commands.push(...paymentQrCommands)
  commands.push(pdfText("Datum vystavení", 330, TOP - 104, { size: 10 }))
  commands.push(
    pdfText(formatDate(order.created_at), RIGHT, TOP - 104, {
      align: "right",
      size: 10,
    })
  )

  commands.push(pdfText("Dodavatel", LEFT, supplierY, { size: 11 }))
  commands.push(
    pdfText(supplierName, LEFT, supplierY - 23, { font: FONT_BOLD, size: 12 })
  )
  commands.push(
    pdfText("Faktura vystavena automaticky.", LEFT, supplierY - 40, {
      size: 10,
    })
  )
  commands.push(pdfText("Objednávka", LEFT, supplierY - 81, { size: 10 }))
  commands.push(
    pdfText(orderNumber, 205, supplierY - 81, { align: "right", size: 10 })
  )

  commands.push(pdfText("Odběratel", 322, 626, { size: 11 }))
  customerBlock(billingAddress, order.email)
    .slice(0, 6)
    .forEach((lineValue, index) => {
      commands.push(
        pdfText(lineValue, 322, 603 - index * 16, {
          font: index === 0 ? FONT_BOLD : FONT_NORMAL,
          size: index === 0 ? 12 : 10,
        })
      )
    })

  const tableTop = FIRST_PAGE_TABLE_TOP
  commands.push(pdfText("ks", LEFT, tableTop + 14, { size: 9 }))
  commands.push(pdfText("Položka", LEFT + 32, tableTop + 14, { size: 9 }))
  commands.push(pdfText("DPH", 335, tableTop + 14, { align: "right", size: 9 }))
  commands.push(
    pdfText("Cena za MJ bez DPH", 430, tableTop + 14, {
      align: "right",
      size: 8,
    })
  )
  commands.push(
    pdfText("Celkem bez DPH", RIGHT, tableTop + 14, {
      align: "right",
      size: 9,
    })
  )
  commands.push(pdfLine({ x1: LEFT, x2: RIGHT, y1: tableTop, y2: tableTop }))

  if (!tableRows.length) {
    commands.push(
      pdfText("Bez položek", LEFT + 32, tableTop - 24, { size: 10 })
    )
  }

  tableRows.forEach((row, index) => {
    const y = tableTop - 24 - index * 22

    commands.push(pdfText(row.quantity, LEFT, y, { size: 9 }))
    commands.push(pdfText(truncate(row.title, 36), LEFT + 32, y, { size: 9 }))
    commands.push(pdfText(row.taxLabel, 335, y, { align: "right", size: 9 }))
    commands.push(
      pdfText(formatMoney(row.unitPriceNet, currency), 430, y, {
        align: "right",
        size: 8,
      })
    )
    commands.push(
      pdfText(formatMoney(row.total, currency), RIGHT, y, {
        align: "right",
        size: 9,
      })
    )
  })

  const tableBottom = Math.max(238, tableTop - 34 - tableRows.length * 22)
  commands.push(
    pdfLine({ x1: LEFT, x2: RIGHT, y1: tableBottom, y2: tableBottom })
  )

  const summaryY = tableBottom - 38
  const summaryLabelX = 336
  commands.push(
    pdfText("Cena bez DPH (zboží)", summaryLabelX, summaryY, { size: 10 })
  )
  commands.push(
    pdfText(formatMoney(subtotal, currency), RIGHT, summaryY, {
      align: "right",
      size: 10,
    })
  )
  if (discountTotal > 0) {
    commands.push(pdfText("Sleva", summaryLabelX, summaryY - 16, { size: 10 }))
    commands.push(
      pdfText(
        `-${formatMoney(discountTotal, currency)}`,
        RIGHT,
        summaryY - 16,
        {
          align: "right",
          size: 10,
        }
      )
    )
  }
  if (shippingTotal > 0) {
    commands.push(
      pdfText("Doprava", summaryLabelX, summaryY - 32, { size: 10 })
    )
    commands.push(
      pdfText(formatMoney(shippingTotal, currency), RIGHT, summaryY - 32, {
        align: "right",
        size: 10,
      })
    )
  }
  commands.push(pdfText("DPH", summaryLabelX, summaryY - 48, { size: 10 }))
  commands.push(
    pdfText(formatMoney(taxTotal, currency), RIGHT, summaryY - 48, {
      align: "right",
      size: 10,
    })
  )
  commands.push(
    pdfLine({
      x1: summaryLabelX,
      x2: RIGHT,
      y1: summaryY - 58,
      y2: summaryY - 58,
    })
  )
  commands.push(
    pdfText(formatMoney(total, currency), RIGHT, summaryY - 86, {
      align: "right",
      font: FONT_BOLD,
      size: 22,
    })
  )

  commands.push(pdfText("Děkujeme za objednávku.", LEFT, 66, { size: 8 }))
  commands.push(
    pdfText("Doklad byl vygenerován automaticky.", LEFT, 53, {
      size: 8,
    })
  )

  return buildPdfBuffer([commands])
}

function buildPaymentQrCommands(order: OrderReceiptOrder): PdfCommand[] {
  return orderPaymentQr.buildPdfCommands(getQrPaymentSpayd(order), {
    moduleSize: PAYMENT_QR_MODULE_SIZE,
    top: TOP,
    x: PAYMENT_QR_X,
  })
}

function getQrPaymentSpayd(order: OrderReceiptOrder) {
  for (const collection of order.payment_collections ?? []) {
    for (const payment of collection.payments ?? []) {
      if (!PAYMENT_QR_PROVIDER_IDS.has(payment.provider_id ?? "")) {
        continue
      }

      const spayd = payment.data?.payment_qr_spayd

      if (typeof spayd === "string" && spayd.trim()) {
        return spayd
      }
    }
  }

  return null
}

class OrderReceiptModuleService {
  async generateOrderReceiptAttachment(
    order: OrderReceiptOrder
  ): Promise<OrderReceiptAttachment> {
    return {
      content: buildPdf(order),
      content_type: "application/pdf",
      filename: getOrderReceiptFilename(order),
    }
  }
}

export default OrderReceiptModuleService

import { getRecordValue } from "@techsio/std/object"

import { orderPaymentQr } from "../../utils/order-payment-qr"
import { QR_PAYMENT_MEDUSA_PROVIDER_ID } from "../payment-qr/constants"
import {
  estimateTextWidth,
  formatDate,
  formatMoney,
  getAddressLines,
  getDiscountTotal,
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
  PDF_CZECH_ENCODING_DIFFERENCES,
  pdfLine,
  pdfText,
  truncate,
  wrapToEstimatedWidth,
} from "./helpers"
import type {
  OrderReceiptAddress,
  OrderReceiptAttachment,
  OrderReceiptOrder,
  PdfFont,
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
const CUSTOMER_X = 322
const CUSTOMER_LABEL_Y = 626
const CUSTOMER_START_Y = 603
const CUSTOMER_LINE_HEIGHT = 16
const CUSTOMER_MAX_WIDTH = RIGHT - CUSTOMER_X
const CUSTOMER_MAX_ROWS = 9
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

interface ReceiptTableRow {
  quantity: number
  taxLabel: string
  title: string
  total: number
  unitPriceNet: number
}

interface ReceiptTablePage {
  includeSummary: boolean
  isFirstPage: boolean
  rows: ReceiptTableRow[]
  tableTop: number
}

const normalizeCustomerLine = (value?: string | null) =>
  (value ?? "").replaceAll("\u00A0", " ").replaceAll(/\s+/gu, " ").trim()

const customerBlock = (
  address?: OrderReceiptAddress | null,
  email?: string | null,
) => {
  const lines: string[] = []

  for (const value of [...getAddressLines(address), email]) {
    const line = normalizeCustomerLine(value)
    if (line.length > 0) {
      lines.push(line)
    }
  }

  return lines.length > 0 ? lines : ["Zákazník"]
}

interface CustomerTextRow {
  font: PdfFont
  size: number
  value: string
}

const markCustomerOverflow = (row: CustomerTextRow): CustomerTextRow => {
  const marker = "."

  if (
    estimateTextWidth(`${row.value}${marker}`, row.size, row.font) <=
    CUSTOMER_MAX_WIDTH
  ) {
    return { ...row, value: `${row.value}${marker}` }
  }

  let { value } = row
  while (
    value.length > 0 &&
    estimateTextWidth(`${value}${marker}`, row.size, row.font) >
      CUSTOMER_MAX_WIDTH
  ) {
    value = value.slice(0, -1).trimEnd()
  }

  return { ...row, value: value.length > 0 ? `${value}${marker}` : marker }
}

const customerTextRows = (
  address?: OrderReceiptAddress | null,
  email?: string | null,
) => {
  const rows = customerBlock(address, email).flatMap((lineValue, index) => {
    const font = index === 0 ? FONT_BOLD : FONT_NORMAL
    const size = index === 0 ? 12 : 10

    return wrapToEstimatedWidth(lineValue, CUSTOMER_MAX_WIDTH, size, font).map(
      (value) => ({
        font,
        size,
        value,
      }),
    )
  })

  if (rows.length <= CUSTOMER_MAX_ROWS) {
    return rows
  }

  const visibleRows = rows.slice(0, CUSTOMER_MAX_ROWS)
  const lastRow = visibleRows.at(-1)
  if (lastRow) {
    visibleRows[visibleRows.length - 1] = markCustomerOverflow(lastRow)
  }

  return visibleRows
}

const buildTableRows = (order: OrderReceiptOrder): ReceiptTableRow[] =>
  (order.items ?? []).map((item) => {
    const title = getItemTitle(item) ?? ""

    return {
      quantity: getItemQuantity(item),
      taxLabel: getItemTaxLabel(item),
      title: title.length > 0 ? title : "Položka",
      total: getItemSubtotal(item),
      unitPriceNet: getItemUnitPrice(item),
    }
  })

const renderTableHeader = (commands: string[], tableTop: number) => {
  commands.push(
    pdfText("ks", LEFT, tableTop + 14, { size: 9 }),
    pdfText("Položka", LEFT + 32, tableTop + 14, { size: 9 }),
    pdfText("DPH", 335, tableTop + 14, { align: "right", size: 9 }),
    pdfText("Cena za MJ bez DPH", 430, tableTop + 14, {
      align: "right",
      size: 8,
    }),
    pdfText("Celkem bez DPH", RIGHT, tableTop + 14, {
      align: "right",
      size: 9,
    }),
    pdfLine({ x1: LEFT, x2: RIGHT, y1: tableTop, y2: tableTop }),
  )
}

const renderTableRows = (
  commands: string[],
  tableRows: ReceiptTableRow[],
  tableTop: number,
  currency?: string | null,
) => {
  for (const [index, row] of tableRows.entries()) {
    const y = tableTop - TABLE_ROW_TOP_OFFSET - index * TABLE_ROW_HEIGHT

    commands.push(
      pdfText(row.quantity, LEFT, y, { size: 9 }),
      pdfText(truncate(row.title, 36), LEFT + 32, y, { size: 9 }),
      pdfText(row.taxLabel, 335, y, { align: "right", size: 9 }),
      pdfText(formatMoney(row.unitPriceNet, currency), 430, y, {
        align: "right",
        size: 8,
      }),
      pdfText(formatMoney(row.total, currency), RIGHT, y, {
        align: "right",
        size: 9,
      }),
    )
  }
}

const renderSummary = (
  commands: string[],
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
  },
) => {
  const summaryLabelX = 336
  commands.push(
    pdfText("Cena bez DPH (zboží)", summaryLabelX, summaryY, { size: 10 }),
    pdfText(formatMoney(subtotal, currency), RIGHT, summaryY, {
      align: "right",
      size: 10,
    }),
  )
  if (discountTotal > 0) {
    commands.push(
      pdfText("Sleva", summaryLabelX, summaryY - 16, { size: 10 }),
      pdfText(
        `-${formatMoney(discountTotal, currency)}`,
        RIGHT,
        summaryY - 16,
        {
          align: "right",
          size: 10,
        },
      ),
    )
  }
  if (shippingTotal > 0) {
    commands.push(
      pdfText("Doprava", summaryLabelX, summaryY - 32, { size: 10 }),
      pdfText(formatMoney(shippingTotal, currency), RIGHT, summaryY - 32, {
        align: "right",
        size: 10,
      }),
    )
  }
  commands.push(
    pdfText("DPH", summaryLabelX, summaryY - 48, { size: 10 }),
    pdfText(formatMoney(taxTotal, currency), RIGHT, summaryY - 48, {
      align: "right",
      size: 10,
    }),
    pdfLine({
      x1: summaryLabelX,
      x2: RIGHT,
      y1: summaryY - 58,
      y2: summaryY - 58,
    }),
    pdfText(formatMoney(total, currency), RIGHT, summaryY - 86, {
      align: "right",
      font: FONT_BOLD,
      size: 22,
    }),
  )
}

const renderFooter = (commands: string[]) => {
  commands.push(
    pdfText("Děkujeme za objednávku.", LEFT, 66, { size: 8 }),
    pdfText("Doklad byl vygenerován automaticky.", LEFT, 53, {
      size: 8,
    }),
  )
}

const renderFirstPageHeader = (
  commands: string[],
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
    paymentQrCommands: string[]
    supplierName: string
    supplierY: number
  },
) => {
  commands.push(
    pdfText("Faktura", 330, TOP, { font: FONT_BOLD, size: 24 }),
    pdfText(orderNumber, 330, TOP - 28, { font: FONT_NORMAL, size: 22 }),
    pdfText("Daňový doklad", 330, TOP - 58, { size: 10 }),
  )
  for (const command of paymentQrCommands) {
    commands.push(command)
  }
  commands.push(
    pdfText("Datum vystavení", 330, TOP - 104, { size: 10 }),
    pdfText(formatDate(order.created_at), RIGHT, TOP - 104, {
      align: "right",
      size: 10,
    }),
    pdfText("Dodavatel", LEFT, supplierY, { size: 11 }),
    pdfText(supplierName, LEFT, supplierY - 23, { font: FONT_BOLD, size: 12 }),
    pdfText("Faktura vystavena automaticky.", LEFT, supplierY - 40, {
      size: 10,
    }),
    pdfText("Objednávka", LEFT, supplierY - 81, { size: 10 }),
    pdfText(orderNumber, 205, supplierY - 81, { align: "right", size: 10 }),
    pdfText("Odběratel", CUSTOMER_X, CUSTOMER_LABEL_Y, { size: 11 }),
  )
  for (const [index, row] of customerTextRows(
    billingAddress,
    order.email,
  ).entries()) {
    commands.push(
      pdfText(
        row.value,
        CUSTOMER_X,
        CUSTOMER_START_Y - index * CUSTOMER_LINE_HEIGHT,
        {
          font: row.font,
          size: row.size,
        },
      ),
    )
  }
}

const renderContinuationHeader = (commands: string[], orderNumber: string) => {
  commands.push(
    pdfText("Faktura", LEFT, TOP, { font: FONT_BOLD, size: 16 }),
    pdfText(orderNumber, RIGHT, TOP, { align: "right", size: 12 }),
  )
}

const paginateTableRows = (
  tableRows: ReceiptTableRow[],
): ReceiptTablePage[] => {
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
      Math.ceil(remainingRows / 2),
    ),
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

const buildPdfBuffer = (pageCommands: string[][]) => {
  const pageStreams: string[] = pageCommands.map(
    (commands) => `${commands.join("\n")}\n`,
  )
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
        `${page.objectId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontNormalObjectId} 0 R /F2 ${fontBoldObjectId} 0 R >> >> /Contents ${page.contentObjectId} 0 R >>\nendobj\n`,
    ),
    `${fontNormalObjectId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${PDF_CZECH_ENCODING_DIFFERENCES} >> >>\nendobj\n`,
    `${fontBoldObjectId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${PDF_CZECH_ENCODING_DIFFERENCES} >> >>\nendobj\n`,
    ...pages.map(
      (page) =>
        `${page.contentObjectId} 0 obj\n<< /Length ${Buffer.byteLength(
          page.stream,
          "utf-8",
        )} >>\nstream\n${page.stream}endstream\nendobj\n`,
    ),
  ]

  let pdf = "%PDF-1.4\n"
  const offsets = [0]

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"))
    pdf += object
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf-8")
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += "0000000000 65535 f \n"
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(pdf, "utf-8")
}

const buildPaginatedPdf = (
  order: OrderReceiptOrder,
  tableRows: ReceiptTableRow[],
  paymentQrCommands: string[],
  supplierY: number,
) => {
  const orderNumber = getOrderNumber(order)
  const billingAddress = order.billing_address ?? order.shipping_address
  const currency = order.currency_code
  const subtotal = getSubtotal(order)
  const taxTotal = getTaxTotal(order)
  const discountTotal = getDiscountTotal(order)
  const shippingTotal = getShippingSubtotalTotal(order)
  const total = getTotal(order)
  const supplierName = "N1 Shop"
  const pages: string[][] = []
  for (const page of paginateTableRows(tableRows)) {
    const commands: string[] = []

    if (page.isFirstPage) {
      renderFirstPageHeader(commands, {
        ...(billingAddress === undefined ? {} : { billingAddress }),
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
    if (page.rows.length > 0) {
      renderTableRows(commands, page.rows, page.tableTop, currency)
    } else {
      commands.push(
        pdfText(
          "Bez položek",
          LEFT + 32,
          page.tableTop - TABLE_ROW_TOP_OFFSET,
          {
            size: 10,
          },
        ),
      )
    }

    const tableBottom = Math.max(
      page.includeSummary ? SUMMARY_TABLE_BOTTOM_MIN : TABLE_BOTTOM_MIN,
      page.tableTop - TABLE_BOTTOM_OFFSET - page.rows.length * TABLE_ROW_HEIGHT,
    )
    commands.push(
      pdfLine({ x1: LEFT, x2: RIGHT, y1: tableBottom, y2: tableBottom }),
    )

    if (page.includeSummary) {
      renderSummary(commands, {
        ...(currency === undefined ? {} : { currency }),
        discountTotal,
        shippingTotal,
        subtotal,
        summaryY: tableBottom - SUMMARY_OFFSET,
        taxTotal,
        total,
      })
      renderFooter(commands)
    }

    pages.push(commands)
  }

  return buildPdfBuffer(pages)
}

const getQrPaymentSpayd = (order: OrderReceiptOrder) => {
  for (const collection of order.payment_collections ?? []) {
    for (const payment of collection.payments ?? []) {
      if (!PAYMENT_QR_PROVIDER_IDS.has(payment.provider_id ?? "")) {
        continue
      }

      const spayd = payment.data
        ? getRecordValue(payment.data, "payment_qr_spayd")
        : undefined

      if (typeof spayd === "string" && spayd.trim().length > 0) {
        return spayd
      }
    }
  }

  return null
}

const buildPaymentQrCommands = (order: OrderReceiptOrder): string[] =>
  orderPaymentQr.buildPdfCommands(getQrPaymentSpayd(order), {
    moduleSize: PAYMENT_QR_MODULE_SIZE,
    top: TOP,
    x: PAYMENT_QR_X,
  })

const buildPdf = (order: OrderReceiptOrder) => {
  const orderNumber = getOrderNumber(order)
  const billingAddress = order.billing_address ?? order.shipping_address
  const currency = order.currency_code
  const paymentQrCommands = buildPaymentQrCommands(order)
  const supplierY =
    paymentQrCommands.length > 0 ? SUPPLIER_Y_WITH_PAYMENT_QR : SUPPLIER_Y
  const tableRows = buildTableRows(order)
  const supplierName = "N1 Shop"

  if (tableRows.length > FIRST_PAGE_ROWS_WITH_SUMMARY) {
    return buildPaginatedPdf(order, tableRows, paymentQrCommands, supplierY)
  }

  const commands: string[] = []
  renderFirstPageHeader(commands, {
    ...(billingAddress === undefined ? {} : { billingAddress }),
    order,
    orderNumber,
    paymentQrCommands,
    supplierName,
    supplierY,
  })
  renderTableHeader(commands, FIRST_PAGE_TABLE_TOP)

  if (tableRows.length > 0) {
    renderTableRows(commands, tableRows, FIRST_PAGE_TABLE_TOP, currency)
  } else {
    commands.push(
      pdfText(
        "Bez položek",
        LEFT + 32,
        FIRST_PAGE_TABLE_TOP - TABLE_ROW_TOP_OFFSET,
        { size: 10 },
      ),
    )
  }

  const tableBottom = Math.max(
    SUMMARY_TABLE_BOTTOM_MIN,
    FIRST_PAGE_TABLE_TOP -
      TABLE_BOTTOM_OFFSET -
      tableRows.length * TABLE_ROW_HEIGHT,
  )
  commands.push(
    pdfLine({ x1: LEFT, x2: RIGHT, y1: tableBottom, y2: tableBottom }),
  )
  renderSummary(commands, {
    ...(currency === undefined ? {} : { currency }),
    discountTotal: getDiscountTotal(order),
    shippingTotal: getShippingSubtotalTotal(order),
    subtotal: getSubtotal(order),
    summaryY: tableBottom - SUMMARY_OFFSET,
    taxTotal: getTaxTotal(order),
    total: getTotal(order),
  })
  renderFooter(commands)

  return buildPdfBuffer([commands])
}

class OrderReceiptModuleService {
  readonly buildPdf = buildPdf

  async generateOrderReceiptAttachment(
    order: OrderReceiptOrder,
  ): Promise<OrderReceiptAttachment> {
    return await Promise.resolve({
      content: this.buildPdf(order),
      content_type: "application/pdf",
      filename: getOrderReceiptFilename(order),
    })
  }
}

export default OrderReceiptModuleService

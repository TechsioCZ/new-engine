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
  type OrderReceiptAddress,
  type OrderReceiptAttachment,
  type OrderReceiptContext,
  type OrderReceiptOrder,
  PDF_LATIN_ENCODING_DIFFERENCES,
  type PdfCommand,
  type PdfFont,
  pdfLine,
  pdfText,
  truncate,
  wrapToEstimatedWidth,
} from "./helpers"

export type {
  OrderReceiptAddress,
  OrderReceiptAttachment,
  OrderReceiptContext,
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

type ReceiptLabels = {
  customer: string
  customerFallback: string
  discount: string
  documentGenerated: string
  goodsNet: string
  invoice: string
  invoiceGenerated: string
  issueDate: string
  item: string
  noItems: string
  order: string
  quantity: string
  shipping: string
  supplier: string
  taxDocument: string
  thanks: string
  totalNet: string
  unitNet: string
  vat: string
}

const RECEIPT_LABELS: Record<OrderReceiptContext["locale"], ReceiptLabels> = {
  "cs-CZ": {
    customer: "Odběratel",
    customerFallback: "Zákazník",
    discount: "Sleva",
    documentGenerated: "Doklad byl vygenerován automaticky.",
    goodsNet: "Cena bez DPH (zboží)",
    invoice: "Faktura",
    invoiceGenerated: "Faktura vystavena automaticky.",
    issueDate: "Datum vystavení",
    item: "Položka",
    noItems: "Bez položek",
    order: "Objednávka",
    quantity: "ks",
    shipping: "Doprava",
    supplier: "Dodavatel",
    taxDocument: "Daňový doklad",
    thanks: "Děkujeme za objednávku.",
    totalNet: "Celkem bez DPH",
    unitNet: "Cena za MJ bez DPH",
    vat: "DPH",
  },
  "hu-HU": {
    customer: "Vevő",
    customerFallback: "Vásárló",
    discount: "Kedvezmény",
    documentGenerated: "A bizonylat automatikusan készült.",
    goodsNet: "Termékek nettó értéke",
    invoice: "Számla",
    invoiceGenerated: "A számla automatikusan lett kiállítva.",
    issueDate: "Kiállítás dátuma",
    item: "Tétel",
    noItems: "Nincsenek tételek",
    order: "Rendelés",
    quantity: "db",
    shipping: "Szállítás",
    supplier: "Szállító",
    taxDocument: "Adóbizonylat",
    thanks: "Köszönjük a rendelést.",
    totalNet: "Nettó összesen",
    unitNet: "Nettó egységár",
    vat: "ÁFA",
  },
  "ro-RO": {
    customer: "Client",
    customerFallback: "Client",
    discount: "Reducere",
    documentGenerated: "Document generat automat.",
    goodsNet: "Produse fără TVA",
    invoice: "Factură",
    invoiceGenerated: "Factura a fost emisă automat.",
    issueDate: "Data emiterii",
    item: "Articol",
    noItems: "Fără articole",
    order: "Comandă",
    quantity: "buc.",
    shipping: "Livrare",
    supplier: "Furnizor",
    taxDocument: "Document fiscal",
    thanks: "Vă mulțumim pentru comandă.",
    totalNet: "Total fără TVA",
    unitNet: "Preț unitar fără TVA",
    vat: "TVA",
  },
  "sk-SK": {
    customer: "Odberateľ",
    customerFallback: "Zákazník",
    discount: "Zľava",
    documentGenerated: "Doklad bol vygenerovaný automaticky.",
    goodsNet: "Cena bez DPH (tovar)",
    invoice: "Faktúra",
    invoiceGenerated: "Faktúra bola vystavená automaticky.",
    issueDate: "Dátum vystavenia",
    item: "Položka",
    noItems: "Bez položiek",
    order: "Objednávka",
    quantity: "ks",
    shipping: "Doprava",
    supplier: "Dodávateľ",
    taxDocument: "Daňový doklad",
    thanks: "Ďakujeme za objednávku.",
    totalNet: "Celkom bez DPH",
    unitNet: "Cena za MJ bez DPH",
    vat: "DPH",
  },
}

function normalizeCustomerLine(value?: string | null) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function customerBlock(
  address?: OrderReceiptAddress | null,
  email?: string | null,
  fallback = "Customer"
) {
  const lines = [...getAddressLines(address), email]
    .map(normalizeCustomerLine)
    .filter((line) => line.length > 0)

  return lines.length ? lines : [fallback]
}

type CustomerTextRow = {
  font: PdfFont
  size: number
  value: string
}

function markCustomerOverflow(row: CustomerTextRow): CustomerTextRow {
  const marker = "."

  if (
    estimateTextWidth(`${row.value}${marker}`, row.size, row.font) <=
    CUSTOMER_MAX_WIDTH
  ) {
    return { ...row, value: `${row.value}${marker}` }
  }

  let value = row.value
  while (
    value &&
    estimateTextWidth(`${value}${marker}`, row.size, row.font) >
      CUSTOMER_MAX_WIDTH
  ) {
    value = value.slice(0, -1).trimEnd()
  }

  return { ...row, value: value ? `${value}${marker}` : marker }
}

function customerTextRows(
  address?: OrderReceiptAddress | null,
  email?: string | null,
  fallback?: string
) {
  const rows = customerBlock(address, email, fallback).flatMap(
    (lineValue, index) => {
      const font = index === 0 ? FONT_BOLD : FONT_NORMAL
      const size = index === 0 ? 12 : 10

      return wrapToEstimatedWidth(
        lineValue,
        CUSTOMER_MAX_WIDTH,
        size,
        font
      ).map((value) => ({
        font,
        size,
        value,
      }))
    }
  )

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

function buildTableRows(
  order: OrderReceiptOrder,
  labels: ReceiptLabels
): ReceiptTableRow[] {
  return (order.items ?? []).map((item) => ({
    quantity: getItemQuantity(item),
    taxLabel: getItemTaxLabel(item),
    title: getItemTitle(item) || labels.item,
    total: getItemSubtotal(item),
    unitPriceNet: getItemUnitPrice(item),
  }))
}

function renderTableHeader(
  commands: PdfCommand[],
  tableTop: number,
  labels: ReceiptLabels
) {
  commands.push(pdfText(labels.quantity, LEFT, tableTop + 14, { size: 9 }))
  commands.push(pdfText(labels.item, LEFT + 32, tableTop + 14, { size: 9 }))
  commands.push(
    pdfText(labels.vat, 335, tableTop + 14, { align: "right", size: 9 })
  )
  commands.push(
    pdfText(labels.unitNet, 430, tableTop + 14, {
      align: "right",
      size: 8,
    })
  )
  commands.push(
    pdfText(labels.totalNet, RIGHT, tableTop + 14, {
      align: "right",
      size: 9,
    })
  )
  commands.push(pdfLine({ x1: LEFT, x2: RIGHT, y1: tableTop, y2: tableTop }))
}

type RenderTableRowsInput = {
  commands: PdfCommand[]
  currency: string | null | undefined
  locale: OrderReceiptContext["locale"]
  tableRows: ReceiptTableRow[]
  tableTop: number
}

function renderTableRows({
  commands,
  currency,
  locale,
  tableRows,
  tableTop,
}: RenderTableRowsInput) {
  tableRows.forEach((row, index) => {
    const y = tableTop - TABLE_ROW_TOP_OFFSET - index * TABLE_ROW_HEIGHT

    commands.push(pdfText(row.quantity, LEFT, y, { size: 9 }))
    commands.push(pdfText(truncate(row.title, 36), LEFT + 32, y, { size: 9 }))
    commands.push(pdfText(row.taxLabel, 335, y, { align: "right", size: 9 }))
    commands.push(
      pdfText(formatMoney(row.unitPriceNet, currency, locale), 430, y, {
        align: "right",
        size: 8,
      })
    )
    commands.push(
      pdfText(formatMoney(row.total, currency, locale), RIGHT, y, {
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
    labels,
    locale,
  }: {
    currency?: string | null
    discountTotal: number
    shippingTotal: number
    subtotal: number
    summaryY: number
    taxTotal: number
    total: number
    labels: ReceiptLabels
    locale: OrderReceiptContext["locale"]
  }
) {
  const summaryLabelX = 336
  commands.push(pdfText(labels.goodsNet, summaryLabelX, summaryY, { size: 10 }))
  commands.push(
    pdfText(formatMoney(subtotal, currency, locale), RIGHT, summaryY, {
      align: "right",
      size: 10,
    })
  )
  if (discountTotal > 0) {
    commands.push(
      pdfText(labels.discount, summaryLabelX, summaryY - 16, { size: 10 })
    )
    commands.push(
      pdfText(
        `-${formatMoney(discountTotal, currency, locale)}`,
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
      pdfText(labels.shipping, summaryLabelX, summaryY - 32, { size: 10 })
    )
    commands.push(
      pdfText(
        formatMoney(shippingTotal, currency, locale),
        RIGHT,
        summaryY - 32,
        {
          align: "right",
          size: 10,
        }
      )
    )
  }
  commands.push(pdfText(labels.vat, summaryLabelX, summaryY - 48, { size: 10 }))
  commands.push(
    pdfText(formatMoney(taxTotal, currency, locale), RIGHT, summaryY - 48, {
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
    pdfText(formatMoney(total, currency, locale), RIGHT, summaryY - 86, {
      align: "right",
      font: FONT_BOLD,
      size: 22,
    })
  )
}

function renderFooter(commands: PdfCommand[], labels: ReceiptLabels) {
  commands.push(pdfText(labels.thanks, LEFT, 66, { size: 8 }))
  commands.push(
    pdfText(labels.documentGenerated, LEFT, 53, {
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
    labels,
    locale,
  }: {
    billingAddress?: OrderReceiptAddress | null
    order: OrderReceiptOrder
    orderNumber: string
    paymentQrCommands: PdfCommand[]
    supplierName: string
    supplierY: number
    labels: ReceiptLabels
    locale: OrderReceiptContext["locale"]
  }
) {
  commands.push(
    pdfText(labels.invoice, 330, TOP, { font: FONT_BOLD, size: 24 })
  )
  commands.push(
    pdfText(orderNumber, 330, TOP - 28, { font: FONT_NORMAL, size: 22 })
  )
  commands.push(pdfText(labels.taxDocument, 330, TOP - 58, { size: 10 }))
  commands.push(...paymentQrCommands)
  commands.push(pdfText(labels.issueDate, 330, TOP - 104, { size: 10 }))
  commands.push(
    pdfText(formatDate(order.created_at, locale), RIGHT, TOP - 104, {
      align: "right",
      size: 10,
    })
  )

  commands.push(pdfText(labels.supplier, LEFT, supplierY, { size: 11 }))
  commands.push(
    pdfText(supplierName, LEFT, supplierY - 23, { font: FONT_BOLD, size: 12 })
  )
  commands.push(
    pdfText(labels.invoiceGenerated, LEFT, supplierY - 40, {
      size: 10,
    })
  )
  commands.push(pdfText(labels.order, LEFT, supplierY - 81, { size: 10 }))
  commands.push(
    pdfText(orderNumber, 205, supplierY - 81, { align: "right", size: 10 })
  )

  commands.push(
    pdfText(labels.customer, CUSTOMER_X, CUSTOMER_LABEL_Y, { size: 11 })
  )
  customerTextRows(
    billingAddress,
    order.email,
    labels.customerFallback
  ).forEach((row, index) => {
    commands.push(
      pdfText(
        row.value,
        CUSTOMER_X,
        CUSTOMER_START_Y - index * CUSTOMER_LINE_HEIGHT,
        {
          font: row.font,
          size: row.size,
        }
      )
    )
  })
}

function renderContinuationHeader(
  commands: PdfCommand[],
  orderNumber: string,
  labels: ReceiptLabels
) {
  commands.push(
    pdfText(labels.invoice, LEFT, TOP, { font: FONT_BOLD, size: 16 })
  )
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
    `${fontNormalObjectId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${PDF_LATIN_ENCODING_DIFFERENCES} >> >>\nendobj\n`,
    `${fontBoldObjectId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${PDF_LATIN_ENCODING_DIFFERENCES} >> >>\nendobj\n`,
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

type BuildPaginatedPdfInput = {
  context: OrderReceiptContext
  labels: ReceiptLabels
  order: OrderReceiptOrder
  paymentQrCommands: PdfCommand[]
  supplierY: number
  tableRows: ReceiptTableRow[]
}

function buildPaginatedPdf({
  context,
  labels,
  order,
  paymentQrCommands,
  supplierY,
  tableRows,
}: BuildPaginatedPdfInput) {
  const orderNumber = getOrderNumber(order)
  const billingAddress = order.billing_address ?? order.shipping_address
  const currency = order.currency_code
  const subtotal = getSubtotal(order)
  const taxTotal = getTaxTotal(order)
  const discountTotal = getDiscountTotal(order)
  const shippingTotal = getShippingSubtotalTotal(order)
  const total = getTotal(order)
  const pages = paginateTableRows(tableRows).map((page) => {
    const commands: PdfCommand[] = []

    if (page.isFirstPage) {
      renderFirstPageHeader(commands, {
        billingAddress,
        order,
        orderNumber,
        paymentQrCommands,
        supplierName: context.storeName,
        supplierY,
        labels,
        locale: context.locale,
      })
    } else {
      renderContinuationHeader(commands, orderNumber, labels)
    }

    renderTableHeader(commands, page.tableTop, labels)
    if (page.rows.length) {
      renderTableRows({
        commands,
        currency,
        locale: context.locale,
        tableRows: page.rows,
        tableTop: page.tableTop,
      })
    } else {
      commands.push(
        pdfText(
          labels.noItems,
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
        labels,
        locale: context.locale,
      })
      renderFooter(commands, labels)
    }

    return commands
  })

  return buildPdfBuffer(pages)
}

function buildPdf(order: OrderReceiptOrder, context: OrderReceiptContext) {
  const orderNumber = getOrderNumber(order)
  const billingAddress = order.billing_address ?? order.shipping_address
  const currency = order.currency_code
  const subtotal = getSubtotal(order)
  const taxTotal = getTaxTotal(order)
  const discountTotal = getDiscountTotal(order)
  const shippingTotal = getShippingSubtotalTotal(order)
  const total = getTotal(order)
  const labels = RECEIPT_LABELS[context.locale]
  const paymentQrCommands = buildPaymentQrCommands(order)
  const supplierY = paymentQrCommands.length
    ? SUPPLIER_Y_WITH_PAYMENT_QR
    : SUPPLIER_Y
  const tableRows = buildTableRows(order, labels)

  if (tableRows.length > FIRST_PAGE_ROWS_WITH_SUMMARY) {
    return buildPaginatedPdf({
      context,
      labels,
      order,
      paymentQrCommands,
      supplierY,
      tableRows,
    })
  }

  const commands: PdfCommand[] = []
  renderFirstPageHeader(commands, {
    billingAddress,
    labels,
    locale: context.locale,
    order,
    orderNumber,
    paymentQrCommands,
    supplierName: context.storeName,
    supplierY,
  })

  const tableTop = FIRST_PAGE_TABLE_TOP
  renderTableHeader(commands, tableTop, labels)

  if (tableRows.length) {
    renderTableRows({
      commands,
      currency,
      locale: context.locale,
      tableRows,
      tableTop,
    })
  } else {
    commands.push(
      pdfText(labels.noItems, LEFT + 32, tableTop - 24, { size: 10 })
    )
  }

  const tableBottom = Math.max(
    SUMMARY_TABLE_BOTTOM_MIN,
    tableTop - TABLE_BOTTOM_OFFSET - tableRows.length * TABLE_ROW_HEIGHT
  )
  commands.push(
    pdfLine({ x1: LEFT, x2: RIGHT, y1: tableBottom, y2: tableBottom })
  )
  renderSummary(commands, {
    currency,
    discountTotal,
    labels,
    locale: context.locale,
    shippingTotal,
    subtotal,
    summaryY: tableBottom - SUMMARY_OFFSET,
    taxTotal,
    total,
  })
  renderFooter(commands, labels)

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
    order: OrderReceiptOrder,
    context: OrderReceiptContext
  ): Promise<OrderReceiptAttachment> {
    return {
      content: buildPdf(order, context),
      content_type: "application/pdf",
      filename: getOrderReceiptFilename(order),
    }
  }
}

export default OrderReceiptModuleService

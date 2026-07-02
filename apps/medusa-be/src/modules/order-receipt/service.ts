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
  truncateToEstimatedWidth,
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

  commands.push(
    pdfText("Odběratel", CUSTOMER_X, CUSTOMER_LABEL_Y, { size: 11 })
  )
  customerBlock(billingAddress, order.email)
    .slice(0, 6)
    .forEach((lineValue, index) => {
      const font = index === 0 ? FONT_BOLD : FONT_NORMAL
      const size = index === 0 ? 12 : 10

      commands.push(
        pdfText(
          truncateToEstimatedWidth(lineValue, CUSTOMER_MAX_WIDTH, size),
          CUSTOMER_X,
          CUSTOMER_START_Y - index * CUSTOMER_LINE_HEIGHT,
          {
            font,
            size,
          }
        )
      )
    })

  const tableTop = 436
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

  const tableRows = (order.items ?? [])
    .map((item) => ({
      quantity: getItemQuantity(item),
      taxLabel: getItemTaxLabel(item),
      title: getItemTitle(item) || "Položka",
      total: getItemSubtotal(item),
      unitPriceNet: getItemUnitPrice(item),
    }))
    .slice(0, 12)

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

  const stream = `${commands.join("\n")}\n`
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${PDF_CZECH_ENCODING_DIFFERENCES} >> >>\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${PDF_CZECH_ENCODING_DIFFERENCES} >> >>\nendobj\n`,
    `6 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}endstream\nendobj\n`,
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

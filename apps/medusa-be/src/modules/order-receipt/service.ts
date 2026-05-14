import {
  formatDate,
  formatMoney,
  getAddressLines,
  getItemSubtotal,
  getItemTitle,
  getItemUnitPrice,
  getOrderNumber,
  getOrderReceiptFilename,
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
  const shippingTotal = toNumber(order.shipping_total)
  const total = getTotal(order)
  const supplierName = process.env.STORE_NAME || "N1 Shop"
  const commands: PdfCommand[] = []

  commands.push(pdfText("Faktura", 330, TOP, { font: FONT_BOLD, size: 24 }))
  commands.push(
    pdfText(orderNumber, 330, TOP - 28, { font: FONT_NORMAL, size: 22 })
  )
  commands.push(pdfText("Daňový doklad", 330, TOP - 58, { size: 10 }))
  commands.push(pdfText("Datum vystavení", 330, TOP - 104, { size: 10 }))
  commands.push(
    pdfText(formatDate(order.created_at), RIGHT, TOP - 104, {
      align: "right",
      size: 10,
    })
  )

  commands.push(pdfText("Dodavatel", LEFT, 626, { size: 11 }))
  commands.push(pdfText(supplierName, LEFT, 603, { font: FONT_BOLD, size: 12 }))
  commands.push(
    pdfText("Faktura vystavena automaticky.", LEFT, 586, { size: 10 })
  )
  commands.push(pdfText("Objednávka", LEFT, 545, { size: 10 }))
  commands.push(pdfText(orderNumber, 205, 545, { align: "right", size: 10 }))

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

  const tableTop = 436
  commands.push(pdfText("ks", LEFT, tableTop + 14, { size: 9 }))
  commands.push(pdfText("Položka", LEFT + 32, tableTop + 14, { size: 9 }))
  commands.push(pdfText("DPH", 350, tableTop + 14, { align: "right", size: 9 }))
  commands.push(
    pdfText("Cena za MJ", 445, tableTop + 14, { align: "right", size: 9 })
  )
  commands.push(
    pdfText("Celkem bez DPH", RIGHT, tableTop + 14, {
      align: "right",
      size: 9,
    })
  )
  commands.push(pdfLine({ x1: LEFT, x2: RIGHT, y1: tableTop, y2: tableTop }))

  const visibleItems = (order.items ?? []).slice(0, 12)
  if (!visibleItems.length) {
    commands.push(
      pdfText("Bez položek", LEFT + 32, tableTop - 24, { size: 10 })
    )
  }

  visibleItems.forEach((item, index) => {
    const y = tableTop - 24 - index * 22
    const quantity = toNumber(item.quantity) || 1
    const lineSubtotal = getItemSubtotal(item)
    const fallbackUnitPrice = getItemUnitPrice(item)
    let unitPrice = fallbackUnitPrice
    if (Number.isFinite(quantity) && quantity > 0) {
      unitPrice = Number.isFinite(lineSubtotal)
        ? lineSubtotal / quantity
        : fallbackUnitPrice
    } else if (Number.isFinite(lineSubtotal)) {
      unitPrice = lineSubtotal
    }
    const lineTaxTotal = toNumber(item.tax_total)
    const itemSubtotal = toNumber(item.subtotal)
    const taxRate =
      lineTaxTotal > 0 && itemSubtotal !== 0
        ? Math.round((lineTaxTotal / itemSubtotal) * 100)
        : 0
    const taxLabel = Number.isFinite(taxRate) ? `${taxRate} %` : "0 %"

    commands.push(pdfText(quantity, LEFT, y, { size: 9 }))
    commands.push(
      pdfText(truncate(getItemTitle(item) || "Položka", 36), LEFT + 32, y, {
        size: 9,
      })
    )
    commands.push(pdfText(taxLabel, 350, y, { align: "right", size: 9 }))
    commands.push(
      pdfText(formatMoney(unitPrice, currency), 445, y, {
        align: "right",
        size: 9,
      })
    )
    commands.push(
      pdfText(formatMoney(lineSubtotal, currency), RIGHT, y, {
        align: "right",
        size: 9,
      })
    )
  })

  const tableBottom = Math.max(238, tableTop - 34 - visibleItems.length * 22)
  commands.push(
    pdfLine({ x1: LEFT, x2: RIGHT, y1: tableBottom, y2: tableBottom })
  )

  const summaryY = tableBottom - 38
  const summaryLabelX = 336
  commands.push(
    pdfText("Celkem bez DPH", summaryLabelX, summaryY, { size: 10 })
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

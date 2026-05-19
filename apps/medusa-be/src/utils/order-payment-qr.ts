import QRCode from "qrcode"

export const ORDER_PAYMENT_QR_METADATA_KEY = "payment_qr_spayd"

export type OrderPaymentQrOrder = {
  currency_code?: string | null
  custom_display_id?: string | null
  display_id?: number | string | null
  id: string
  summary?: {
    current_order_total?: number | string | null
    original_order_total?: number | string | null
  } | null
  total?: number | string | { valueOf(): unknown } | null
}

const VARIABLE_SYMBOL_REGEX = /^\d{1,10}$/
const PAYMENT_QR_QUIET_ZONE_MODULES = 4
const SPAYD_RESERVED_CHARS_REGEX = /[*:]/g

export type PaymentQrPdfCommandOptions = {
  moduleSize?: number
  size?: number
  top?: number
  x: number
  y?: number
}

export type PaymentQrPdfCommand = string

export class OrderPaymentQr {
  buildSpayd(order: OrderPaymentQrOrder, iban: string | null | undefined) {
    if (!iban) {
      return null
    }

    const amount = formatSpaydAmount(getOrderPaymentAmount(order))
    if (!amount) {
      return null
    }

    const fields = [
      "SPD",
      "1.0",
      `ACC:${iban.replace(/\s+/g, "").toUpperCase()}`,
      `AM:${amount}`,
      `CC:${getOrderCurrencyCode(order)}`,
      `MSG:${escapeSpaydValue(getOrderPaymentMessage(order))}`,
    ]

    const variableSymbol = getOrderVariableSymbol(order)
    if (variableSymbol) {
      fields.push(`X-VS:${variableSymbol}`)
    }

    return fields.join("*")
  }

  buildMetadata(
    metadata: Record<string, unknown> | null | undefined,
    order: OrderPaymentQrOrder,
    iban: string | null | undefined
  ) {
    const spayd = this.buildSpayd(order, iban)
    if (!spayd) {
      return metadata
    }

    return {
      ...(metadata ?? {}),
      [ORDER_PAYMENT_QR_METADATA_KEY]: spayd,
    }
  }

  getSpaydFromMetadata(metadata: Record<string, unknown> | null | undefined) {
    const value = metadata?.[ORDER_PAYMENT_QR_METADATA_KEY]

    return typeof value === "string" && value.trim() ? value : null
  }

  buildPdfCommands(
    spayd: string | null | undefined,
    {
      moduleSize: requestedModuleSize,
      size,
      top,
      x,
      y,
    }: PaymentQrPdfCommandOptions
  ): PaymentQrPdfCommand[] {
    if (!spayd) {
      return []
    }

    let qr: ReturnType<typeof QRCode.create>
    try {
      qr = QRCode.create(spayd, { errorCorrectionLevel: "M" })
    } catch {
      return []
    }

    const matrixSize = qr.modules.size
    const quietZoneSize = PAYMENT_QR_QUIET_ZONE_MODULES * 2
    const moduleSize =
      requestedModuleSize ?? (size ?? 120) / (matrixSize + quietZoneSize)
    const renderedSize = (matrixSize + quietZoneSize) * moduleSize
    const renderedY = top === undefined ? (y ?? 0) : top - renderedSize
    const commands: PaymentQrPdfCommand[] = [
      pdfFillRect({
        color: "1 1 1",
        height: renderedSize,
        width: renderedSize,
        x,
        y: renderedY,
      }),
    ]

    for (let row = 0; row < matrixSize; row += 1) {
      for (let col = 0; col < matrixSize; col += 1) {
        if (!qr.modules.get(row, col)) {
          continue
        }

        commands.push(
          pdfFillRect({
            height: moduleSize,
            width: moduleSize,
            x: x + (col + PAYMENT_QR_QUIET_ZONE_MODULES) * moduleSize,
            y:
              renderedY +
              (matrixSize - row - 1 + PAYMENT_QR_QUIET_ZONE_MODULES) *
                moduleSize,
          })
        )
      }
    }

    return commands
  }
}

export const orderPaymentQr = new OrderPaymentQr()

export function buildOrderPaymentQrSpayd(
  order: OrderPaymentQrOrder,
  iban: string | null | undefined
) {
  return orderPaymentQr.buildSpayd(order, iban)
}

export function buildOrderPaymentQrMetadata(
  metadata: Record<string, unknown> | null | undefined,
  order: OrderPaymentQrOrder,
  iban: string | null | undefined
) {
  return orderPaymentQr.buildMetadata(metadata, order, iban)
}

export function getOrderPaymentQrSpayd(
  metadata: Record<string, unknown> | null | undefined
) {
  return orderPaymentQr.getSpaydFromMetadata(metadata)
}

export function buildOrderPaymentQrPdfCommands(
  spayd: string | null | undefined,
  options: PaymentQrPdfCommandOptions
): PaymentQrPdfCommand[] {
  return orderPaymentQr.buildPdfCommands(spayd, options)
}

function formatSpaydAmount(value: OrderPaymentQrOrder["total"]) {
  if (value === null || value === undefined) {
    return null
  }

  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return amount.toFixed(2)
}

function getOrderPaymentAmount(order: OrderPaymentQrOrder) {
  return (
    order.total ??
    order.summary?.current_order_total ??
    order.summary?.original_order_total
  )
}

function getOrderCurrencyCode(order: OrderPaymentQrOrder) {
  const currencyCode = order.currency_code?.trim() || undefined

  return (currencyCode ?? "CZK").toUpperCase()
}

function getOrderVariableSymbol(order: OrderPaymentQrOrder) {
  const customDisplayId = normalizeVariableSymbol(order.custom_display_id)
  if (customDisplayId) {
    return customDisplayId
  }

  return normalizeVariableSymbol(String(order.display_id ?? ""))
}

function getOrderPaymentMessage(order: OrderPaymentQrOrder) {
  const displayId = order.custom_display_id ?? order.display_id ?? order.id

  return `OBJEDNAVKA ${displayId}`
}

function escapeSpaydValue(value: string) {
  return ascii(value)
    .toUpperCase()
    .replace(SPAYD_RESERVED_CHARS_REGEX, " ")
    .slice(0, 60)
}

function ascii(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
}

function normalizeVariableSymbol(value: string | null | undefined) {
  const normalized = value?.replace(/\D/g, "") ?? ""

  return VARIABLE_SYMBOL_REGEX.test(normalized) ? normalized : null
}

function pdfFillRect({
  color = "0 0 0",
  height,
  width,
  x,
  y,
}: {
  color?: string
  height: number
  width: number
  x: number
  y: number
}) {
  return `q ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(
    2
  )} ${height.toFixed(2)} re f Q`
}

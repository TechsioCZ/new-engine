import QRCode from "qrcode"

type NullableText = string | null | undefined

type NullableNumericText = number | string | null

interface BigNumberLike {
  valueOf: () => unknown
}

type PaymentQrAmount = BigNumberLike | number | string

type AsciiInput = boolean | number | string

export interface OrderPaymentQrOrder {
  currency_code?: string | null
  custom_display_id?: string | null
  display_id?: NullableNumericText
  id: string
  summary?: {
    current_order_total?: NullableNumericText
    original_order_total?: NullableNumericText
  } | null
  total?: PaymentQrAmount | null
}

export interface PaymentQrPaymentData {
  amount: PaymentQrAmount
  currency_code?: string | null
  iban: NullableText
  message?: string | null
  reference?: string | null
}

const VARIABLE_SYMBOL_REGEX = /^\d{1,10}$/u
const PAYMENT_QR_QUIET_ZONE_MODULES = 4
const SPAYD_RESERVED_CHARS_REGEX = /[*:]/gu
const DEFAULT_CURRENCY_CODE = "CZK"
const DEFAULT_PAYMENT_MESSAGE = "OBJEDNAVKA"

export interface PaymentQrPdfCommandOptions {
  moduleSize?: number
  size?: number
  top?: number
  x: number
  y?: number
}

const nonEmptyText = (value: NullableText) =>
  value === null || value === undefined || value === "" ? null : value

const ascii = (value: AsciiInput | null | undefined) => {
  const text = value === null || value === undefined ? "" : String(value)

  return text
    .replaceAll("\u00A0", " ")
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll(/[^\u0020-\u007E]/gu, "")
}

const escapeSpaydValue = (value: string) =>
  ascii(value)
    .toUpperCase()
    .replace(SPAYD_RESERVED_CHARS_REGEX, " ")
    .slice(0, 60)

const formatSpaydAmount = (value: PaymentQrAmount | null | undefined) => {
  if (value === null || value === undefined) {
    return null
  }

  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return amount.toFixed(2)
}

const normalizeVariableSymbol = (value: NullableText) => {
  const normalized = value?.replaceAll(/\D/gu, "") ?? ""

  return VARIABLE_SYMBOL_REGEX.test(normalized) ? normalized : null
}

const getOrderPaymentAmount = (order: OrderPaymentQrOrder) =>
  order.summary?.current_order_total ??
  order.total ??
  order.summary?.original_order_total

const getOrderCurrencyCode = (
  order: OrderPaymentQrOrder,
  fallbackCurrencyCode: string,
) => {
  const currencyCode = nonEmptyText(order.currency_code?.trim())

  return (currencyCode ?? fallbackCurrencyCode).toUpperCase()
}

const getOrderVariableSymbol = (order: OrderPaymentQrOrder) => {
  const customDisplayId = normalizeVariableSymbol(order.custom_display_id)
  if (customDisplayId !== null) {
    return customDisplayId
  }

  return normalizeVariableSymbol(String(order.display_id ?? ""))
}

const getOrderPaymentMessage = (
  order: OrderPaymentQrOrder,
  messagePrefix: string,
) => {
  const displayId = order.custom_display_id ?? order.display_id ?? order.id

  return `${messagePrefix} ${displayId}`
}

const pdfFillRect = ({
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
}) =>
  `q ${color} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(
    2,
  )} ${height.toFixed(2)} re f Q`

export class OrderPaymentQr {
  readonly #defaultCurrencyCode = DEFAULT_CURRENCY_CODE

  readonly #defaultMessage = DEFAULT_PAYMENT_MESSAGE

  readonly #quietZoneModules = PAYMENT_QR_QUIET_ZONE_MODULES

  buildSpayd(order: OrderPaymentQrOrder, iban: NullableText) {
    const account = nonEmptyText(iban)
    if (account === null) {
      return null
    }

    const amount = formatSpaydAmount(getOrderPaymentAmount(order))
    if (amount === null) {
      return null
    }

    const fields = [
      "SPD",
      "1.0",
      `ACC:${account.replaceAll(/\s+/gu, "").toUpperCase()}`,
      `AM:${amount}`,
      `CC:${getOrderCurrencyCode(order, this.#defaultCurrencyCode)}`,
      `MSG:${escapeSpaydValue(
        getOrderPaymentMessage(order, this.#defaultMessage),
      )}`,
    ]

    const variableSymbol = getOrderVariableSymbol(order)
    if (variableSymbol !== null) {
      fields.push(`X-VS:${variableSymbol}`)
    }

    return fields.join("*")
  }

  buildPaymentSpayd(payment: PaymentQrPaymentData) {
    const account = nonEmptyText(payment.iban)
    if (account === null) {
      return null
    }

    const amount = formatSpaydAmount(payment.amount)
    if (amount === null) {
      return null
    }

    const currencyCode =
      nonEmptyText(payment.currency_code) ?? this.#defaultCurrencyCode

    const fields = [
      "SPD",
      "1.0",
      `ACC:${account.replaceAll(/\s+/gu, "").toUpperCase()}`,
      `AM:${amount}`,
      `CC:${currencyCode.toUpperCase()}`,
      `MSG:${escapeSpaydValue(
        payment.message ?? payment.reference ?? this.#defaultMessage,
      )}`,
    ]

    const variableSymbol = normalizeVariableSymbol(payment.reference ?? null)
    if (variableSymbol !== null) {
      fields.push(`X-VS:${variableSymbol}`)
    }

    return fields.join("*")
  }

  buildPdfCommands(
    spayd: NullableText,
    {
      moduleSize: requestedModuleSize,
      size,
      top,
      x,
      y,
    }: PaymentQrPdfCommandOptions,
  ): string[] {
    const payload = nonEmptyText(spayd)
    if (payload === null) {
      return []
    }

    let qr: ReturnType<typeof QRCode.create>
    try {
      qr = QRCode.create(payload, { errorCorrectionLevel: "M" })
    } catch {
      return []
    }

    const matrixSize = qr.modules.size
    const quietZoneSize = this.#quietZoneModules * 2
    const moduleSize =
      requestedModuleSize ?? (size ?? 120) / (matrixSize + quietZoneSize)
    const renderedSize = (matrixSize + quietZoneSize) * moduleSize
    const renderedY = top === undefined ? (y ?? 0) : top - renderedSize
    const commands: string[] = [
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
            x: x + (col + this.#quietZoneModules) * moduleSize,
            y:
              renderedY +
              (matrixSize - row - 1 + this.#quietZoneModules) * moduleSize,
          }),
        )
      }
    }

    return commands
  }
}

export const orderPaymentQr = new OrderPaymentQr()

export const buildPaymentQrSpayd = (payment: PaymentQrPaymentData) =>
  orderPaymentQr.buildPaymentSpayd(payment)

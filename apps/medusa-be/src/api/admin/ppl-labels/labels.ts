import { MedusaError } from "@medusajs/framework/utils"

type PPLFulfillmentRecord = {
  id: string
  provider_id: string
  canceled_at: string | null
  data: Record<string, unknown> | null
}

export type PPLLabelOrder = {
  id: string
  display_id?: number | null
  fulfillments?: PPLFulfillmentRecord[]
}

export type PrintablePPLLabel = {
  config_id?: string
  environment?: "testing" | "production"
  fulfillment_id: string
  label_url: string
  order_display_id?: number | null
  order_id: string
  ppl_label_url?: string
  shipment_number: string
}

type PPLLabelFileType = {
  contentType: string
  extension: string
}

const TRAILING_SLASH_REGEX = /\/$/u
const URL_EXTENSION_REGEX = /\.([a-z0-9]+)$/u

export function validatePPLLabelOrders(value: unknown): PPLLabelOrder[] {
  if (Array.isArray(value) && value.every(isPPLLabelOrder)) {
    return value
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "PPL: Invalid order label query result"
  )
}

export function collectPrintablePPLLabels(
  requestedOrderIds: string[],
  orders: PPLLabelOrder[]
): PrintablePPLLabel[] {
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  const missingOrderIds: string[] = []
  const ordersWithoutPPLLabels: string[] = []
  const labels: PrintablePPLLabel[] = []

  for (const orderId of requestedOrderIds) {
    const order = ordersById.get(orderId)

    if (!order) {
      missingOrderIds.push(orderId)
      continue
    }

    const orderLabels = (order.fulfillments ?? []).flatMap((fulfillment) => {
      const data = fulfillment.data

      if (
        fulfillment.provider_id !== "ppl_ppl" ||
        fulfillment.canceled_at ||
        !isPrintablePPLFulfillmentData(data)
      ) {
        return []
      }

      return [
        {
          ...(isNonEmptyString(data.config_id)
            ? { config_id: data.config_id }
            : {}),
          ...(isPplEnvironment(data.environment)
            ? { environment: data.environment }
            : {}),
          fulfillment_id: fulfillment.id,
          label_url: data.label_url,
          order_display_id: order.display_id,
          order_id: order.id,
          ...(isNonEmptyString(data.ppl_label_url)
            ? { ppl_label_url: data.ppl_label_url }
            : {}),
          shipment_number: data.shipment_number,
        },
      ]
    })

    if (orderLabels.length === 0) {
      ordersWithoutPPLLabels.push(orderId)
      continue
    }

    labels.push(...orderLabels)
  }

  if (missingOrderIds.length > 0 || ordersWithoutPPLLabels.length > 0) {
    const messages = [
      missingOrderIds.length > 0
        ? `Orders not found: ${missingOrderIds.join(", ")}`
        : null,
      ordersWithoutPPLLabels.length > 0
        ? `Orders without PPL shipping labels: ${ordersWithoutPPLLabels.join(", ")}`
        : null,
    ].filter((message): message is string => Boolean(message))

    throw new MedusaError(MedusaError.Types.INVALID_DATA, messages.join("; "))
  }

  return labels
}

function isPplEnvironment(value: unknown): value is "testing" | "production" {
  return value === "testing" || value === "production"
}

export function isAllowedStoredPPLLabelUrl(
  value: string,
  allowedBaseUrls: string[]
): boolean {
  const target = parseHttpUrl(value)

  if (!target) {
    return false
  }

  return allowedBaseUrls.some((baseUrl) => {
    const base = parseHttpUrl(baseUrl)

    if (!base || target.origin !== base.origin) {
      return false
    }

    const basePath = base.pathname.replace(TRAILING_SLASH_REGEX, "")
    return (
      target.pathname === basePath || target.pathname.startsWith(`${basePath}/`)
    )
  })
}

export function isPPLCarrierLabelUrl(value: string): boolean {
  const url = parseHttpUrl(value)

  return Boolean(
    url &&
      (url.origin === "https://api-dev.dhl.com" ||
        url.origin === "https://api.dhl.com") &&
      url.pathname.startsWith("/ecs/ppl/myapi2/")
  )
}

export function buildPPLLabelFilename(
  label: PrintablePPLLabel,
  extension: string
): string {
  return `ppl-label-${sanitizeFilenameToken(label.shipment_number)}.${extension}`
}

export function buildPPLLabelsArchiveFilename(): string {
  return `ppl-labels-${new Date().toISOString().slice(0, 10)}.zip`
}

export function resolvePPLLabelFileType(
  contentType: string | null,
  configuredFormat: string | undefined,
  labelUrl: string
): PPLLabelFileType {
  const normalizedContentType = contentType?.split(";")[0]?.trim().toLowerCase()
  const byContentType = normalizedContentType
    ? FILE_TYPE_BY_CONTENT_TYPE[normalizedContentType]
    : undefined

  if (byContentType) {
    return byContentType
  }

  const extension = getUrlExtension(labelUrl)

  if (extension && FILE_TYPE_BY_EXTENSION[extension]) {
    return FILE_TYPE_BY_EXTENSION[extension]
  }

  return (
    FILE_TYPE_BY_PPL_FORMAT[configuredFormat?.toLowerCase() ?? ""] ??
    PNG_FILE_TYPE
  )
}

const JPEG_FILE_TYPE: PPLLabelFileType = {
  contentType: "image/jpeg",
  extension: "jpg",
}
const PDF_FILE_TYPE: PPLLabelFileType = {
  contentType: "application/pdf",
  extension: "pdf",
}
const PNG_FILE_TYPE: PPLLabelFileType = {
  contentType: "image/png",
  extension: "png",
}
const SVG_FILE_TYPE: PPLLabelFileType = {
  contentType: "image/svg+xml",
  extension: "svg",
}
const ZPL_FILE_TYPE: PPLLabelFileType = {
  contentType: "application/zpl",
  extension: "zpl",
}

const FILE_TYPE_BY_CONTENT_TYPE: Record<string, PPLLabelFileType> = {
  "application/pdf": PDF_FILE_TYPE,
  "application/zpl": ZPL_FILE_TYPE,
  "image/jpeg": JPEG_FILE_TYPE,
  "image/png": PNG_FILE_TYPE,
  "image/svg+xml": SVG_FILE_TYPE,
  "text/plain": ZPL_FILE_TYPE,
}

const FILE_TYPE_BY_EXTENSION: Record<string, PPLLabelFileType> = {
  jpeg: JPEG_FILE_TYPE,
  jpg: JPEG_FILE_TYPE,
  pdf: PDF_FILE_TYPE,
  png: PNG_FILE_TYPE,
  svg: SVG_FILE_TYPE,
  zpl: ZPL_FILE_TYPE,
}

const FILE_TYPE_BY_PPL_FORMAT: Record<string, PPLLabelFileType> = {
  jpeg: JPEG_FILE_TYPE,
  pdf: PDF_FILE_TYPE,
  png: PNG_FILE_TYPE,
  svg: SVG_FILE_TYPE,
  zpl: ZPL_FILE_TYPE,
}

function isPrintablePPLFulfillmentData(value: unknown): value is Record<
  string,
  unknown
> & {
  label_url: string
  shipment_number: string
} {
  return (
    isRecord(value) &&
    value.status === "completed" &&
    isNonEmptyString(value.label_url) &&
    isNonEmptyString(value.shipment_number)
  )
}

function isPPLLabelOrder(value: unknown): value is PPLLabelOrder {
  if (!isRecord(value) || typeof value.id !== "string") {
    return false
  }

  if (
    value.display_id !== undefined &&
    value.display_id !== null &&
    typeof value.display_id !== "number"
  ) {
    return false
  }

  return (
    value.fulfillments === undefined ||
    (Array.isArray(value.fulfillments) &&
      value.fulfillments.every(isPPLFulfillmentRecord))
  )
}

function isPPLFulfillmentRecord(value: unknown): value is PPLFulfillmentRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.provider_id === "string" &&
    (value.canceled_at === null || typeof value.canceled_at === "string") &&
    (value.data === null || isRecord(value.data))
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}

function getUrlExtension(value: string): string | null {
  const url = parseHttpUrl(value)
  const match = url?.pathname.toLowerCase().match(URL_EXTENSION_REGEX)

  return match?.[1] ?? null
}

function sanitizeFilenameToken(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^A-Za-z0-9._-]/gu, "-")
    .replace(/-+/gu, "-")
    .slice(0, 80)

  return sanitized || "unknown"
}

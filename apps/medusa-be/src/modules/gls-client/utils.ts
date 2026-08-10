import type { GLSShipmentState } from "./types"

const NEGATIVE_DELIVERY_PATTERNS = [
  /\bnot\s+(?:delivered|collected|picked\s+up)\b/u,
  /\b(?:undelivered|uncollected)\b/u,
  /\bne(?:doručen|dorucen|vyzved|vyzdvih|prevzat|převzat|dodán|dodan)\b/u,
]

const STATUS_BY_CODE: Readonly<Record<string, GLSShipmentState>> = {
  "1": "handed_to_carrier",
  "2": "departed",
  "22": "departed",
  "23": "returned",
  "26": "arrived",
  "27": "arrived",
  "3": "arrived",
  "32": "prepared_for_departure",
  "4": "prepared_for_departure",
  "40": "returned",
  "42": "cancelled",
  "47": "departed",
  "5": "delivered",
  "51": "received_data",
  "53": "arrived",
  "54": "delivered",
  "55": "delivered",
  "56": "ready_for_pickup",
  "58": "delivered",
  "59": "collected",
  "6": "arrived",
  "60": "customs_declaration",
  "61": "customs_declaration",
  "62": "customs_declaration",
  "64": "customs_declaration",
  "65": "customs_declaration",
  "66": "customs_declaration",
  "67": "customs_declaration",
  "68": "customs_declaration",
  "69": "customs_declaration",
  "7": "arrived",
  "70": "customs_declaration",
  "71": "customs_declaration",
  "72": "customs_declaration",
  "73": "customs_declaration",
  "74": "customs_declaration",
  "75": "customs_declaration",
  "76": "customs_declaration",
}

/**
 * Map MyGLS status codes/descriptions to our normalized shipment states.
 * @see MyGLS_API.pdf Appendix G: GLS Status Codes
 */
export const mapGLSStatusCode = (
  code: string | number,
  description?: string,
): GLSShipmentState => {
  const key = String(code).trim().toLowerCase()
  const status = STATUS_BY_CODE[key]
  if (status !== undefined) {
    return status
  }

  const text = `${key} ${description ?? ""}`.toLowerCase()
  const hasNegativeDeliveryText = NEGATIVE_DELIVERY_PATTERNS.some((pattern) =>
    pattern.test(text),
  )

  if (
    !hasNegativeDeliveryText &&
    (text.includes("delivered") || text.includes("doručen"))
  ) {
    return "delivered"
  }
  if (
    !hasNegativeDeliveryText &&
    (text.includes("parcelshop pickup") || text.includes("collected"))
  ) {
    return "collected"
  }
  if (text.includes("returned to sender") || text.includes("returned")) {
    return "returned"
  }
  if (text.includes("stored in gls parcelshop")) {
    return "ready_for_pickup"
  }
  if (text.includes("left the parcel center")) {
    return "departed"
  }
  if (text.includes("reached the parcel center")) {
    return "arrived"
  }
  if (text.includes("entered into the gls it system")) {
    return "received_data"
  }
  if (text.includes("customs")) {
    return "customs_declaration"
  }

  return "unknown"
}

import type { GLSShipmentState } from "./types"

/**
 * Map MyGLS status codes/descriptions to our normalized shipment states.
 * @see MyGLS_API.pdf Appendix G: GLS Status Codes
 */
export function mapGLSStatusCode(
  code: string | number,
  description?: string
): GLSShipmentState {
  const key = String(code).trim().toLowerCase()
  const text = `${key} ${description ?? ""}`.toLowerCase()

  switch (key) {
    case "51":
      return "received_data"

    case "1":
      return "handed_to_carrier"

    case "2":
    case "22":
    case "47":
      return "departed"

    case "3":
    case "6":
    case "7":
    case "26":
    case "27":
    case "53":
      return "arrived"

    case "4":
    case "32":
      return "prepared_for_departure"

    case "56":
      return "ready_for_pickup"

    case "5":
    case "54":
    case "55":
    case "58":
      return "delivered"

    case "59":
      return "collected"

    case "23":
    case "40":
      return "returned"

    case "42":
      return "cancelled"

    case "60":
    case "61":
    case "62":
    case "64":
    case "65":
    case "66":
    case "67":
    case "68":
    case "69":
    case "70":
    case "71":
    case "72":
    case "73":
    case "74":
    case "75":
    case "76":
      return "customs_declaration"

    default:
      break
  }

  if (text.includes("delivered") || text.includes("doručen")) {
    return "delivered"
  }
  if (text.includes("parcelshop pickup") || text.includes("collected")) {
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

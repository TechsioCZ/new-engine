import type { PacketaShipmentState } from "./types"

/**
 * Map Packeta raw status codes to our normalised PacketaShipmentState.
 *
 * Packeta's REST API returns a mix of numeric and string codes depending on the
 * endpoint (e.g. "1" / 1 for "received data"). This helper unifies both and
 * falls back to "unknown" for anything we haven't mapped yet — mappings can be
 * refined once we verify against a real API response.
 *
 * Source: https://docs.packetery.com/03-creating-packets/01-rest-api.html#status-codes
 */
export function mapPacketaStatusCode(
  code: string | number
): PacketaShipmentState {
  const key = String(code).trim().toLowerCase()

  switch (key) {
    case "1":
    case "received data":
    case "receiveddata":
      return "received_data"

    case "2":
    case "arrived":
    case "arrivedattarget":
      return "arrived"

    case "3":
    case "prepared for departure":
    case "preparedfordeparture":
      return "prepared_for_departure"

    case "4":
    case "handed to carrier":
    case "handedtocarrier":
      return "handed_to_carrier"

    case "5":
    case "departed":
      return "departed"

    case "6":
    case "ready for pickup":
    case "readyforpickup":
      return "ready_for_pickup"

    case "7":
    case "delivered":
      return "delivered"

    case "8":
    case "collected":
    case "pickedup":
      return "collected"

    case "9":
    case "posted back":
    case "postedback":
      return "posted_back"

    case "10":
    case "returned":
      return "returned"

    case "11":
    case "cancelled":
    case "canceled":
      return "cancelled"

    case "12":
    case "customs declaration":
    case "customsdeclarationprocess":
      return "customs_declaration"

    default:
      return "unknown"
  }
}

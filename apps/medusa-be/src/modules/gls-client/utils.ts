import type { GLSShipmentState } from "./types"

/**
 * Map raw GLS-like tracking codes to our normalised GLSShipmentState.
 */ export function mapGLSStatusCode(code: string | number): GLSShipmentState {
  const key = String(code).trim().toLowerCase()

  switch (key) {
    case "1":
    case "received data":
    case "receiveddata":
      return "received_data"

    case "2":
    case "arrived":
    case "arrived at target":
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

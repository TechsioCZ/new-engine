import type { PacketaShipmentState } from "./types"

const PACKETA_STATUS_BY_CODE = new Map<string, PacketaShipmentState>([
  ["1", "received_data"],
  ["received data", "received_data"],
  ["receiveddata", "received_data"],
  ["2", "arrived"],
  ["arrived", "arrived"],
  ["arrived at target", "arrived"],
  ["arrivedattarget", "arrived"],
  ["3", "prepared_for_departure"],
  ["prepared for departure", "prepared_for_departure"],
  ["preparedfordeparture", "prepared_for_departure"],
  ["4", "handed_to_carrier"],
  ["handed to carrier", "handed_to_carrier"],
  ["handedtocarrier", "handed_to_carrier"],
  ["5", "departed"],
  ["departed", "departed"],
  ["6", "ready_for_pickup"],
  ["ready for pickup", "ready_for_pickup"],
  ["readyforpickup", "ready_for_pickup"],
  ["7", "delivered"],
  ["delivered", "delivered"],
  ["8", "collected"],
  ["collected", "collected"],
  ["pickedup", "collected"],
  ["9", "posted_back"],
  ["posted back", "posted_back"],
  ["postedback", "posted_back"],
  ["10", "returned"],
  ["returned", "returned"],
  ["11", "cancelled"],
  ["cancelled", "cancelled"],
  ["canceled", "cancelled"],
  ["12", "customs_declaration"],
  ["customs declaration", "customs_declaration"],
  ["customsdeclarationprocess", "customs_declaration"],
])

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
export const mapPacketaStatusCode = (
  code: string | number,
): PacketaShipmentState =>
  PACKETA_STATUS_BY_CODE.get(String(code).trim().toLowerCase()) ?? "unknown"

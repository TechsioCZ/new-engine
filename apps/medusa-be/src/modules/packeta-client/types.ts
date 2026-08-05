/**
 * Packeta REST API v6 TypeScript Definitions
 * @see https://docs.packetery.com/03-creating-packets/01-rest-api.html
 *
 * Scope: Z-Point (pickup point) deliveries + COD. No home delivery / no international.
 */

// ============================================
// Module Options & Environment
// ============================================

export type PacketaEnvironment = "testing" | "production"

/** Packeta label size. A6 is the default thermal printer format. */
export type PacketaLabelFormat = "A6" | "A7"

/**
 * Configuration options passed from medusa-config.ts / stored in DB
 */
export interface PacketaOptions {
  /** API password from Packeta admin portal */
  api_password: string
  environment: PacketaEnvironment
  default_label_format: PacketaLabelFormat
  /** Label offset on sheet (0 = top-left) */
  default_label_offset: number
  /** Sender/eshop identifier shown on labels */
  sender_label?: string
  /** Optional Packeta eshop ID (some accounts require it) */
  eshop_id?: string
  /** COD bank account number (CZ format: account/code) */
  cod_bank_account?: string
  cod_bank_code?: string
  /** IBAN alternative */
  cod_iban?: string
  cod_swift?: string
  /** Fallback sender address */
  sender_name?: string
  sender_street?: string
  sender_city?: string
  sender_zip_code?: string
  sender_country?: string
  sender_phone?: string
  sender_email?: string
}

// ============================================
// Create Packet (synchronous)
// ============================================

/**
 * Request payload sent as the `packetAttributes` object to createPacket.
 * Conservative shape based on public Packeta v6 docs — may be tuned once we
 * have live credentials to verify against the API.
 */
export interface PacketaPacketAttributes {
  /** eshop's reference number — order ID */
  number: string
  name: string
  surname: string
  email?: string
  phone?: string
  /** Pickup point ID from branch feed */
  addressId: number
  /** Declared value for insurance/customs */
  value: number
  /** COD amount (omit if not COD) */
  cod?: number
  currency: string
  weight?: number
  /** Sender label shown on packet (matches config) */
  eshop?: string
}

export interface PacketaCreatePacketResult {
  /** Internal Packeta packet ID (used for status / label calls) */
  id: number
  /** Tracking barcode, e.g. "Z987654321" */
  barcode: string
  /** Human-formatted barcode, e.g. "Z 987 654 321" */
  barcodeText: string
}

// ============================================
// Packet Status / Tracking
// ============================================

/**
 * Packeta shipment states, normalised to snake_case strings.
 * The API returns a status code + name — we map known ones here.
 */
export type PacketaShipmentState =
  | "received_data"
  | "arrived"
  | "prepared_for_departure"
  | "departed"
  | "ready_for_pickup"
  | "handed_to_carrier"
  | "delivered"
  | "posted_back"
  | "returned"
  | "cancelled"
  | "customs_declaration"
  | "collected"
  | "unknown"

/** States that mean the parcel was successfully handed over to the customer */
export const PACKETA_DELIVERED_STATES: readonly PacketaShipmentState[] = [
  "delivered",
  "collected",
]

/** States that mean delivery failed / was refused / returned */
export const PACKETA_FAILED_STATES: readonly PacketaShipmentState[] = [
  "posted_back",
  "returned",
  "cancelled",
]

/** Human-readable status messages (Czech, to match the rest of UI copy) */
export const PACKETA_STATUS_MESSAGES: Record<PacketaShipmentState, string> = {
  arrived: "Zásilka dorazila na depo",
  cancelled: "Stornováno",
  collected: "Vyzvednuto zákazníkem",
  customs_declaration: "Celní odbavení",
  delivered: "Doručeno",
  departed: "Odeslána",
  handed_to_carrier: "Předána dopravci",
  posted_back: "Vráceno odesílateli",
  prepared_for_departure: "Připravena k odeslání",
  ready_for_pickup: "Připravena k vyzvednutí",
  received_data: "Přijata data zásilky",
  returned: "Vráceno",
  unknown: "Neznámý stav",
}

/**
 * Individual status history record from packetStatus.
 */
export interface PacketaPacketStatusRecord {
  /** ISO date */
  dateTime: string
  /** Raw status code from Packeta */
  statusCode: string | number
  statusName: string
  /** Normalised state (our own mapping) */
  state: PacketaShipmentState
}

// ============================================
// Branch (Pickup Point) Feed
// ============================================

/**
 * Subset of the `branch.json` feed fields that we use.
 * The full feed has many more fields — add here as needed.
 */
export interface PacketaBranch {
  id: number
  name: string
  nameStreet: string
  street: string
  city: string
  zip: string
  country: string
  currency?: string
  latitude?: string
  longitude?: string
  openingHours?: string
  /** e.g. "zbox", "pickup" */
  branchType?: string
}

// ============================================
// Fulfillment Data (stored in fulfillment.data)
// ============================================

export type PacketaFulfillmentStatus = "completed" | "error"

export interface PacketaFulfillmentData extends Record<string, unknown> {
  status: PacketaFulfillmentStatus
  /** Packeta internal packet ID */
  packet_id: number
  /** Tracking barcode (e.g. Z987654321) */
  barcode: string
  /** Pickup point ID selected by customer */
  access_point_id: number
  supports_cod: boolean

  /** Stored label URL in S3/MinIO */
  label_url?: string
  /** Public tracking URL */
  tracking_url?: string

  // Populated by packeta-tracking-sync job
  last_status?: PacketaShipmentState
  last_status_date?: string
  delivery_failed?: boolean

  error_message?: string
  sync_attempts?: number
  first_sync_attempt?: string
  last_sync_attempt?: string
}

/** Data stored on the shipping_option and shipping_method */
export interface PacketaShippingOptionData {
  code: "z_point" | "z_point_cod"
  requires_access_point: true
  supports_cod: boolean
  /** Chosen by customer at checkout via widget (shipping_method.data only) */
  access_point_id?: number
  access_point_name?: string
  access_point_zip?: string
  access_point_city?: string
}

// ============================================
// DB Config Types
// ============================================

export const PACKETA_SENSITIVE_FIELDS = [
  "api_password",
  "cod_bank_account",
  "cod_bank_code",
  "cod_iban",
  "cod_swift",
] as const

export interface PacketaConfigDTO {
  id: string
  environment: PacketaEnvironment
  is_enabled: boolean
  api_password: string | null
  sender_label: string | null
  eshop_id: string | null
  default_label_format: string
  default_label_offset: number
  cod_bank_account: string | null
  cod_bank_code: string | null
  cod_iban: string | null
  cod_swift: string | null
  sender_name: string | null
  sender_street: string | null
  sender_city: string | null
  sender_zip_code: string | null
  sender_country: string | null
  sender_phone: string | null
  sender_email: string | null
  created_at: Date
  updated_at: Date
}

/**
 * Input for updating config.
 * Empty string on a sensitive field = keep existing value.
 * null on a sensitive field = clear it.
 */
export interface UpdatePacketaConfigInput {
  is_enabled?: boolean
  api_password?: string | null
  sender_label?: string
  eshop_id?: string
  default_label_format?: PacketaLabelFormat
  default_label_offset?: number
  cod_bank_account?: string | null
  cod_bank_code?: string | null
  cod_iban?: string | null
  cod_swift?: string | null
  sender_name?: string
  sender_street?: string
  sender_city?: string
  sender_zip_code?: string
  sender_country?: string
  sender_phone?: string
  sender_email?: string
}

/** Admin API response — sensitive fields replaced with *_set booleans */
export interface PacketaConfigResponse {
  id: string
  environment: PacketaEnvironment
  is_enabled: boolean
  api_password_set: boolean
  sender_label: string | null
  eshop_id: string | null
  default_label_format: string
  default_label_offset: number
  cod_bank_account_set: boolean
  cod_bank_code_set: boolean
  cod_iban_set: boolean
  cod_swift_set: boolean
  sender_name: string | null
  sender_street: string | null
  sender_city: string | null
  sender_zip_code: string | null
  sender_country: string | null
  sender_phone: string | null
  sender_email: string | null
}

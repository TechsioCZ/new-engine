/**
 * MyGLS API TypeScript definitions.
 * @see https://api.mygls.cz/docs/MyGLS_API.pdf
 */
export type GLSEnvironment = "testing" | "production"

export type GLSCountryCode = "HR" | "CZ" | "HU" | "RO" | "SI" | "SK" | "RS"

export type GLSLanguageIsoCode = "HR" | "CS" | "HU" | "RO" | "SK" | "SL"

/** MyGLS printer types accepted by PrintLabels/GetPrintedLabels. */
export type GLSPrinterType =
  | "A4_2x2"
  | "A4_4x1"
  | "Connect"
  | "Thermo"
  | "ThermoZPL"
  | "ShipItThermoPdf"
  | "ThermoZPL_300DPI"
  | "ShipItThermoZpl"

export type GLSAddress = {
  name: string
  street: string
  house_number: string
  house_number_info?: string
  city: string
  zip_code: string
  country: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
}

export type GLSOptions = {
  config_id: string
  /** MyGLS login e-mail / username. */
  username: string
  /** Raw MyGLS password. Sent to MyGLS as SHA512 byte array. */
  password: string
  /** Unique client number provided by GLS. */
  client_number: number
  /** Which MyGLS API host family to use. */
  environment: GLSEnvironment
  /** Country domain for the MyGLS account, e.g. CZ => api.mygls.cz. */
  country_code: GLSCountryCode
  supported_countries: GLSCountryCode[]
  type_of_printer: GLSPrinterType
  /** A4 quarter position. MyGLS accepts 1..4 for A4 labels. */
  print_position: number
  hide_phone_number_on_labels: boolean
  sender_name: string
  sender_street: string
  sender_house_number: string
  sender_house_number_info?: string
  sender_city: string
  sender_zip_code: string
  sender_country: string
  sender_phone?: string
  sender_email?: string
}

// ============================================
// Label / Parcel creation
// ============================================

export type GLSPacketAttributes = {
  /** Client custom tag identifying parcel — order ID/display ID. */
  number: string
  name: string
  surname: string
  email: string
  phone: string
  delivery_street: string
  delivery_house_number: string
  delivery_house_number_info?: string
  delivery_city: string
  delivery_zip_code: string
  delivery_country: string
  addressId?: string
  /** COD amount (omit if not COD). */
  cod?: number
  currency?: string
  weight?: number
  /** Parcel content printed on label. */
  content?: string
}

export type GLSCreatePacketResult = {
  /** MyGLS ParcelId (database label/parcel record ID). */
  id: string | number
  /** MyGLS ParcelNumberWithCheckdigit, used as customer-facing tracking code. */
  barcode: string
  barcodeText: string
  /** MyGLS ParcelNumber without the check digit, required by GetParcelStatuses. */
  parcel_number: string
  /** PDF bytes returned by PrintLabels. */
  label_pdf?: Buffer
}

export type GLSCreateOrRecoverPacketInput = {
  config_id: string
  environment: GLSEnvironment
  operation_key: string
  client_reference: string
  fulfillment_id: string
  active_fulfillment_ids: string[]
  attributes: GLSPacketAttributes
}

// ============================================
// Packet Status / Tracking
// ============================================

export type GLSShipmentState =
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

export const GLS_DELIVERED_STATES: readonly GLSShipmentState[] = [
  "delivered",
  "collected",
]

export const GLS_FAILED_STATES: readonly GLSShipmentState[] = [
  "posted_back",
  "returned",
  "cancelled",
]

export const GLS_STATUS_MESSAGES: Record<GLSShipmentState, string> = {
  received_data: "Přijata data zásilky",
  arrived: "Zásilka dorazila na depo",
  prepared_for_departure: "Připravena k odeslání",
  departed: "Odeslána",
  ready_for_pickup: "Připravena k vyzvednutí",
  handed_to_carrier: "Předána dopravci",
  delivered: "Doručeno",
  posted_back: "Vráceno odesílateli",
  returned: "Vráceno",
  cancelled: "Stornováno",
  customs_declaration: "Celní odbavení",
  collected: "Vyzvednuto zákazníkem",
  unknown: "Neznámý stav",
}

export type GLSPacketStatusRecord = {
  dateTime: string
  statusCode: string | number
  statusName: string
  state: GLSShipmentState
}

// ============================================
// Branch / Pickup Point feed
// ============================================

export type GLSBranch = {
  id: string
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
  branchType?: string
}

// ============================================
// Fulfillment Data (stored in fulfillment.data)
// ============================================

export type GLSFulfillmentStatus = "completed" | "error"

export interface GLSFulfillmentData extends Record<string, unknown> {
  status: GLSFulfillmentStatus
  /** MyGLS ParcelId (label/parcel database record ID). */
  packet_id: string | number
  /** Customer-facing MyGLS ParcelNumberWithCheckdigit used as tracking code. */
  barcode: string
  /** Check-digit-free MyGLS ParcelNumber required by GetParcelStatuses. */
  parcel_number?: string | number
  access_point_id?: string
  supports_cod: boolean
  config_id: string
  environment: GLSEnvironment
  label_url?: string
  tracking_url?: string
  last_status?: GLSShipmentState
  last_status_date?: string
  delivery_failed?: boolean
  error_message?: string
  attempt_id?: string
  operation_key?: string
  sync_attempts?: number
  first_sync_attempt?: string
  last_sync_attempt?: string
}

/** Data stored on the shipping_option and shipping_method. */
export type GLSShippingOptionData = {
  code: "home_delivery" | "home_delivery_cod" | "parcelshop" | "parcelshop_cod"
  requires_access_point: boolean
  supports_cod: boolean
  access_point_id?: string
  access_point_name?: string
  access_point_street?: string
  access_point_zip?: string
  access_point_city?: string
  access_point_country?: string
  email?: string
  weight?: number
}

// ============================================
// DB Config Types
// ============================================

export const GLS_COUNTRY_CODES = [
  "HR",
  "CZ",
  "HU",
  "RO",
  "SI",
  "SK",
  "RS",
] as const satisfies readonly GLSCountryCode[]

export const GLS_STOREFRONT_COUNTRY_CODES = [
  "CZ",
  "HU",
  "RO",
  "SK",
] as const satisfies readonly GLSCountryCode[]

export type GLSStorefrontCountryCode = (typeof GLS_STOREFRONT_COUNTRY_CODES)[number]

export const GLS_PRINTER_TYPES = [
  "A4_2x2",
  "A4_4x1",
  "Connect",
  "Thermo",
  "ThermoZPL",
  "ShipItThermoPdf",
  "ThermoZPL_300DPI",
  "ShipItThermoZpl",
] as const satisfies readonly GLSPrinterType[]

export const GLS_SENSITIVE_FIELDS = ["password"] as const

export type GLSConfigDTO = {
  id: string
  environment: GLSEnvironment
  is_active: boolean
  is_enabled: boolean
  username: string | null
  password: string | null
  client_number: number | null
  country_code: GLSCountryCode
  supported_countries: GLSCountryCode[]
  type_of_printer: GLSPrinterType
  print_position: number
  hide_phone_number_on_labels: boolean
  sender_name: string | null
  sender_street: string | null
  sender_house_number: string | null
  sender_house_number_info: string | null
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
export type UpdateGLSConfigInput = {
  is_enabled?: boolean
  username?: string
  password?: string | null
  client_number?: number | null
  country_code?: GLSCountryCode
  supported_countries?: GLSCountryCode[]
  type_of_printer?: GLSPrinterType
  print_position?: number
  hide_phone_number_on_labels?: boolean
  sender_name?: string
  sender_street?: string
  sender_house_number?: string
  sender_house_number_info?: string
  sender_city?: string
  sender_zip_code?: string
  sender_country?: string
  sender_phone?: string
  sender_email?: string
}

/** Admin API response — sensitive fields replaced with *_set booleans. */
export type GLSConfigResponse = {
  id: string
  environment: GLSEnvironment
  is_active: boolean
  is_enabled: boolean
  username: string | null
  password_set: boolean
  client_number: number | null
  country_code: GLSCountryCode
  supported_countries: GLSCountryCode[]
  type_of_printer: GLSPrinterType
  print_position: number
  hide_phone_number_on_labels: boolean
  sender_name: string | null
  sender_street: string | null
  sender_house_number: string | null
  sender_house_number_info: string | null
  sender_city: string | null
  sender_zip_code: string | null
  sender_country: string | null
  sender_phone: string | null
  sender_email: string | null
}

export type GLSConfigReference = {
  config_id?: string | null
  environment?: GLSEnvironment | null
}

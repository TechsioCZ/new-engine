/**
 * PPL CPL API (MyAPI2) TypeScript Definitions
 * @see https://ppl-cpl-api-en.apidog.io/
 */

/**
 * Configuration options passed from medusa-config.ts
 */
export interface PplOptions {
  client_id: string
  client_secret: string
  environment: PplEnvironment
  default_label_format: PplLabelFormat
  /** Czech bank account number (use with bank_code) */
  cod_bank_account?: string
  /** Czech bank code (use with bank_account) */
  cod_bank_code?: string
  /** IBAN (use with swift, alternative to bank_account/bank_code) */
  cod_iban?: string
  /** SWIFT/BIC code (use with iban) */
  cod_swift?: string
  /** Fallback sender address - used when PPL customer has no address configured */
  sender_name?: string
  sender_street?: string
  sender_city?: string
  sender_zip_code?: string
  sender_country?: string
  sender_phone?: string
  sender_email?: string
}

export type PplEnvironment = "testing" | "production"
export type PplLabelFormat = "Png" | "Jpeg" | "Svg" | "Pdf" | "Zpl"

/**
 * OAuth 2.0 access token response
 * Token is valid for 30 minutes (1800 seconds)
 */
export interface PplAccessToken {
  access_token: string
  token_type: string
  /** Token validity in seconds (typically 1800 = 30 min) */
  expires_in: number
  scope: string
  /** Calculated timestamp for caching (Date.now() + expires_in * 1000) */
  expires_at?: number
}

/**
 * Address format for PPL API
 */
export interface PplAddress {
  /** Name/company, max 50 chars */
  name: string
  /** Secondary name/company, max 50 chars */
  name2?: string
  /** Street address, max 60 chars */
  street: string
  /** City, max 50 chars */
  city: string
  /** Postal/ZIP code, 1-10 chars */
  zipCode: string
  /** ISO 3166-1 alpha-2 country code (e.g., "CZ") */
  country: string
  /** Contact person, max 50 chars */
  contact?: string
  /** Phone number, max 30 chars */
  phone?: string
  /** Email address, max 50 chars */
  email?: string
}

/**
 * Shipment creation request
 */
export interface PplShipmentRequest {
  /** Unique reference ID, max 128 chars (use fulfillment ID) */
  referenceId: string
  /** Product type code (SMAR, SMAD, PRIV, PRID, etc.) */
  productType: PplProductType
  /** Recipient address */
  recipient: PplAddress
  /** Sender address (optional, defaults to contract address) */
  sender?: PplAddress
  /** Note/description, max 300 chars */
  note?: string
  /** Cash on Delivery settings */
  cashOnDelivery?: PplCodSettings
  /** External reference numbers */
  externalNumbers?: PplExternalNumber[]
  /** Specific delivery options (e.g., pickup point) */
  specificDelivery?: PplSpecificDelivery
  /** Package dimensions and weight (deprecated, use shipmentSet) */
  packageSet?: PplPackageSet[]
  /** Pre-assigned shipment number */
  shipmentNumber?: string
  /** Depot code */
  depot?: string
  /** Age verification code from /codelist/ageCheck */
  ageCheck?: string
  /** Integrator ID */
  integratorId?: number
  /** Multi-package shipment set */
  shipmentSet?: PplShipmentSet
  /** Return address (different from sender) */
  backAddress?: PplAddress
  /** Masked sender address for label display */
  senderMask?: PplAddress
  /** Insurance settings */
  insurance?: PplInsurance
  /** Additional services */
  services?: PplService[]
  /** Dormant shipment settings */
  dormant?: PplDormantShipment
  /** Routing information */
  shipmentRouting?: PplShipmentRouting
  /** Direct injection settings */
  directInjection?: PplDirectInjection
  /** Label service options */
  labelService?: PplLabelService
}

/**
 * Product type codes
 * - SMAR: Parcel Smart (pickup point, no COD)
 * - SMAD: Parcel Smart + COD (pickup point, with COD)
 * - PRIV: Parcel Private (home delivery, no COD)
 * - PRID: Parcel Private + COD (home delivery, with COD)
 * Note: Includes `| string` for forward-compatibility with PPL API changes
 */
export type PplProductType = string

export interface PplExternalNumber {
  /** External number type code (usually "CUST") */
  code: string
  /** External number value (e.g., order ID) */
  externalNumber: string
}

export interface PplSpecificDelivery {
  /** Access point external number for pickup point delivery */
  parcelShopCode?: string
  /** Specific delivery date (ISO DateTime) */
  specificDeliveryDate?: string
  /** Specific delivery time from (ISO DateTime) */
  specificDeliveryTimeFrom?: string
  /** Specific delivery time to (ISO DateTime) */
  specificDeliveryTimeTo?: string
  /** Specific take/pickup date (ISO DateTime) */
  specificTakeDate?: string
}

export interface PplPackageSet {
  /** Package weight in kg */
  weight?: number
  /** Package height in cm */
  height?: number
  /** Package width in cm */
  width?: number
  /** Package length in cm */
  length?: number
}

/**
 * Shipment set for multi-package shipments
 */
export interface PplShipmentSet {
  /** Number of shipments in the set */
  numberOfShipments?: number
  /** Individual shipment items in the set */
  shipmentSetItems?: PplShipmentSetItem[]
}

export interface PplShipmentSetItem {
  /** Shipment number for this item */
  shipmentNumber?: string
  /** Weight information */
  weighedShipmentInfo?: PplWeighedShipmentInfo
  /** External reference numbers */
  externalNumbers?: PplExternalNumber[]
  /** Insurance for this item */
  insurance?: PplInsurance
}

export interface PplWeighedShipmentInfo {
  /** Weight in kg */
  weight?: number
}

/**
 * Insurance settings for shipment
 */
export interface PplInsurance {
  /** Insurance currency code */
  insuranceCurrency?: string
  /** Insurance price/value */
  insurancePrice?: number
}

/**
 * Additional service for shipment
 */
export interface PplService {
  /** Service code from /codelist/service */
  code: string
}

/**
 * Dormant shipment settings (inactive/sleeping shipment)
 */
export interface PplDormantShipment {
  /** Shipment number */
  shipmentNumber?: string
  /** Note/description */
  note?: string
  /** Recipient address for dormant shipment */
  recipient?: PplAddress
  /** External reference numbers */
  externalNumbers?: PplExternalNumber[]
  /** Additional services */
  services?: PplService[]
  /** Weight information */
  weighedShipmentInfo?: PplWeighedShipmentInfo
}

/**
 * Shipment routing information
 */
export interface PplShipmentRouting {
  /** Input route code */
  inputRouteCode?: string
}

/**
 * Direct injection settings for cross-border shipments
 */
export interface PplDirectInjection {
  /** Enable direct addressing */
  directAddressing?: boolean
  /** Gateway ZIP code */
  gatewayZipCode?: string
  /** Gateway city */
  gatewayCity?: string
  /** Country code */
  country?: string
}

/**
 * Label service options
 */
export interface PplLabelService {
  /** Enable labelless shipping */
  labelless?: boolean
}

/**
 * Cash on Delivery settings
 * Supported currencies depend on destination country (CZK, EUR, PLN, HUF, RON)
 */
export interface PplCodSettings {
  /** COD amount */
  codPrice: number
  /** Currency code (CZK, EUR, PLN, HUF, RON - depends on destination) */
  codCurrency: string
  /** Variable symbol for payment identification */
  codVarSym: string
  /** Czech bank account number (use with bankCode) */
  bankAccount?: string
  /** Czech bank code (use with bankAccount) */
  bankCode?: string
  /** IBAN (use with swift, alternative to bankAccount/bankCode) */
  iban?: string
  /** SWIFT/BIC code (use with iban) */
  swift?: string
  /** Alternative account number field */
  account?: string
  /** Account prefix */
  accountPre?: string
  /** Specific symbol for payment */
  specSymbol?: string
}

/**
 * Return channel for label delivery
 */
export interface PplReturnChannel {
  /** Return channel type */
  type: string
  /** Return address (FTP path or email) */
  address?: string
}

/**
 * Batch creation request body
 */
export interface PplBatchRequest {
  shipments: PplShipmentRequest[]
  labelSettings?: PplLabelSettings
  /** Return channel for label delivery */
  returnChannel?: PplReturnChannel
  /** Sort order for shipments */
  shipmentsOrderBy?: string
}

export interface PplLabelSettings {
  format: PplLabelFormat
  dpi?: number
  /** Complete label settings for merged labels */
  completeLabelSettings?: PplCompleteLabelSettings
}

export interface PplCompleteLabelSettings {
  /** Request merged label document */
  isCompleteLabelRequested?: boolean
  /** Page size for merged labels */
  pageSize?: "Default" | "A4" | "A6"
  /** Starting position on page */
  position?: number
}

export type PplLabelPageSize = "Default" | "A4" | "A6"

/**
 * Batch status response from GET /shipment/batch/{batchId}
 */
export interface PplBatchResponse {
  items: PplBatchItem[]
}

export type PplBatchState = "Received" | "InProcess" | "Complete" | "Error"

export interface PplBatchItem {
  /** Reference ID from request */
  referenceId: string
  /** PPL shipment number (tracking number) */
  shipmentNumber?: string
  /** Label download URL */
  labelUrl?: string
  /** Public tracking URL */
  trackingUrl?: string
  /** Error message if item failed */
  errorMessage?: string
  /** Item import state */
  importState?: PplBatchState
  /** Related items */
  relatedItems?: unknown[]
}

/**
 * Shipment information from GET /shipment endpoint
 */
export interface PplShipmentInfo {
  shipmentNumber: string
  referenceId?: string
  shipmentState: PplShipmentState
  /** ISO date of last state change */
  stateDate: string
  productType: string
  recipient?: PplAddress
  sender?: PplAddress
  cashOnDelivery?: {
    codPrice: number
    /** ISO date when COD was collected */
    codPaidDate?: string
  }
  /** Weight in kg */
  weight?: number
  /** Actual delivery date (ISO) */
  deliveryDate?: string
  /** Pickup from sender date (ISO) */
  pickupDate?: string
}

/**
 * Shipment states from PPL API
 */
export type PplShipmentState =
  | "DataShipment" // Label created, not yet picked up
  | "Active" // In transit
  | "PickedUpFromSender" // Picked up from sender
  | "OutForDelivery" // Out for delivery
  | "DeliveredToPickupPoint" // At pickup point (ParcelShop/Box)
  | "Delivered" // Successfully delivered
  | "NotDelivered" // Delivery attempt failed
  | "BackToSender" // Returned to sender
  | "Rejected" // Rejected by recipient
  | "Dormant" // Inactive/expired
  | "Undelivered" // Not yet delivered (general)

/**
 * States indicating successful delivery
 */
export const PPL_DELIVERED_STATES: PplShipmentState[] = [
  "Delivered",
  "DeliveredToPickupPoint",
]

/**
 * States indicating failed/returned delivery
 */
export const PPL_FAILED_STATES: PplShipmentState[] = [
  "BackToSender",
  "Rejected",
  "NotDelivered",
]

/**
 * Human-readable status messages
 */
export const PPL_STATUS_MESSAGES: Record<PplShipmentState, string> = {
  Active: "In transit",
  BackToSender: "Returned to sender",
  DataShipment: "Label created, awaiting pickup",
  Delivered: "Delivered",
  DeliveredToPickupPoint: "Ready for pickup at ParcelShop/Box",
  Dormant: "Inactive",
  NotDelivered: "Delivery attempt failed",
  OutForDelivery: "Out for delivery",
  PickedUpFromSender: "Picked up from sender",
  Rejected: "Rejected by recipient",
  Undelivered: "Not yet delivered",
}

/**
 * Access point (pickup location) from GET /accessPoint
 */
export interface PplAccessPoint {
  /** Unique code to use in shipment.specificDelivery.parcelShopCode */
  code: string
  /** Access point name */
  name: string
  /** Type: ParcelShop, ParcelBox, AlzaBox, etc. */
  accessPointType: PplAccessPointType
  address: PplAddress
  openingHours?: string
  latitude?: number
  longitude?: number
  /** Whether access point is active */
  isActive?: boolean
}

/** Access point types - includes | string for forward-compatibility with PPL API */
export type PplAccessPointType = string

/**
 * Access points query parameters
 */
export interface PplAccessPointsQuery {
  /** Single access point code lookup */
  accessPointCode?: string
  countryCode?: string
  zipCode?: string
  city?: string
  /** Comma-separated access point types */
  accessPointTypes?: string
  /** Search radius in km */
  radius?: number
  latitude?: number
  longitude?: number
  limit?: number
  offset?: number
  /** Tribal/preferred service point */
  tribalServicePoint?: boolean
  /** Filter by card payment capability */
  activeCardPayment?: boolean
  /** Filter by cash payment capability */
  activeCashPayment?: boolean
  /** Filter by pickup enabled */
  pickupEnabled?: boolean
  /** Package sizes filter: S,M,L,XL */
  sizes?: string
}

/**
 * Paginated response wrapper
 */
export interface PplPaginatedResponse<T> {
  items: T[]
  totalCount: number
  limit: number
  offset: number
}

/**
 * Error response from PPL API
 */
export interface PplApiError {
  code?: string
  message: string
  details?: string
}

/**
 * Fulfillment processing status
 * - pending: Batch created, waiting for PPL to process
 * - completed: Batch processed, label downloaded and stored
 * - error: Batch processing or label download failed
 */
export type PplFulfillmentStatus = "pending" | "completed" | "error"

/**
 * Data stored in fulfillment.data for PPL shipments
 * Extends Record<string, unknown> for compatibility with Medusa's fulfillment data type
 */
export interface PplFulfillmentData extends Record<string, unknown> {
  /** Fulfillment processing status */
  status: PplFulfillmentStatus
  /** Batch ID from PPL - always present after createFulfillment */
  batch_id: string
  /** Product type used */
  product_type: PplProductType
  /** Access point code if pickup point delivery */
  access_point_id?: string

  // Fields populated after batch completes (by ppl-label-sync job)
  /** PPL shipment number (tracking number) - only after batch completes */
  shipment_number?: string
  /** Original PPL label URL (may expire) - only after batch completes */
  ppl_label_url?: string
  /** Label URL stored in S3/MinIO - only after batch completes */
  label_url?: string
  /** Public tracking URL - only after batch completes */
  tracking_url?: string

  // Tracking status fields (populated by ppl-tracking-sync job)
  /** Last known shipment state */
  last_status?: PplShipmentState
  /** ISO date of last status update */
  last_status_date?: string
  /** Whether delivery failed */
  delivery_failed?: boolean

  // Error handling fields
  /** Error message if status === 'error' */
  error_message?: string
  /** Number of times label sync has been attempted */
  sync_attempts?: number
  /** ISO date of first sync attempt */
  first_sync_attempt?: string
  /** ISO date of last sync attempt */
  last_sync_attempt?: string
}

/**
 * Data passed during checkout for PPL shipping option
 */
export interface PplShippingOptionData extends Record<string, unknown> {
  /** Product type code */
  product_type: PplProductType
  /** Whether option requires access point selection */
  requires_access_point: boolean
  /** Whether option supports COD */
  supports_cod: boolean
  /** Selected access point ID (from PPL widget) */
  access_point_id?: string
  /** Selected access point name (for display) */
  access_point_name?: string
  /** Selected access point type */
  access_point_type?: PplAccessPointType
}

/**
 * Query parameters for GET /shipment endpoint
 */
export interface PplShipmentQuery {
  /** Filter by shipment numbers */
  shipmentNumbers?: string[]
  /** Filter by invoice numbers */
  invoiceNumbers?: string[]
  /** Filter by customer references */
  customerReferences?: string[]
  /** Filter by variable symbols */
  variableSymbols?: string[]
  /** Filter by date from (ISO DateTime) */
  dateFrom?: string
  /** Filter by date to (ISO DateTime) */
  dateTo?: string
  /** Filter by shipment states */
  shipmentStates?: PplShipmentState[]
  /** Results limit (default: 100) */
  limit?: number
  /** Results offset (default: 0) */
  offset?: number
}

/**
 * Order type - includes | string for forward-compatibility with PPL API
 */
export type PplOrderType = string

/**
 * Order state
 */
export type PplOrderState =
  | "Created"
  | "InProcess"
  | "Complete"
  | "Canceled"
  | "Error"

/**
 * Query parameters for GET /order endpoint
 */
export interface PplOrderQuery {
  /** Filter by shipment numbers */
  shipmentNumbers?: string[]
  /** Filter by customer references */
  customerReferences?: string[]
  /** Filter by order references */
  orderReferences?: string[]
  /** Filter by order numbers */
  orderNumbers?: string[]
  /** Filter by order IDs */
  orderIds?: number[]
  /** Filter by date from (ISO DateTime) */
  dateFrom?: string
  /** Filter by date to (ISO DateTime) */
  dateTo?: string
  /** Filter by send date (ISO DateTime) */
  sendDate?: string
  /** Filter by product type */
  productType?: string
  /** Filter by order states */
  orderStates?: PplOrderState[]
  /** Results limit (required) */
  limit: number
  /** Results offset (required) */
  offset: number
}

/**
 * Order response from GET /order endpoint
 */
export interface PplOrder {
  /** Order ID */
  orderId?: number
  /** Order number */
  orderNumber?: string
  /** Order reference */
  orderReference?: string
  /** Customer reference */
  customerReference?: string
  /** Order type */
  orderType: PplOrderType
  /** Order state */
  orderState: PplOrderState
  /** Send date (ISO DateTime) */
  sendDate?: string
  /** Number of shipments */
  shipmentCount?: number
  /** Contact email */
  email?: string
  /** Note/description */
  note?: string
  /** Send time from (HH:mm) */
  sendTimeFrom?: string
  /** Send time to (HH:mm) */
  sendTimeTo?: string
  /** Product type */
  productType?: string
  /** Sender address */
  sender?: PplAddress
  /** Recipient address */
  recipient?: PplAddress
  /** Created date (ISO DateTime) */
  createdDate?: string
  /** Error message if failed */
  errorMessage?: string
}

/**
 * Order batch creation request (POST /order/batch)
 */
export interface PplOrderBatchRequest {
  orders: PplOrderRequest[]
}

/**
 * Single order request
 */
export interface PplOrderRequest {
  /** Order type (Transport or CollectionOrder) */
  orderType: PplOrderType
  /** Reference ID, max 128 chars */
  referenceId?: string
  /** Send date (ISO DateTime) */
  sendDate?: string
  /** Number of shipments to pickup */
  shipmentCount?: number
  /** Contact email */
  email?: string
  /** Note/description, max 300 chars */
  note?: string
  /** Customer reference */
  customerReference?: string
  /** Pickup time from (HH:mm) */
  sendTimeFrom?: string
  /** Pickup time to (HH:mm) */
  sendTimeTo?: string
  /** Product type */
  productType?: string
  /** Sender/pickup address */
  sender?: PplAddress
  /** Recipient address (for collection orders) */
  recipient?: PplAddress
}

/**
 * Order batch response (GET /order/batch/{batchId})
 */
export interface PplOrderBatchResponse {
  /** Batch ID */
  batchId: string
  /** Batch items */
  items: PplOrderBatchItem[]
}

/**
 * Order batch item
 */
export interface PplOrderBatchItem {
  /** Reference ID from request */
  referenceId?: string
  /** Order number (assigned after processing) */
  orderNumber?: string
  /** Import state */
  importState: PplBatchState
  /** Error message if failed */
  errorMessage?: string
}

/**
 * Order cancellation request (POST /order/cancel)
 */
export interface PplOrderCancelRequest {
  /** Note/reason for cancellation */
  note?: string
}

/**
 * Order cancellation query parameters
 */
export interface PplOrderCancelQuery {
  /** Customer reference to cancel */
  customerReference?: string
  /** Order reference to cancel */
  orderReference?: string
}

/**
 * Human-readable order state messages
 */
export const PPL_ORDER_STATE_MESSAGES: Record<PplOrderState, string> = {
  Canceled: "Order canceled",
  Complete: "Order completed",
  Created: "Order created",
  Error: "Order failed",
  InProcess: "Order in process",
}

/**
 * Query parameters for GET /addressWhisper endpoint
 */
export interface PplAddressWhisperQuery {
  /** Street name for autocomplete */
  street?: string
  /** ZIP code for autocomplete */
  zipCode?: string
  /** City name for autocomplete */
  city?: string
  /** Which field triggered the whisper */
  calledFrom?: "Street" | "ZipCode" | "City"
}

/**
 * Address whisper response
 */
export interface PplAddressWhisperResponse {
  items: PplAddressWhisperItem[]
}

/**
 * Single address suggestion from whisper
 */
export interface PplAddressWhisperItem {
  street?: string
  zipCode?: string
  city?: string
  country?: string
}

/**
 * Generic codelist query parameters
 */
export interface PplCodelistQuery {
  /** Results limit (required) */
  limit: number
  /** Results offset (required) */
  offset: number
}

/**
 * Product codelist item from GET /codelist/product
 */
export interface PplCodelistProduct {
  /** Product code (e.g., SMAR, SMAD, PRIV, PRID) */
  code: string
  /** Product name */
  name: string
  /** Product description */
  description?: string
}

/**
 * Age check codelist item from GET /codelist/ageCheck
 */
export interface PplCodelistAgeCheck {
  /** Age check code */
  code: string
  /** Age check name/description */
  name: string
}

/**
 * External number type from GET /codelist/externalNumber
 */
export interface PplCodelistExternalNumber {
  /** External number type code */
  code: string
  /** External number type name */
  name: string
}

/**
 * Country codelist item from GET /codelist/country
 */
export interface PplCodelistCountry {
  /** ISO country code */
  code: string
  /** Country name */
  name: string
  /** Whether COD is allowed for this country */
  codAllowed?: boolean
}

/**
 * Currency codelist item from GET /codelist/currency
 */
export interface PplCodelistCurrency {
  /** Currency code (e.g., CZK, EUR) */
  code: string
  /** Currency name */
  name: string
}

/**
 * Service codelist item from GET /codelist/service
 */
export interface PplCodelistServiceItem {
  /** Service code */
  code: string
  /** Service name */
  name: string
  /** Service description */
  description?: string
}

/**
 * Service price limit query parameters
 */
export interface PplServicePriceLimitQuery extends PplCodelistQuery {
  /** Filter by service code */
  service?: string
  /** Filter by currency code */
  currency?: string
  /** Filter by country code */
  country?: string
  /** Filter by product code */
  product?: string
}

/**
 * Service price limit from GET /codelist/servicePriceLimit
 */
export interface PplCodelistServicePriceLimit {
  /** Service code */
  service?: string
  /** Currency code */
  currency?: string
  /** Country code */
  country?: string
  /** Product code */
  product?: string
  /** Minimum value */
  minValue?: number
  /** Maximum value */
  maxValue?: number
}

/**
 * Shipment phase from GET /codelist/shipmentPhase
 */
export interface PplCodelistShipmentPhase {
  /** Phase code */
  code: string
  /** Phase name */
  name: string
  /** Phase description */
  description?: string
}

/**
 * Status codelist item from GET /codelist/status
 */
export interface PplCodelistStatus {
  /** Status code */
  code: string
  /** Status name */
  name: string
  /** Status description */
  description?: string
}

/**
 * Validation message from GET /codelist/validationMessage
 */
export interface PplCodelistValidationMessage {
  /** Validation message code */
  code: string
  /** Validation message text */
  message: string
}

/**
 * Proof of identity type from GET /codelist/proofOfIdentityType
 */
export interface PplCodelistProofOfIdentityType {
  /** Identity document type code */
  code: string
  /** Identity document type name */
  name: string
}

/**
 * Customer address item from GET /customer/address
 */
export interface PplCustomerAddress extends PplAddress {
  /** Address type code (e.g., "SEAT", "INVO", "PICK", "BACK") */
  code: string
  /** Whether this is the default address */
  default?: boolean
}

/**
 * Customer addresses response from GET /customer/address
 * Returns a direct array of addresses
 */
export type PplCustomerAddressResponse = PplCustomerAddress[]

/**
 * Customer info response from GET /customer
 */
export interface PplCustomerInfo {
  /** Allowed currencies for the customer */
  currencies?: string[]
  /** Customer ID */
  customerId?: number
  /** Customer name */
  customerName?: string
}

/**
 * Shipment redirect request (POST /shipment/:shipmentNumber/redirect)
 * Used to update contact information for a shipment
 */
export interface PplShipmentRedirectRequest {
  address: {
    /** Contact person name */
    contact?: string
    /** Phone number */
    phone?: string
    /** Email address */
    email?: string
  }
}

/**
 * Connect set request (POST /shipment/batch/connectSet)
 * Used to connect multiple shipments into a set
 */
export interface PplConnectSetRequest {
  /** Customer ID */
  customerId: number
  /** External set number/reference */
  externalSetNumber: string
  /** Array of shipment numbers to connect */
  shipmentNumbers: string[]
}

/**
 * Batch update request (PUT /shipment/batch/:batchId)
 * Used to update label settings for an existing batch
 */
export interface PplBatchUpdateRequest {
  /** Updated label settings */
  labelSettings?: PplLabelSettings
  /** Updated return channel */
  returnChannel?: PplReturnChannel
}

/**
 * Batch label query parameters (GET /shipment/batch/:batchId/label)
 */
export interface PplBatchLabelQuery {
  /** Page size for labels */
  pageSize?: PplLabelPageSize
  /** Starting position on page */
  position?: number
  /** Results limit (required) */
  limit: number
  /** Results offset (required) */
  offset: number
  /** Sort order: ShipmentNumber, ReferenceId, -ShipmentNumber, -ReferenceId */
  orderBy?: string
}

/**
 * Batch label response item
 */
export interface PplBatchLabelItem {
  /** Shipment number */
  shipmentNumber: string
  /** Reference ID */
  referenceId?: string
  /** Label URL for this shipment */
  labelUrl?: string
}

/**
 * Batch label response (GET /shipment/batch/:batchId/label)
 */
export interface PplBatchLabelResponse {
  items: PplBatchLabelItem[]
  /** Complete/merged label URL if requested */
  completeLabelUrl?: string
  totalCount?: number
  limit?: number
  offset?: number
}

/**
 * Routing query parameters (GET /routing)
 */
export interface PplRoutingQuery {
  /** Parcel shop/access point code */
  parcelShopCode?: string
  /** Street address */
  street?: string
  /** City name */
  city?: string
  /** ZIP/postal code */
  zipCode?: string
  /** Country code (required) */
  country: string
  /** Product type code */
  productType?: string
}

/**
 * Routing response from GET /routing
 */
export interface PplRoutingResponse {
  /** Route code */
  routeCode?: string
  /** Depot code */
  depotCode?: string
  /** Delivery tour */
  deliveryTour?: string
  /** Sort code */
  sortCode?: string
}

/**
 * Version information response (GET /versionInformation)
 */
export interface PplVersionInformationResponse {
  items: PplVersionInfoItem[]
  totalCount?: number
}

/**
 * Version information item
 */
export interface PplVersionInfoItem {
  /** Version number */
  version?: string
  /** Release date (ISO DateTime) */
  releaseDate?: string
  /** Version description/changelog */
  description?: string
  /** Information type (e.g., Release, Maintenance, Notice) */
  infoType?: string
  /** Title */
  title?: string
}

/**
 * API info response (GET /info)
 */
export interface PplApiInfo {
  /** API version */
  version?: string
  /** API environment */
  environment?: string
  /** API status */
  status?: string
}

// ============================================
// PPL Config Types (DB-stored configuration)
// ============================================

/**
 * Fields that are encrypted in the database
 */
export const PPL_SENSITIVE_FIELDS = [
  "client_secret",
  "cod_bank_account",
  "cod_bank_code",
  "cod_iban",
  "cod_swift",
] as const

/**
 * PPL Config data transfer object (returned from service)
 */
export interface PplConfigDTO {
  id: string
  environment: PplEnvironment
  is_enabled: boolean
  client_id: string | null
  client_secret: string | null
  default_label_format: string
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
 * Input type for updating PPL config
 * Empty string for sensitive fields = keep existing value
 * null for sensitive fields = clear the value
 */
export interface UpdatePplConfigInput {
  is_enabled?: boolean
  client_id?: string
  client_secret?: string | null
  default_label_format?: PplLabelFormat
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

/**
 * PPL Config response for admin API (masks sensitive fields)
 */
export interface PplConfigResponse {
  id: string
  environment: PplEnvironment
  is_enabled: boolean
  client_id: string | null
  /** Masked - shows "••••••" if set, null if not */
  client_secret_set: boolean
  default_label_format: string
  /** Masked - shows "••••••" if set, null if not */
  cod_bank_account_set: boolean
  /** Masked - shows "••••••" if set, null if not */
  cod_bank_code_set: boolean
  /** Masked - shows "••••••" if set, null if not */
  cod_iban_set: boolean
  /** Masked - shows "••••••" if set, null if not */
  cod_swift_set: boolean
  sender_name: string | null
  sender_street: string | null
  sender_city: string | null
  sender_zip_code: string | null
  sender_country: string | null
  sender_phone: string | null
  sender_email: string | null
}

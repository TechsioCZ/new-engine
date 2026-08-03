import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  Logger,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import {
  AbstractFulfillmentProviderService,
  MedusaError,
} from "@medusajs/framework/utils"

import { PPL_CLIENT_MODULE, type PplClientModuleService } from "../ppl-client"
import type {
  PplCodSettings,
  PplFulfillmentData,
  PplOptions,
  PplProductType,
  PplShipmentRequest,
  PplShippingOptionData,
} from "../ppl-client/types"

type InjectedDependencies = {
  logger: Logger
} & Record<typeof PPL_CLIENT_MODULE, PplClientModuleService>

const PPL_PRODUCT_TYPES: readonly PplProductType[] = [
  "SMAR",
  "SMAD",
  "PRIV",
  "PRID",
]

const isPplProductType = (value: unknown): value is PplProductType =>
  typeof value === "string" && PPL_PRODUCT_TYPES.includes(value)

const isPplShippingOptionData = (
  value: Record<string, unknown>
): value is Record<string, unknown> &
  Pick<
    PplShippingOptionData,
    "product_type" | "supports_cod" | "access_point_id"
  > =>
  isPplProductType(value["product_type"]) &&
  typeof value["supports_cod"] === "boolean" &&
  (value["access_point_id"] === undefined ||
    typeof value["access_point_id"] === "string")

const getPplFulfillmentData = (
  data: Record<string, unknown>
): Partial<PplFulfillmentData> => ({
  ...(typeof data["batch_id"] === "string"
    ? { batch_id: data["batch_id"] }
    : {}),
  ...(typeof data["shipment_number"] === "string"
    ? { shipment_number: data["shipment_number"] }
    : {}),
  ...(typeof data["label_url"] === "string"
    ? { label_url: data["label_url"] }
    : {}),
  ...(typeof data["tracking_url"] === "string"
    ? { tracking_url: data["tracking_url"] }
    : {}),
})

/**
 * PPL Fulfillment Provider Service
 *
 * Implements PPL CPL API integration for Medusa 2 fulfillment.
 * Supports:
 * - Pickup points (ParcelShop, ParcelBox, AlzaBox)
 * - Cash on Delivery (CZK only)
 * - PNG label generation and S3/MinIO storage
 */
export const PPL_PROVIDER_IDENTIFIER = "ppl"

class PplFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static override identifier = PPL_PROVIDER_IDENTIFIER

  protected readonly logger_: Logger
  protected readonly pplClient_: PplClientModuleService

  constructor(container: InjectedDependencies, _options: PplOptions) {
    super()
    this.logger_ = container.logger
    this.pplClient_ = container[PPL_CLIENT_MODULE]
  }

  private getClient(): PplClientModuleService {
    if (!this.pplClient_) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PPL: ppl_client module not available. Check medusa-config dependencies."
      )
    }
    return this.pplClient_
  }

  /**
   * Returns available PPL shipping options for admin UI
   * Returns empty array if PPL is disabled or not configured
   */
  override async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    // Check if PPL is enabled and configured
    // Wrapped in try-catch to prevent admin UI crash if ppl-client unavailable
    try {
      const config = await this.getClient().getEffectiveConfig()
      if (!config) {
        return []
      }
    } catch (error) {
      this.logger_.warn(
        `PPL: Could not check config status, returning no options: ${error instanceof Error ? error.message : String(error)}`
      )
      return []
    }

    return [
      {
        id: "ppl-parcel-smart",
        name: "PPL Parcel Smart (ParcelShop/ParcelBox)",
        product_type: "SMAR" as PplProductType,
        requires_access_point: true,
        supports_cod: false,
      },
      {
        id: "ppl-parcel-smart-cod",
        name: "PPL Parcel Smart + COD",
        product_type: "SMAD" as PplProductType,
        requires_access_point: true,
        supports_cod: true,
      },
      {
        id: "ppl-private",
        name: "PPL Private (Home Delivery)",
        product_type: "PRIV" as PplProductType,
        requires_access_point: false,
        supports_cod: false,
      },
      {
        id: "ppl-private-cod",
        name: "PPL Private + COD (Home Delivery)",
        product_type: "PRID" as PplProductType,
        requires_access_point: false,
        supports_cod: true,
      },
    ]
  }

  /**
   * Validates shipping option configuration
   */
  override async validateOption(
    data: Record<string, unknown>
  ): Promise<boolean> {
    return isPplProductType(data["product_type"])
  }

  /**
   * Called during checkout when customer selects shipping method
   * Validates and stores access point selection from PPL Widget
   */
  override async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    // Check if PPL is enabled (blocks checkout with stale shipping options)
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PPL shipping is currently unavailable. Please select a different shipping method."
      )
    }

    const productType = optionData["product_type"]
    const requiresAccessPoint = optionData["requires_access_point"] === true
    const supportsCod = optionData["supports_cod"] === true
    if (!isPplProductType(productType)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Invalid shipping option data"
      )
    }

    const accessPointId = data["access_point_id"]
    if (accessPointId !== undefined && typeof accessPointId !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Access point ID must be a string"
      )
    }

    // If this option requires access point, validate it was selected
    if (requiresAccessPoint) {
      if (!accessPointId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PPL: Access point (pickup location) is required for this shipping method"
        )
      }

      this.logger_.debug(`PPL: Access point selected: ${accessPointId}`)
    }

    // Return data to be stored in shipping_method.data
    const validatedData: PplShippingOptionData = {
      product_type: productType,
      requires_access_point: requiresAccessPoint,
      supports_cod: supportsCod,
    }
    if (accessPointId !== undefined) {
      validatedData.access_point_id = accessPointId
    }
    if (typeof data["access_point_name"] === "string") {
      validatedData.access_point_name = data["access_point_name"]
    }
    if (typeof data["access_point_type"] === "string") {
      validatedData.access_point_type = data["access_point_type"]
    }

    return validatedData
  }

  override async createFulfillment(
    data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    if (!isPplShippingOptionData(data)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Invalid shipping data"
      )
    }
    const shippingData = data
    const {
      product_type: productType,
      access_point_id: accessPointId,
      supports_cod: supportsCod,
    } = shippingData

    if (!order) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Order is required for fulfillment"
      )
    }
    if (!order.shipping_address) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Shipping address is required"
      )
    }

    const recipient = this.buildRecipient(order.shipping_address, order.email)
    const countryCode = recipient.country

    const codSettings = supportsCod
      ? await this.buildCodSettings(order, countryCode)
      : undefined

    // Warn if PPL customer profile not configured
    const customerInfo = await this.getClient().getCustomerInfo()
    if (!customerInfo) {
      this.logger_.warn(
        "PPL: Customer profile not configured. Shipment creation may fail. Contact ithelp@ppl.cz"
      )
    }

    const sender = await this.getSenderAddress()
    const fulfillmentId = fulfillment.id || `temp-${Date.now()}`
    const orderId = order.display_id?.toString() || order.id || ""

    const shipmentRequest = this.buildShipmentRequest({
      fulfillmentId,
      productType,
      recipient,
      sender,
      orderId,
      accessPointId,
      codSettings,
    })

    this.logger_.info(
      `PPL: Creating shipment for ${fulfillmentId}, product: ${productType}`
    )

    const batchId = await this.getClient().createShipmentBatch([
      shipmentRequest,
    ])

    this.logger_.info(
      `PPL: Batch ${batchId} created. Status updated by ppl-label-sync job.`
    )

    return {
      data: {
        status: "pending",
        batch_id: batchId,
        product_type: productType,
        ...(accessPointId !== undefined
          ? { access_point_id: accessPointId }
          : {}),
      } satisfies PplFulfillmentData,
      labels: [],
    }
  }

  private async getSenderAddress() {
    // Check if PPL customer has sender address configured, otherwise use fallback
    let sender: PplShipmentRequest["sender"] | undefined
    const customerAddresses = await this.getClient().getCustomerAddresses()
    const defaultSeatAddress = customerAddresses?.find(
      (a) => a.code === "SEAT" && a.default === true
    )

    if (defaultSeatAddress) {
      sender = {
        name: defaultSeatAddress.name,
        street: defaultSeatAddress.street,
        city: defaultSeatAddress.city,
        zipCode: defaultSeatAddress.zipCode,
        country: defaultSeatAddress.country,
        ...(defaultSeatAddress.phone && { phone: defaultSeatAddress.phone }),
        ...(defaultSeatAddress.email && { email: defaultSeatAddress.email }),
      }
    } else {
      const config = await this.getClient().getEffectiveConfig()
      if (!config) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "PPL: Service is disabled or not configured. Enable it in Settings → PPL."
        )
      }
      const {
        sender_name,
        sender_street,
        sender_city,
        sender_zip_code,
        sender_country,
        sender_phone,
        sender_email,
      } = config

      if (
        !(
          sender_name &&
          sender_street &&
          sender_city &&
          sender_zip_code &&
          sender_country
        )
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PPL: No sender address configured in PPL system and no fallback sender address provided. " +
            "Please configure a sender address in Settings → PPL."
        )
      }

      sender = {
        name: sender_name,
        street: sender_street,
        city: sender_city,
        zipCode: sender_zip_code,
        country: sender_country,
        ...(sender_phone && { phone: sender_phone }),
        ...(sender_email && { email: sender_email }),
      }

      this.logger_.info(
        "PPL: Using fallback sender address from environment variables"
      )
    }

    return sender
  }

  /**
   * Called when admin cancels a fulfillment
   *
   * PPL API is async - batch creation returns immediately but processing happens later.
   * We need to check the batch status to get the shipment_number if not yet available.
   *
   * NOTE: Cancellation only works BEFORE physical pickup by PPL courier
   */
  override async cancelFulfillment(
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const fulfillmentData = getPplFulfillmentData(data)
    let shipmentNumber = fulfillmentData.shipment_number
    const batchId = fulfillmentData.batch_id

    // If no shipment_number yet, try to fetch it from PPL batch status
    // (batch may have been processed since fulfillment was created)
    if (!shipmentNumber && batchId) {
      this.logger_.info(
        `PPL: No shipment_number in fulfillment data, checking batch ${batchId} status`
      )

      const batchStatus = await this.getClient().getBatchStatus(batchId)
      const batchItem = batchStatus.items?.[0]

      if (batchItem?.shipmentNumber) {
        shipmentNumber = batchItem.shipmentNumber
        this.logger_.info(
          `PPL: Found shipment_number ${shipmentNumber} from batch status`
        )
      }
    }

    // If still no shipment number, batch hasn't been processed yet
    if (!shipmentNumber) {
      this.logger_.warn(
        `PPL: Cannot cancel - batch ${batchId} not yet processed by PPL. Manual intervention may be needed.`
      )
      return {
        cancelled: false,
        batch_id: batchId,
        note: "Batch not yet processed by PPL. Check PPL portal or retry later.",
      }
    }

    this.logger_.info(`PPL: Attempting to cancel shipment ${shipmentNumber}`)

    const cancelled = await this.getClient().cancelShipment(shipmentNumber)

    if (!cancelled) {
      this.logger_.warn(
        `PPL: Cancellation failed for ${shipmentNumber}. Shipment may have been picked up.`
      )
      return {
        cancelled: false,
        shipment_number: shipmentNumber,
        note: "Cancellation failed. Shipment may have been picked up. Contact PPL support.",
      }
    }

    this.logger_.info(`PPL: Shipment ${shipmentNumber} successfully cancelled`)

    return {
      cancelled: true,
      shipment_number: shipmentNumber,
    }
  }

  /**
   * Called when creating a return fulfillment
   * NOTE: Return flow may differ - verify with PPL documentation
   */
  override async createReturnFulfillment(
    _fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "PPL: Return fulfillment not yet implemented. Contact PPL for return label process."
    )
  }

  /**
   * Whether this provider can calculate shipping prices dynamically
   * Returns false to use flat rates configured in Medusa
   */
  override async canCalculate(
    _data: CreateShippingOptionDTO
  ): Promise<boolean> {
    return false
  }

  /**
   * Calculate shipping price (not used when canCalculate returns false)
   */
  override async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    _context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<CalculatedShippingOptionPrice> {
    return {
      calculated_amount: 0,
      is_calculated_price_tax_inclusive: false,
    }
  }

  /**
   * Returns all documents for a fulfillment (labels, etc.)
   * Called by Medusa to get fulfillment documents
   */
  // @ts-expect-error Base class returns never[] but we return actual documents
  override async getFulfillmentDocuments(
    data: Record<string, unknown>
  ): Promise<{ type: string; url: string; format?: string }[]> {
    const fulfillmentData = getPplFulfillmentData(data)
    const documents: { type: string; url: string; format?: string }[] = []

    if (fulfillmentData.label_url) {
      documents.push({
        type: "label",
        url: fulfillmentData.label_url,
        format: "png",
      })
    }

    if (fulfillmentData.tracking_url) {
      documents.push({
        type: "tracking",
        url: fulfillmentData.tracking_url,
      })
    }

    return documents
  }

  /**
   * Retrieves a specific document type for a fulfillment
   */
  // @ts-expect-error Base class returns void but we return document or null
  override async retrieveDocuments(
    fulfillmentData: Record<string, unknown>,
    documentType: string
  ): Promise<{ type: string; url: string; format?: string } | null> {
    const data = getPplFulfillmentData(fulfillmentData)

    switch (documentType) {
      case "label":
        return data.label_url
          ? { type: "label", url: data.label_url, format: "png" }
          : null
      case "tracking":
        return data.tracking_url
          ? { type: "tracking", url: data.tracking_url }
          : null
      default:
        return null
    }
  }

  /**
   * Returns documents for a return fulfillment
   * TODO: Implement when return flow is added
   */
  override async getReturnDocuments(
    _data: Record<string, unknown>
  ): Promise<never[]> {
    return []
  }

  /**
   * Returns shipment documents (commercial invoice, packing list, etc.)
   * TODO: Implement if PPL provides these documents
   */
  override async getShipmentDocuments(
    _data: Record<string, unknown>
  ): Promise<never[]> {
    return []
  }

  private buildRecipient(
    shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>,
    email: string | undefined
  ): PplShipmentRequest["recipient"] {
    const countryCode = shippingAddress.country_code?.toUpperCase()
    if (!countryCode) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Shipping address must include country_code"
      )
    }

    return {
      name: this.truncate(
        `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim(),
        50
      ),
      street: this.truncate(shippingAddress.address_1 || "", 60),
      city: this.truncate(shippingAddress.city || "", 50),
      zipCode: shippingAddress.postal_code || "",
      country: countryCode,
      phone: this.truncate(shippingAddress.phone || "", 30),
      email: this.truncate(email || "", 50),
    }
  }

  private async buildCodSettings(
    order: Partial<FulfillmentOrderDTO>,
    countryCode: string
  ): Promise<PplCodSettings> {
    const codAmount = order.total
    if (codAmount == null || typeof codAmount !== "number") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Order total must be a valid number for COD shipments"
      )
    }

    const orderCurrency = order.currency_code?.toUpperCase()
    if (!orderCurrency) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Order currency_code is required for COD shipments"
      )
    }

    const supportedCurrencies = await this.getClient().getCachedCurrencies()
    if (!supportedCurrencies.some((c) => c.code === orderCurrency)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PPL: Currency ${orderCurrency} is not supported for COD. Supported: ${supportedCurrencies.map((c) => c.code).join(", ")}`
      )
    }

    const countries = await this.getClient().getCachedCountries()
    const destCountry = countries.find((c) => c.code === countryCode)
    if (destCountry?.codAllowed === false) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PPL: COD is not allowed for country ${countryCode}`
      )
    }

    const orderId =
      order.display_id?.toString() || order.id?.substring(0, 10) || ""
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PPL: Service is disabled or not configured. Enable it in Settings → PPL."
      )
    }

    return {
      codPrice: codAmount,
      codCurrency: orderCurrency,
      codVarSym: orderId,
      ...(config.cod_iban
        ? {
            iban: config.cod_iban,
            ...(config.cod_swift !== undefined
              ? { swift: config.cod_swift }
              : {}),
          }
        : {
            ...(config.cod_bank_account !== undefined
              ? { bankAccount: config.cod_bank_account }
              : {}),
            ...(config.cod_bank_code !== undefined
              ? { bankCode: config.cod_bank_code }
              : {}),
          }),
    }
  }

  private buildShipmentRequest(params: {
    fulfillmentId: string
    productType: PplProductType
    recipient: PplShipmentRequest["recipient"]
    sender: PplShipmentRequest["sender"] | undefined
    orderId: string
    accessPointId: string | undefined
    codSettings: PplCodSettings | undefined
  }): PplShipmentRequest {
    return {
      referenceId: params.fulfillmentId,
      productType: params.productType,
      recipient: params.recipient,
      ...(params.sender && { sender: params.sender }),
      externalNumbers: [{ code: "CUST", externalNumber: params.orderId }],
      ...(params.accessPointId && {
        specificDelivery: { parcelShopCode: params.accessPointId },
      }),
      ...(params.codSettings && { cashOnDelivery: params.codSettings }),
    }
  }

  private truncate(str: string, maxLength: number): string {
    if (!str) {
      return ""
    }
    return str.length > maxLength ? str.substring(0, maxLength) : str
  }
}

export default PplFulfillmentProviderService

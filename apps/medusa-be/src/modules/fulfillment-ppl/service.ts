import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  IFulfillmentProvider,
  FulfillmentOrderDTO,
  Logger,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { PPL_CLIENT_MODULE } from "../ppl-client"
import type { PplClientModuleService } from "../ppl-client"
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

const PPL_PRODUCT_TYPES: ReadonlySet<PplProductType> = new Set([
  "SMAR",
  "SMAD",
  "PRIV",
  "PRID",
])

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.length > 0

const isPplProductType = (value: unknown): value is PplProductType =>
  typeof value === "string" && PPL_PRODUCT_TYPES.has(value)

const truncate = (value: string, maxLength: number): string =>
  value.length > maxLength ? value.slice(0, maxLength) : value

interface SenderAddressValues {
  sender_name: string | null | undefined
  sender_street: string | null | undefined
  sender_city: string | null | undefined
  sender_zip_code: string | null | undefined
  sender_country: string | null | undefined
}

const hasRequiredSenderAddress = (
  values: SenderAddressValues,
): values is { [Key in keyof SenderAddressValues]: string } =>
  Object.values(values).every(isNonEmptyString)

const isPplShippingOptionData = (
  value: Record<string, unknown>,
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
  data: Record<string, unknown>,
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

/**
 * The framework's abstract provider currently narrows document methods below
 * the canonical `IFulfillmentProvider` contract. Implementing that contract
 * directly keeps the real document results typed while the discovery marker
 * preserves Medusa's runtime provider identification.
 */
class PplFulfillmentProviderService implements IFulfillmentProvider {
  static readonly _isFulfillmentService = true
  static readonly identifier = PPL_PROVIDER_IDENTIFIER

  protected readonly identifier = PPL_PROVIDER_IDENTIFIER
  protected readonly logger: Logger
  protected readonly pplClient: PplClientModuleService

  constructor(container: InjectedDependencies, _options: PplOptions) {
    this.logger = container.logger
    this.pplClient = container[PPL_CLIENT_MODULE]
  }

  getIdentifier(): string {
    return this.identifier
  }

  private getClient(): PplClientModuleService {
    return this.pplClient
  }

  /**
   * Returns available PPL shipping options for admin UI
   * Returns empty array if PPL is disabled or not configured
   */
  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    // Check if PPL is enabled and configured
    // Wrapped in try-catch to prevent admin UI crash if ppl-client unavailable
    try {
      const config = await this.getClient().getEffectiveConfig()
      if (!config) {
        return []
      }
    } catch (error) {
      this.logger.warn(
        `PPL: Could not check config status, returning no options: ${error instanceof Error ? error.message : String(error)}`,
      )
      return []
    }

    return [
      {
        id: "ppl-parcel-smart",
        name: "PPL Parcel Smart (ParcelShop/ParcelBox)",
        product_type: "SMAR",
        requires_access_point: true,
        supports_cod: false,
      },
      {
        id: "ppl-parcel-smart-cod",
        name: "PPL Parcel Smart + COD",
        product_type: "SMAD",
        requires_access_point: true,
        supports_cod: true,
      },
      {
        id: "ppl-private",
        name: "PPL Private (Home Delivery)",
        product_type: "PRIV",
        requires_access_point: false,
        supports_cod: false,
      },
      {
        id: "ppl-private-cod",
        name: "PPL Private + COD (Home Delivery)",
        product_type: "PRID",
        requires_access_point: false,
        supports_cod: true,
      },
    ]
  }

  /**
   * Validates shipping option configuration
   */
  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    await Promise.resolve(this)
    return isPplProductType(data["product_type"])
  }

  /**
   * Called during checkout when customer selects shipping method
   * Validates and stores access point selection from PPL Widget
   */
  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext,
  ): Promise<Record<string, unknown>> {
    // Check if PPL is enabled (blocks checkout with stale shipping options)
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PPL shipping is currently unavailable. Please select a different shipping method.",
      )
    }

    const productType = optionData["product_type"]
    const requiresAccessPoint = optionData["requires_access_point"] === true
    const supportsCod = optionData["supports_cod"] === true
    if (!isPplProductType(productType)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Invalid shipping option data",
      )
    }

    const accessPointId = data["access_point_id"]
    if (accessPointId !== undefined && typeof accessPointId !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Access point ID must be a string",
      )
    }

    // If this option requires access point, validate it was selected
    if (requiresAccessPoint) {
      if (!isNonEmptyString(accessPointId)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PPL: Access point (pickup location) is required for this shipping method",
        )
      }

      this.logger.debug(`PPL: Access point selected: ${accessPointId}`)
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

  async createFulfillment(
    data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<
      Omit<FulfillmentDTO, "provider_id" | "data" | "items">
    >,
  ): Promise<CreateFulfillmentResult> {
    if (!isPplShippingOptionData(data)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Invalid shipping data",
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
        "PPL: Order is required for fulfillment",
      )
    }
    if (!order.shipping_address) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Shipping address is required",
      )
    }

    const recipient = PplFulfillmentProviderService.buildRecipient(
      order.shipping_address,
      order.email,
    )
    const countryCode = recipient.country

    const codSettings = supportsCod
      ? await this.buildCodSettings(order, countryCode)
      : undefined

    // Warn if PPL customer profile not configured
    const customerInfo = await this.getClient().getCustomerInfo()
    if (!customerInfo) {
      this.logger.warn(
        "PPL: Customer profile not configured. Shipment creation may fail. Contact ithelp@ppl.cz",
      )
    }

    const sender = await this.getSenderAddress()
    const fulfillmentId = fulfillment.id ?? `temp-${Date.now()}`
    const orderId = order.display_id?.toString() ?? order.id ?? ""

    const shipmentRequest = PplFulfillmentProviderService.buildShipmentRequest({
      accessPointId,
      codSettings,
      fulfillmentId,
      orderId,
      productType,
      recipient,
      sender,
    })

    this.logger.info(
      `PPL: Creating shipment for ${fulfillmentId}, product: ${productType}`,
    )

    const batchId = await this.getClient().createShipmentBatch([
      shipmentRequest,
    ])

    this.logger.info(
      `PPL: Batch ${batchId} created. Status updated by ppl-label-sync job.`,
    )

    return {
      data: {
        batch_id: batchId,
        product_type: productType,
        status: "pending",
        ...(accessPointId === undefined
          ? {}
          : { access_point_id: accessPointId }),
      } satisfies PplFulfillmentData,
      labels: [],
    }
  }

  private async getSenderAddress() {
    // Check if PPL customer has sender address configured, otherwise use fallback
    let sender: PplShipmentRequest["sender"] | undefined
    const customerAddresses = await this.getClient().getCustomerAddresses()
    const defaultSeatAddress = customerAddresses?.find(
      (a) => a.code === "SEAT" && a.default === true,
    )

    if (defaultSeatAddress) {
      sender = {
        city: defaultSeatAddress.city,
        country: defaultSeatAddress.country,
        name: defaultSeatAddress.name,
        street: defaultSeatAddress.street,
        zipCode: defaultSeatAddress.zipCode,
        ...(isNonEmptyString(defaultSeatAddress.phone)
          ? { phone: defaultSeatAddress.phone }
          : {}),
        ...(isNonEmptyString(defaultSeatAddress.email)
          ? { email: defaultSeatAddress.email }
          : {}),
      }
    } else {
      const config = await this.getClient().getEffectiveConfig()
      if (!config) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "PPL: Service is disabled or not configured. Enable it in Settings → PPL.",
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

      const requiredSenderValues = {
        sender_city,
        sender_country,
        sender_name,
        sender_street,
        sender_zip_code,
      }
      if (!hasRequiredSenderAddress(requiredSenderValues)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PPL: No sender address configured in PPL system and no fallback sender address provided. " +
            "Please configure a sender address in Settings → PPL.",
        )
      }

      sender = {
        city: requiredSenderValues.sender_city,
        country: requiredSenderValues.sender_country,
        name: requiredSenderValues.sender_name,
        street: requiredSenderValues.sender_street,
        zipCode: requiredSenderValues.sender_zip_code,
        ...(isNonEmptyString(sender_phone) ? { phone: sender_phone } : {}),
        ...(isNonEmptyString(sender_email) ? { email: sender_email } : {}),
      }

      this.logger.info(
        "PPL: Using fallback sender address from environment variables",
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
  async cancelFulfillment(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const fulfillmentData = getPplFulfillmentData(data)
    let shipmentNumber = fulfillmentData.shipment_number
    const batchId = fulfillmentData.batch_id

    // If no shipment_number yet, try to fetch it from PPL batch status
    // (batch may have been processed since fulfillment was created)
    if (!isNonEmptyString(shipmentNumber) && isNonEmptyString(batchId)) {
      this.logger.info(
        `PPL: No shipment_number in fulfillment data, checking batch ${batchId} status`,
      )

      const batchStatus = await this.getClient().getBatchStatus(batchId)
      const batchItem = batchStatus.items?.[0]

      const { shipmentNumber: processedShipmentNumber } = batchItem ?? {}
      if (isNonEmptyString(processedShipmentNumber)) {
        shipmentNumber = processedShipmentNumber
        this.logger.info(
          `PPL: Found shipment_number ${shipmentNumber} from batch status`,
        )
      }
    }

    // If still no shipment number, batch hasn't been processed yet
    if (!isNonEmptyString(shipmentNumber)) {
      this.logger.warn(
        `PPL: Cannot cancel - batch ${batchId} not yet processed by PPL. Manual intervention may be needed.`,
      )
      return {
        batch_id: batchId,
        cancelled: false,
        note: "Batch not yet processed by PPL. Check PPL portal or retry later.",
      }
    }

    this.logger.info(`PPL: Attempting to cancel shipment ${shipmentNumber}`)

    const cancelled = await this.getClient().cancelShipment(shipmentNumber)

    if (!cancelled) {
      this.logger.warn(
        `PPL: Cancellation failed for ${shipmentNumber}. Shipment may have been picked up.`,
      )
      return {
        cancelled: false,
        note: "Cancellation failed. Shipment may have been picked up. Contact PPL support.",
        shipment_number: shipmentNumber,
      }
    }

    this.logger.info(`PPL: Shipment ${shipmentNumber} successfully cancelled`)

    return {
      cancelled: true,
      shipment_number: shipmentNumber,
    }
  }

  /**
   * Called when creating a return fulfillment
   * NOTE: Return flow may differ - verify with PPL documentation
   */
  async createReturnFulfillment(
    _fulfillment: Record<string, unknown>,
  ): Promise<CreateFulfillmentResult> {
    await Promise.resolve(this)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "PPL: Return fulfillment not yet implemented. Contact PPL for return label process.",
    )
  }

  /**
   * Whether this provider can calculate shipping prices dynamically
   * Returns false to use flat rates configured in Medusa
   */
  async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    await Promise.resolve(this)
    return false
  }

  /**
   * Calculate shipping price (not used when canCalculate returns false)
   */
  async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    _context: CalculateShippingOptionPriceDTO["context"],
  ): Promise<CalculatedShippingOptionPrice> {
    await Promise.resolve(this)
    return {
      calculated_amount: 0,
      is_calculated_price_tax_inclusive: false,
    }
  }

  /**
   * Returns all documents for a fulfillment (labels, etc.)
   * Called by Medusa to get fulfillment documents
   */
  async getFulfillmentDocuments(
    data: Record<string, unknown>,
  ): Promise<{ type: string; url: string; format?: string }[]> {
    await Promise.resolve(this)
    const fulfillmentData = getPplFulfillmentData(data)
    const documents: { type: string; url: string; format?: string }[] = []

    if (isNonEmptyString(fulfillmentData.label_url)) {
      documents.push({
        format: "png",
        type: "label",
        url: fulfillmentData.label_url,
      })
    }

    if (isNonEmptyString(fulfillmentData.tracking_url)) {
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
  async retrieveDocuments(
    fulfillmentData: Record<string, unknown>,
    documentType: string,
  ): Promise<{ type: string; url: string; format?: string } | null> {
    await Promise.resolve(this)
    const data = getPplFulfillmentData(fulfillmentData)

    switch (documentType) {
      case "label": {
        return isNonEmptyString(data.label_url)
          ? { format: "png", type: "label", url: data.label_url }
          : null
      }
      case "tracking": {
        return isNonEmptyString(data.tracking_url)
          ? { type: "tracking", url: data.tracking_url }
          : null
      }
      default: {
        return null
      }
    }
  }

  /**
   * Returns documents for a return fulfillment.
   * PPL return fulfillment is currently unsupported.
   */
  async getReturnDocuments(_data: Record<string, unknown>): Promise<never[]> {
    await Promise.resolve(this)
    return []
  }

  /**
   * Returns shipment documents (commercial invoice, packing list, etc.).
   * PPL does not currently expose additional shipment documents here.
   */
  async getShipmentDocuments(_data: Record<string, unknown>): Promise<never[]> {
    await Promise.resolve(this)
    return []
  }

  private static buildRecipient(
    shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>,
    email: string | undefined,
  ): PplShipmentRequest["recipient"] {
    const countryCode = shippingAddress.country_code?.toUpperCase()
    if (!isNonEmptyString(countryCode)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Shipping address must include country_code",
      )
    }

    return {
      city: truncate(shippingAddress.city ?? "", 50),
      country: countryCode,
      email: truncate(email ?? "", 50),
      name: truncate(
        `${shippingAddress.first_name ?? ""} ${shippingAddress.last_name ?? ""}`.trim(),
        50,
      ),
      phone: truncate(shippingAddress.phone ?? "", 30),
      street: truncate(shippingAddress.address_1 ?? "", 60),
      zipCode: shippingAddress.postal_code ?? "",
    }
  }

  private async buildCodSettings(
    order: Partial<FulfillmentOrderDTO>,
    countryCode: string,
  ): Promise<PplCodSettings> {
    const codAmount = order.total
    if (
      codAmount === null ||
      codAmount === undefined ||
      typeof codAmount !== "number"
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Order total must be a valid number for COD shipments",
      )
    }

    const orderCurrency = order.currency_code?.toUpperCase()
    if (!isNonEmptyString(orderCurrency)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Order currency_code is required for COD shipments",
      )
    }

    const supportedCurrencies = await this.getClient().getCachedCurrencies()
    if (!supportedCurrencies.some((c) => c.code === orderCurrency)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PPL: Currency ${orderCurrency} is not supported for COD. Supported: ${supportedCurrencies.map((c) => c.code).join(", ")}`,
      )
    }

    const countries = await this.getClient().getCachedCountries()
    const destCountry = countries.find((c) => c.code === countryCode)
    if (destCountry?.codAllowed === false) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PPL: COD is not allowed for country ${countryCode}`,
      )
    }

    const orderId = order.display_id?.toString() ?? order.id?.slice(0, 10) ?? ""
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PPL: Service is disabled or not configured. Enable it in Settings → PPL.",
      )
    }

    return {
      codCurrency: orderCurrency,
      codPrice: codAmount,
      codVarSym: orderId,
      ...(isNonEmptyString(config.cod_iban)
        ? {
            iban: config.cod_iban,
            ...(config.cod_swift === undefined
              ? {}
              : { swift: config.cod_swift }),
          }
        : {
            ...(config.cod_bank_account === undefined
              ? {}
              : { bankAccount: config.cod_bank_account }),
            ...(config.cod_bank_code === undefined
              ? {}
              : { bankCode: config.cod_bank_code }),
          }),
    }
  }

  private static buildShipmentRequest(params: {
    fulfillmentId: string
    productType: PplProductType
    recipient: PplShipmentRequest["recipient"]
    sender: PplShipmentRequest["sender"] | undefined
    orderId: string
    accessPointId: string | undefined
    codSettings: PplCodSettings | undefined
  }): PplShipmentRequest {
    return {
      ...(params.codSettings === undefined
        ? {}
        : { cashOnDelivery: params.codSettings }),
      externalNumbers: [{ code: "CUST", externalNumber: params.orderId }],
      productType: params.productType,
      recipient: params.recipient,
      referenceId: params.fulfillmentId,
      ...(params.sender === undefined ? {} : { sender: params.sender }),
      ...(isNonEmptyString(params.accessPointId)
        ? {
            specificDelivery: { parcelShopCode: params.accessPointId },
          }
        : {}),
    }
  }
}

export default PplFulfillmentProviderService

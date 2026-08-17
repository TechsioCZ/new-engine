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
  PplConfigReference,
  PplFulfillmentData,
  PplOptions,
  PplProductType,
  PplShipmentRequest,
  PplShippingOptionData,
} from "../ppl-client/types"
import { getPplConfigReference } from "../ppl-client/utils"

type InjectedDependencies = {
  logger: Logger
} & Record<typeof PPL_CLIENT_MODULE, PplClientModuleService>

type SupportedPplProductType = "SMAR" | "SMAD" | "PRIV" | "PRID"

type PplOptionSettings = {
  requiresAccessPoint: boolean
  supportsCod: boolean
}

const PPL_ACCESS_POINT_ID_MAX_LENGTH = 128
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

const PPL_OPTION_SETTINGS: Record<SupportedPplProductType, PplOptionSettings> =
  {
    SMAR: { requiresAccessPoint: true, supportsCod: false },
    SMAD: { requiresAccessPoint: true, supportsCod: true },
    PRIV: { requiresAccessPoint: false, supportsCod: false },
    PRID: { requiresAccessPoint: false, supportsCod: true },
  }

const getPplOptionSettings = (
  productType: unknown
):
  | { productType: SupportedPplProductType; settings: PplOptionSettings }
  | undefined => {
  if (
    typeof productType !== "string" ||
    !Object.hasOwn(PPL_OPTION_SETTINGS, productType)
  ) {
    return
  }

  const supportedProductType = productType as SupportedPplProductType
  return {
    productType: supportedProductType,
    settings: PPL_OPTION_SETTINGS[supportedProductType],
  }
}

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return
  }

  const normalizedValue = value.trim()
  return normalizedValue || undefined
}

const normalizeCountryCode = (value: unknown): string | undefined => {
  const normalizedValue = normalizeOptionalString(value)?.toUpperCase()
  return normalizedValue && COUNTRY_CODE_PATTERN.test(normalizedValue)
    ? normalizedValue
    : undefined
}

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
    const option = getPplOptionSettings(data.product_type)
    if (!option) {
      return false
    }

    if (
      data.requires_access_point !== undefined &&
      data.requires_access_point !== option.settings.requiresAccessPoint
    ) {
      return false
    }

    return (
      data.supports_cod === undefined ||
      data.supports_cod === option.settings.supportsCod
    )
  }

  /**
   * Called during checkout when customer selects shipping method
   * Validates and stores access point selection from PPL Widget
   */
  override async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    // Check if PPL is enabled (blocks checkout with stale shipping options)
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PPL shipping is currently unavailable. Please select a different shipping method."
      )
    }

    const option = getPplOptionSettings(optionData.product_type)
    if (!option) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Invalid shipping option product type"
      )
    }

    const accessPointId = normalizeOptionalString(data.access_point_id)

    let canonicalAccessPoint:
      | Awaited<ReturnType<PplClientModuleService["getAccessPoints"]>>[number]
      | undefined

    if (option.settings.requiresAccessPoint) {
      if (!accessPointId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PPL: Access point (pickup location) is required for this shipping method"
        )
      }

      if (accessPointId.length > PPL_ACCESS_POINT_ID_MAX_LENGTH) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PPL: Access point identifier is too long"
        )
      }

      const countryCode = normalizeCountryCode(
        context.shipping_address?.country_code
      )
      if (!countryCode) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PPL: Cart shipping country is required before selecting an access point"
        )
      }

      const accessPoints = await this.getClient().getAccessPoints({
        accessPointCode: accessPointId,
        countryCode,
        limit: 2,
      })
      canonicalAccessPoint = accessPoints.find(
        (candidate) => candidate.code === accessPointId
      )
      if (
        !canonicalAccessPoint ||
        canonicalAccessPoint.isActive === false ||
        normalizeCountryCode(canonicalAccessPoint.address.country) !==
          countryCode
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PPL: Access point is inactive or unavailable for the cart shipping country"
        )
      }

      this.logger_.debug(`PPL: Access point selected: ${accessPointId}`)
    }

    const validatedData: PplShippingOptionData = {
      product_type: option.productType,
      requires_access_point: option.settings.requiresAccessPoint,
      supports_cod: option.settings.supportsCod,
    }

    if (!canonicalAccessPoint) {
      return validatedData
    }

    return {
      ...validatedData,
      access_point_id: canonicalAccessPoint.code,
      access_point_name: normalizeOptionalString(canonicalAccessPoint.name),
      access_point_type: canonicalAccessPoint.accessPointType,
      access_point_street: normalizeOptionalString(
        canonicalAccessPoint.address.street
      ),
      access_point_city: normalizeOptionalString(
        canonicalAccessPoint.address.city
      ),
      access_point_zip: normalizeOptionalString(
        canonicalAccessPoint.address.zipCode
      ),
      access_point_country: normalizeCountryCode(
        canonicalAccessPoint.address.country
      ),
    }
  }

  override async createFulfillment(
    data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    const shippingData = data as unknown as PplShippingOptionData
    const option = getPplOptionSettings(shippingData.product_type)
    if (!option) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Invalid shipping option product type"
      )
    }

    const productType = option.productType
    const accessPointId = normalizeOptionalString(shippingData.access_point_id)
    const supportsCod = option.settings.supportsCod

    if (option.settings.requiresAccessPoint && !accessPointId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Access point (pickup location) is required for this shipping method"
      )
    }

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

    if (!fulfillment.id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "PPL: Fulfillment id is required before carrier shipment creation"
      )
    }

    const recipient = this.buildRecipient(order.shipping_address, order.email)
    const countryCode = recipient.country

    if (
      option.settings.requiresAccessPoint &&
      normalizeCountryCode(shippingData.access_point_country) !== countryCode
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: Access point country does not match the order shipping country. Select the access point again."
      )
    }

    const codSettings = supportsCod
      ? await this.buildCodSettings(order, countryCode)
      : undefined

    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PPL: Service is disabled or not configured. Enable it in Settings → PPL."
      )
    }
    const reference = getPplConfigReference(config)
    const sender = await this.getSenderAddress(reference, config)
    const fulfillmentId = fulfillment.id
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

    const batchId = reference
      ? await this.getClient().createShipmentBatch(
          [shipmentRequest],
          undefined,
          reference
        )
      : await this.getClient().createShipmentBatch([shipmentRequest])

    this.logger_.info(
      `PPL: Batch ${batchId} created. Status updated by ppl-label-sync job.`
    )

    return {
      data: {
        status: "pending",
        batch_id: batchId,
        product_type: productType,
        ...(accessPointId && {
          access_point_id: accessPointId,
          access_point_name: shippingData.access_point_name,
          access_point_street: shippingData.access_point_street,
          access_point_city: shippingData.access_point_city,
          access_point_zip: shippingData.access_point_zip,
          access_point_country: shippingData.access_point_country,
        }),
        ...(reference?.config_id ? { config_id: reference.config_id } : {}),
        ...(reference?.environment
          ? { environment: reference.environment }
          : {}),
      } satisfies PplFulfillmentData,
      labels: [],
    }
  }

  private async getSenderAddress(
    reference: PplConfigReference | undefined,
    config: PplOptions
  ) {
    let sender: PplShipmentRequest["sender"] | undefined
    const customerAddresses =
      await this.getClient().getCustomerAddresses(reference)
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
        "PPL: Using the fallback sender address configured in Settings → PPL"
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
    const fulfillmentData = data as unknown as PplFulfillmentData
    const reference = getPplConfigReference(fulfillmentData)
    let shipmentNumber = fulfillmentData.shipment_number
    const batchId = fulfillmentData.batch_id

    // If no shipment_number yet, try to fetch it from PPL batch status
    // (batch may have been processed since fulfillment was created)
    if (!shipmentNumber && batchId) {
      this.logger_.info(
        `PPL: No shipment_number in fulfillment data, checking batch ${batchId} status`
      )

      const batchStatus = reference
        ? await this.getClient().getBatchStatus(batchId, reference)
        : await this.getClient().getBatchStatus(batchId)
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
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `PPL: Shipment cannot be cancelled yet because batch ${batchId || "unknown"} has not produced a shipment number. Retry after PPL processes the batch.`
      )
    }

    this.logger_.info(`PPL: Attempting to cancel shipment ${shipmentNumber}`)

    const cancelled = reference
      ? await this.getClient().cancelShipment(shipmentNumber, reference)
      : await this.getClient().cancelShipment(shipmentNumber)

    if (!cancelled) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `PPL: Shipment ${shipmentNumber} was not cancelled by the carrier. It may already have been picked up.`
      )
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
    const fulfillmentData = data as unknown as PplFulfillmentData
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
    const data = fulfillmentData as unknown as PplFulfillmentData

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
    if (
      codAmount == null ||
      typeof codAmount !== "number" ||
      !Number.isFinite(codAmount) ||
      codAmount <= 0
    ) {
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
        ? { iban: config.cod_iban, swift: config.cod_swift }
        : {
            bankAccount: config.cod_bank_account,
            bankCode: config.cod_bank_code,
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

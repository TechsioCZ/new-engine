import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  IFileModuleService,
  Logger,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import {
  AbstractFulfillmentProviderService,
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  PACKETA_CLIENT_MODULE,
  type PacketaClientModuleService,
} from "../packeta-client"
import type {
  PacketaFulfillmentData,
  PacketaOptions,
  PacketaPacketAttributes,
  PacketaShippingOptionData,
} from "../packeta-client/types"

type InjectedDependencies = {
  logger: Logger
  [Modules.FILE]: IFileModuleService
  [ContainerRegistrationKeys.QUERY]?: QueryService
} & Record<typeof PACKETA_CLIENT_MODULE, PacketaClientModuleService>

const DEFAULT_PACKET_WEIGHT_KG = 0.5
const GRAMS_PER_KG = 1000
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

type QueryService = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data: unknown[] }>
}

type ProductWeightRecord = {
  id: string
  weight?: unknown
}

type OrderLineItemWithWeight = {
  id?: string
  quantity?: unknown
  product_id?: string | null
  variant?: {
    weight?: unknown
    product?: {
      id?: string | null
      weight?: unknown
    } | null
  } | null
}

type FulfillmentItemWithQuantity = {
  line_item_id?: string | null
  quantity?: unknown
}

type PacketaOptionCode = PacketaShippingOptionData["code"]

type PacketaOptionSettings = {
  requiresAccessPoint: true
  supportsCod: boolean
}

const PACKETA_OPTION_SETTINGS: Record<
  PacketaOptionCode,
  PacketaOptionSettings
> = {
  z_point: { requiresAccessPoint: true, supportsCod: false },
  z_point_cod: { requiresAccessPoint: true, supportsCod: true },
}

const getPacketaOptionSettings = (
  code: unknown
): { code: PacketaOptionCode; settings: PacketaOptionSettings } | undefined => {
  if (
    typeof code !== "string" ||
    !Object.hasOwn(PACKETA_OPTION_SETTINGS, code)
  ) {
    return
  }

  const optionCode = code as PacketaOptionCode
  return { code: optionCode, settings: PACKETA_OPTION_SETTINGS[optionCode] }
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

const getPacketaAccessPointId = (value: unknown): number | undefined => {
  if (typeof value === "string" && !value.trim()) {
    return
  }

  const parsedValue = typeof value === "string" ? Number(value.trim()) : value
  return typeof parsedValue === "number" &&
    Number.isSafeInteger(parsedValue) &&
    parsedValue > 0
    ? parsedValue
    : undefined
}

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (value && typeof value === "object" && "value" in value) {
    return toFiniteNumber((value as { value: unknown }).value)
  }

  return
}

const medusaWeightGramsToKg = (weight: number): number => weight / GRAMS_PER_KG

const PACKETA_COD_CURRENCIES = new Set(["CZK", "EUR", "HUF", "PLN", "RON"])

const getOrderItemRawWeight = (
  orderItem: OrderLineItemWithWeight,
  productWeights: Map<string, unknown>
): number | undefined =>
  toFiniteNumber(orderItem.variant?.weight) ??
  toFiniteNumber(orderItem.variant?.product?.weight) ??
  (orderItem.product_id
    ? toFiniteNumber(productWeights.get(orderItem.product_id))
    : undefined)

/**
 * Packeta Fulfillment Provider
 *
 * Z-Point (pickup-point) shipments only, with optional COD. No home delivery.
 *
 * Unlike PPL, Packeta's createPacket API is synchronous: the call returns a
 * barcode + packet ID immediately, and the label PDF is fetchable right away.
 * This means we can create the label file during createFulfillment without a
 * separate background sync job.
 */
export const PACKETA_PROVIDER_IDENTIFIER = "packeta"

class PacketaFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static override identifier = PACKETA_PROVIDER_IDENTIFIER

  protected readonly logger_: Logger
  protected readonly packetaClient_: PacketaClientModuleService
  protected readonly fileService_: IFileModuleService
  protected readonly query_?: QueryService

  constructor(container: InjectedDependencies, _options: PacketaOptions) {
    super()
    this.logger_ = container.logger
    this.packetaClient_ = container[PACKETA_CLIENT_MODULE]
    this.fileService_ = container[Modules.FILE]
    this.query_ = container[ContainerRegistrationKeys.QUERY]
  }

  private getClient(): PacketaClientModuleService {
    if (!this.packetaClient_) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta: packeta_client module not available. Check medusa-config dependencies."
      )
    }
    return this.packetaClient_
  }

  // ============================================
  // Shipping options
  // ============================================

  override async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    try {
      const config = await this.getClient().getEffectiveConfig()
      if (!config) {
        return []
      }
    } catch (error) {
      this.logger_.warn(
        `Packeta: Could not check config status, returning no options: ${error instanceof Error ? error.message : String(error)}`
      )
      return []
    }

    return [
      {
        id: "packeta-z-point",
        name: "Packeta Z-Point (pickup point)",
        code: "z_point",
        requires_access_point: true,
        supports_cod: false,
      },
      {
        id: "packeta-z-point-cod",
        name: "Packeta Z-Point + COD",
        code: "z_point_cod",
        requires_access_point: true,
        supports_cod: true,
      },
    ]
  }

  override async validateOption(
    data: Record<string, unknown>
  ): Promise<boolean> {
    const option = getPacketaOptionSettings(data.code)
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
   * Called during checkout when the customer finalises the shipping method.
   * Validates that a Packeta pickup-point was selected by the widget.
   */
  override async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta shipping is currently unavailable. Please select a different shipping method."
      )
    }

    if (data.access_point_id === undefined || data.access_point_id === null) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Pickup point (Z-Point) selection is required for this shipping method"
      )
    }

    const accessPointId = getPacketaAccessPointId(data.access_point_id)
    if (!accessPointId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Packeta: Invalid pickup point ID: ${String(data.access_point_id)}`
      )
    }

    const option = getPacketaOptionSettings(optionData.code)
    if (!option) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Invalid shipping option code"
      )
    }

    const countryCode = normalizeCountryCode(
      context.shipping_address?.country_code
    )
    if (!countryCode) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Cart shipping country is required before selecting a pickup point"
      )
    }

    const branches = await this.getClient().getBranches()
    const branch = branches.find(
      (candidate) => getPacketaAccessPointId(candidate.id) === accessPointId
    )
    if (!branch || normalizeCountryCode(branch.country) !== countryCode) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Pickup point is unavailable for the cart shipping country"
      )
    }

    return {
      code: option.code,
      requires_access_point: option.settings.requiresAccessPoint,
      supports_cod: option.settings.supportsCod,
      access_point_id: accessPointId,
      access_point_name: normalizeOptionalString(branch.name),
      access_point_street:
        normalizeOptionalString(branch.street) ??
        normalizeOptionalString(branch.nameStreet),
      access_point_type: normalizeOptionalString(branch.branchType),
      access_point_zip: normalizeOptionalString(branch.zip),
      access_point_city: normalizeOptionalString(branch.city),
      access_point_country: countryCode,
    } satisfies PacketaShippingOptionData
  }

  override async createFulfillment(
    data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    const rawShippingData = data as unknown as PacketaShippingOptionData
    const option = getPacketaOptionSettings(rawShippingData.code)
    const accessPointId = getPacketaAccessPointId(
      rawShippingData.access_point_id
    )

    if (!option) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Invalid shipping option code"
      )
    }

    if (!accessPointId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: access_point_id is required"
      )
    }

    const shippingData: PacketaShippingOptionData = {
      ...rawShippingData,
      code: option.code,
      requires_access_point: option.settings.requiresAccessPoint,
      supports_cod: option.settings.supportsCod,
      access_point_id: accessPointId,
    }

    if (!order) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Order is required for fulfillment"
      )
    }
    if (!order.shipping_address) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Shipping address is required"
      )
    }

    const shippingCountryCode = normalizeCountryCode(
      order.shipping_address.country_code
    )
    if (
      !shippingCountryCode ||
      normalizeCountryCode(shippingData.access_point_country) !==
        shippingCountryCode
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Pickup point country does not match the order shipping country. Select the pickup point again."
      )
    }
    if (!fulfillment.id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Packeta: Fulfillment id is required before carrier packet creation"
      )
    }
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta: Service is disabled or not configured. Enable it in Settings → Packeta."
      )
    }

    const attributes = await this.buildPacketAttributes({
      order,
      shippingAddress: order.shipping_address,
      fulfillmentId: fulfillment.id,
      accessPointId,
      shippingData,
      items: _items,
      config,
    })

    const fulfillmentId = fulfillment.id
    this.logger_.info(
      `Packeta: Creating packet for ${fulfillmentId}, access point ${shippingData.access_point_id}`
    )

    const configReference = {
      config_id: config.config_id,
      environment: config.environment,
    }
    const result = await this.getClient().createPacket(
      attributes,
      configReference
    )
    const trackingUrl = `https://tracking.packeta.com/${result.barcode}`

    let labelUrl: string | undefined
    try {
      const pdfBuffer = await this.getClient().downloadLabelPdf(
        result.id,
        undefined,
        undefined,
        configReference
      )
      const uploaded = await this.fileService_.createFiles([
        {
          filename: `packeta-label-${result.barcode}.pdf`,
          mimeType: "application/pdf",
          content: pdfBuffer.toString("base64"),
        },
      ])
      labelUrl = uploaded[0]?.url
    } catch (error) {
      this.logger_.warn(
        `Packeta: Packet ${result.id} created (barcode ${result.barcode}) but label download/upload failed: ${error instanceof Error ? error.message : String(error)}. The label can be retrieved later from Packeta directly.`
      )
    }

    const fulfillmentData: PacketaFulfillmentData = {
      status: "completed",
      packet_id: result.id,
      barcode: result.barcode,
      access_point_id: accessPointId,
      access_point_name: shippingData.access_point_name,
      access_point_street: shippingData.access_point_street,
      access_point_city: shippingData.access_point_city,
      access_point_zip: shippingData.access_point_zip,
      access_point_country: shippingData.access_point_country,
      supports_cod: shippingData.supports_cod,
      config_id: config.config_id,
      environment: config.environment,
      ...(labelUrl && { label_url: labelUrl }),
      tracking_url: trackingUrl,
    }

    return {
      data: fulfillmentData,
      labels: labelUrl
        ? [
            {
              tracking_number: result.barcode,
              tracking_url: trackingUrl,
              label_url: labelUrl,
            },
          ]
        : [],
    }
  }

  override async cancelFulfillment(
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const fulfillmentData = data as unknown as PacketaFulfillmentData
    const packetId = fulfillmentData.packet_id

    if (!packetId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Fulfillment has no packet identifier and cannot be cancelled"
      )
    }

    const cancelled = await this.getClient().cancelPacket(packetId, {
      config_id: fulfillmentData.config_id,
      environment: fulfillmentData.environment,
    })
    if (!cancelled) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Packeta: Packet ${packetId} was not cancelled by the carrier. It may already have been picked up.`
      )
    }
    return { cancelled: true, packet_id: packetId }
  }

  override async createReturnFulfillment(
    _fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Packeta: Return fulfillment not yet implemented."
    )
  }

  override async canCalculate(
    _data: CreateShippingOptionDTO
  ): Promise<boolean> {
    return false
  }

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

  // @ts-expect-error Base class returns never[] but we return actual documents
  override async getFulfillmentDocuments(
    data: Record<string, unknown>
  ): Promise<{ type: string; url: string; format?: string }[]> {
    const fulfillmentData = data as unknown as PacketaFulfillmentData
    const documents: { type: string; url: string; format?: string }[] = []

    if (fulfillmentData.label_url) {
      documents.push({
        type: "label",
        url: fulfillmentData.label_url,
        format: "pdf",
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

  // @ts-expect-error Base class returns void but we return document or null
  override async retrieveDocuments(
    fulfillmentData: Record<string, unknown>,
    documentType: string
  ): Promise<{ type: string; url: string; format?: string } | null> {
    const data = fulfillmentData as unknown as PacketaFulfillmentData

    switch (documentType) {
      case "label":
        return data.label_url
          ? { type: "label", url: data.label_url, format: "pdf" }
          : null
      case "tracking":
        return data.tracking_url
          ? { type: "tracking", url: data.tracking_url }
          : null
      default:
        return null
    }
  }

  override async getReturnDocuments(
    _data: Record<string, unknown>
  ): Promise<never[]> {
    return []
  }

  override async getShipmentDocuments(
    _data: Record<string, unknown>
  ): Promise<never[]> {
    return []
  }

  // ============================================
  // Internal helpers
  // ============================================

  private async buildPacketAttributes(params: {
    order: Partial<FulfillmentOrderDTO>
    shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
    fulfillmentId: string
    accessPointId: number
    shippingData: PacketaShippingOptionData
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[]
    config: PacketaOptions
  }): Promise<PacketaPacketAttributes> {
    const {
      order,
      shippingAddress,
      fulfillmentId,
      accessPointId,
      shippingData,
      items,
      config,
    } = params

    const recipient = this.getRequiredRecipientName(shippingAddress)
    const totalNumber = this.getPacketOrderTotal(order, shippingData)
    const packetWeight = await this.getPacketWeight(order, items, shippingData)

    if (packetWeight === DEFAULT_PACKET_WEIGHT_KG) {
      this.logger_.warn(
        `Packeta: Falling back to default packet weight ${DEFAULT_PACKET_WEIGHT_KG}kg for fulfillment ${fulfillmentId}. Fill product or variant weight in Medusa to send an exact parcel weight.`
      )
    }

    const attributes = this.buildBasePacketAttributes({
      accessPointId,
      config,
      currency: this.getPacketCurrency(order, shippingData),
      order,
      orderNumber: fulfillmentId,
      packetWeight,
      recipient,
      shippingAddress,
      totalNumber,
    })

    if (shippingData.supports_cod) {
      this.validateCodAmount(totalNumber, attributes.currency)
      attributes.cod = totalNumber
    }

    return attributes
  }

  private getRequiredRecipientName(
    shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
  ): { firstName: string; lastName: string } {
    const firstName = shippingAddress.first_name ?? ""
    const lastName = shippingAddress.last_name ?? ""

    if (firstName || lastName) {
      return { firstName, lastName }
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Packeta: Shipping address first_name or last_name is required"
    )
  }

  private validateCodAmount(amount: number, currency: string): void {
    if (amount <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: COD amount must be positive"
      )
    }

    if (!PACKETA_COD_CURRENCIES.has(currency)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Packeta: Currency ${currency} is not supported for COD shipments`
      )
    }

    if (currency === "CZK" && !Number.isInteger(amount)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: CZK COD amount must be a whole number"
      )
    }

    if (currency === "HUF" && (!Number.isInteger(amount) || amount % 5 !== 0)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: HUF COD amount must be a whole-number multiple of 5"
      )
    }

    const amountInMinorUnits = amount * 100
    const nearestMinorUnit = Math.round(amountInMinorUnits)
    if (Math.abs(amountInMinorUnits - nearestMinorUnit) > 1e-7) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: COD amount cannot have more than two decimal places"
      )
    }
  }

  private getPacketOrderTotal(
    order: Partial<FulfillmentOrderDTO>,
    shippingData: PacketaShippingOptionData
  ): number {
    const orderTotal =
      toFiniteNumber(order.total) ??
      toFiniteNumber((order as { item_total?: unknown }).item_total)

    if (
      orderTotal !== undefined &&
      (!shippingData.supports_cod || orderTotal > 0)
    ) {
      return orderTotal
    }

    if (!shippingData.supports_cod) {
      return 1
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Packeta: a positive order total or item_total is required for COD shipments"
    )
  }

  private async getPacketWeight(
    order: Partial<FulfillmentOrderDTO>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    shippingData: PacketaShippingOptionData
  ): Promise<number> {
    return (
      toFiniteNumber((shippingData as { weight?: unknown }).weight) ??
      (await this.calculateOrderItemsWeightKg(order, items)) ??
      DEFAULT_PACKET_WEIGHT_KG
    )
  }

  private getPacketCurrency(
    order: Partial<FulfillmentOrderDTO>,
    shippingData: PacketaShippingOptionData
  ): string {
    const currency = order.currency_code?.toUpperCase()

    if (currency) {
      return currency
    }

    if (!shippingData.supports_cod) {
      return "CZK"
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Packeta: currency_code is required on the order for COD shipments"
    )
  }

  private buildBasePacketAttributes(params: {
    order: Partial<FulfillmentOrderDTO>
    shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
    accessPointId: number
    config: PacketaOptions
    currency: string
    orderNumber: string
    packetWeight: number
    recipient: { firstName: string; lastName: string }
    totalNumber: number
  }): PacketaPacketAttributes {
    const {
      order,
      shippingAddress,
      accessPointId,
      config,
      currency,
      orderNumber,
      packetWeight,
      recipient,
      totalNumber,
    } = params

    return {
      number: orderNumber,
      name: recipient.firstName,
      surname: recipient.lastName,
      email: order.email ?? undefined,
      phone: shippingAddress.phone ?? undefined,
      addressId: accessPointId,
      value: totalNumber,
      currency,
      weight: packetWeight,
      eshop: config.sender_label ?? undefined,
    }
  }

  private async calculateOrderItemsWeightKg(
    order: Partial<FulfillmentOrderDTO>,
    fulfillmentItems: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[]
  ): Promise<number | undefined> {
    const orderItems = (order.items ?? []) as OrderLineItemWithWeight[]
    if (!orderItems.length) {
      return
    }

    const productWeights = await this.getProductWeights(orderItems)
    const orderItemsById = new Map(
      orderItems
        .filter((item): item is OrderLineItemWithWeight & { id: string } =>
          Boolean(item.id)
        )
        .map((item) => [item.id, item])
    )

    const itemsToWeigh =
      fulfillmentItems.length > 0
        ? (fulfillmentItems as FulfillmentItemWithQuantity[])
        : orderItems.map((item) => ({
            line_item_id: item.id,
            quantity: item.quantity,
          }))

    let totalWeightKg = 0
    for (const item of itemsToWeigh) {
      if (!item.line_item_id) {
        continue
      }

      const orderItem = orderItemsById.get(item.line_item_id)
      if (!orderItem) {
        continue
      }

      const rawWeight = getOrderItemRawWeight(orderItem, productWeights)

      if (rawWeight === undefined || rawWeight <= 0) {
        continue
      }

      const quantity =
        toFiniteNumber(item.quantity) ?? toFiniteNumber(orderItem.quantity) ?? 1
      totalWeightKg += medusaWeightGramsToKg(rawWeight) * quantity
    }

    return totalWeightKg > 0 ? totalWeightKg : undefined
  }

  private async getProductWeights(
    orderItems: OrderLineItemWithWeight[]
  ): Promise<Map<string, unknown>> {
    const productIds = [
      ...new Set(
        orderItems
          .map(
            (item) => item.product_id ?? item.variant?.product?.id ?? undefined
          )
          .filter((id): id is string => Boolean(id))
      ),
    ]

    if (!this.query_ || productIds.length === 0) {
      return new Map()
    }

    const { data } = await this.query_.graph({
      entity: "product",
      fields: ["id", "weight"],
      filters: {
        id: productIds,
      },
    })

    return new Map(
      (data as ProductWeightRecord[]).map((product) => [
        product.id,
        product.weight,
      ])
    )
  }
}

export default PacketaFulfillmentProviderService

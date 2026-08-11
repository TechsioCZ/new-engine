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
    return data.code === "z_point" || data.code === "z_point_cod"
  }

  /**
   * Called during checkout when the customer finalises the shipping method.
   * Validates that a Packeta pickup-point was selected by the widget.
   */
  override async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta shipping is currently unavailable. Please select a different shipping method."
      )
    }

    const accessPointId = data.access_point_id as number | string | undefined
    if (accessPointId === undefined || accessPointId === null) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Pickup point (Z-Point) selection is required for this shipping method"
      )
    }

    const parsedAccessPointId =
      typeof accessPointId === "string"
        ? Number.parseInt(accessPointId, 10)
        : accessPointId
    if (!Number.isFinite(parsedAccessPointId) || parsedAccessPointId <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Packeta: Invalid pickup point ID: ${accessPointId}`
      )
    }
    const optionCode = optionData.code
    if (optionCode !== "z_point" && optionCode !== "z_point_cod") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Invalid shipping option code"
      )
    }

    return {
      code: optionCode,
      requires_access_point: true,
      supports_cod: optionCode === "z_point_cod",
      access_point_id: parsedAccessPointId,
      access_point_name: data.access_point_name as string | undefined,
      access_point_zip: data.access_point_zip as string | undefined,
      access_point_city: data.access_point_city as string | undefined,
    } satisfies PacketaShippingOptionData
  }

  override async createFulfillment(
    data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    const shippingData = data as unknown as PacketaShippingOptionData

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
    if (!shippingData.access_point_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: access_point_id is required"
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
      accessPointId: shippingData.access_point_id,
      shippingData,
      items: _items,
      config,
    })

    const fulfillmentId = fulfillment.id || `temp-${Date.now()}`
    this.logger_.info(
      `Packeta: Creating packet for ${fulfillmentId}, access point ${shippingData.access_point_id}`
    )

    const result = await this.getClient().createPacket(attributes)
    const trackingUrl = `https://tracking.packeta.com/${result.barcode}`

    let labelUrl: string | undefined
    try {
      const pdfBuffer = await this.getClient().downloadLabelPdf(result.id)
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
      access_point_id: shippingData.access_point_id,
      supports_cod: shippingData.supports_cod,
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
      this.logger_.warn(
        "Packeta: Cannot cancel - no packet_id in fulfillment data"
      )
      return { cancelled: false, note: "No packet_id on fulfillment" }
    }

    const cancelled = await this.getClient().cancelPacket(packetId)
    if (!cancelled) {
      return {
        cancelled: false,
        packet_id: packetId,
        note: "Cancellation failed. Packet may have been picked up by carrier. Contact Packeta support.",
      }
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
    accessPointId: number
    shippingData: PacketaShippingOptionData
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[]
    config: PacketaOptions
  }): Promise<PacketaPacketAttributes> {
    const {
      order,
      shippingAddress,
      accessPointId,
      shippingData,
      items,
      config,
    } = params

    const recipient = this.getRequiredRecipientName(shippingAddress)
    const orderNumber = this.getPacketOrderNumber(order)
    const totalNumber = this.getPacketOrderTotal(order, shippingData)
    const packetWeight = await this.getPacketWeight(order, items, shippingData)

    if (packetWeight === DEFAULT_PACKET_WEIGHT_KG) {
      this.logger_.warn(
        `Packeta: Falling back to default packet weight ${DEFAULT_PACKET_WEIGHT_KG}kg for order ${orderNumber}. Fill product or variant weight in Medusa to send an exact parcel weight.`
      )
    }

    const attributes = this.buildBasePacketAttributes({
      accessPointId,
      config,
      currency: this.getPacketCurrency(order, shippingData),
      order,
      orderNumber,
      packetWeight,
      recipient,
      shippingAddress,
      totalNumber,
    })

    if (shippingData.supports_cod) {
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

  private getPacketOrderNumber(order: Partial<FulfillmentOrderDTO>): string {
    return (
      order.display_id?.toString() || order.id || `fulfillment-${Date.now()}`
    )
  }

  private getPacketOrderTotal(
    order: Partial<FulfillmentOrderDTO>,
    shippingData: PacketaShippingOptionData
  ): number {
    const orderTotal =
      toFiniteNumber(order.total) ??
      toFiniteNumber((order as { item_total?: unknown }).item_total)

    if (orderTotal !== undefined) {
      return orderTotal
    }

    if (!shippingData.supports_cod) {
      return 1
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Packeta: order total or item_total is required for COD shipments"
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

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
  IFulfillmentProvider,
  Logger,
  Query,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { PACKETA_CLIENT_MODULE } from "../packeta-client"
import type { PacketaClientModuleService } from "../packeta-client"
import type {
  PacketaFulfillmentData,
  PacketaOptions,
  PacketaPacketAttributes,
  PacketaShippingOptionData,
} from "../packeta-client/types"

type PacketaClientDependency = Pick<
  PacketaClientModuleService,
  "cancelPacket" | "createPacket" | "downloadLabelPdf" | "getEffectiveConfig"
>
type FileServiceDependency = Pick<IFileModuleService, "createFiles">
type QueryDependency = Pick<Query, "graph">

interface InjectedDependencies {
  logger: Logger
  [Modules.FILE]: FileServiceDependency
  [ContainerRegistrationKeys.QUERY]?: QueryDependency
  [PACKETA_CLIENT_MODULE]?: PacketaClientDependency
}

const DEFAULT_PACKET_WEIGHT_KG = 0.5
const GRAMS_PER_KG = 1000

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (typeof value === "object" && value !== null) {
    return toFiniteNumber(Reflect.get(value, "value"))
  }

  return undefined
}

const optionalStringSchema = z
  .unknown()
  .transform((value) => (typeof value === "string" ? value : undefined))
const optionalFiniteNumberSchema = z.unknown().transform(toFiniteNumber)

const packetaOptionSchema = z.object({
  code: z.enum(["z_point", "z_point_cod"]),
})

const checkoutDataSchema = z.object({
  access_point_city: optionalStringSchema,
  access_point_id: z.unknown(),
  access_point_name: optionalStringSchema,
  access_point_zip: optionalStringSchema,
})

const packetaShippingDataSchema = z.object({
  access_point_id: z.number().optional(),
  code: z.enum(["z_point", "z_point_cod"]),
  requires_access_point: z.literal(true),
  supports_cod: z.boolean(),
  weight: optionalFiniteNumberSchema.optional(),
})

type PacketaShippingData = z.infer<typeof packetaShippingDataSchema>

const packetaFulfillmentDataSchema = z.object({
  label_url: optionalStringSchema.optional(),
  packet_id: z.number().optional(),
  tracking_url: optionalStringSchema.optional(),
})

type StoredPacketaFulfillmentData = z.infer<typeof packetaFulfillmentDataSchema>

const orderLineItemWeightSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().nullish(),
  quantity: optionalFiniteNumberSchema,
  variant: z
    .object({
      product: z
        .object({
          id: z.string().nullish(),
          weight: optionalFiniteNumberSchema,
        })
        .nullish(),
      weight: optionalFiniteNumberSchema,
    })
    .nullish(),
})

type OrderLineItemWithWeight = z.infer<typeof orderLineItemWeightSchema>

interface FulfillmentDocument {
  format?: string
  type: string
  url: string
}

type CancellationResult =
  | { cancelled: true; packet_id: number }
  | { cancelled: false; note: string; packet_id?: number }

const getPacketaFulfillmentData = (
  data: unknown,
): StoredPacketaFulfillmentData => {
  const parsed = packetaFulfillmentDataSchema.safeParse(data)
  return parsed.success ? parsed.data : {}
}

const buildFulfillmentDocuments = (data: unknown): FulfillmentDocument[] => {
  const fulfillmentData = getPacketaFulfillmentData(data)
  const documents: FulfillmentDocument[] = []

  if (fulfillmentData.label_url !== undefined) {
    documents.push({
      format: "pdf",
      type: "label",
      url: fulfillmentData.label_url,
    })
  }
  if (fulfillmentData.tracking_url !== undefined) {
    documents.push({
      type: "tracking",
      url: fulfillmentData.tracking_url,
    })
  }

  return documents
}

const retrieveFulfillmentDocument = (
  fulfillmentData: unknown,
  documentType: string,
): FulfillmentDocument | null => {
  const data = getPacketaFulfillmentData(fulfillmentData)

  switch (documentType) {
    case "label": {
      return data.label_url === undefined
        ? null
        : { format: "pdf", type: "label", url: data.label_url }
    }
    case "tracking": {
      return data.tracking_url === undefined
        ? null
        : { type: "tracking", url: data.tracking_url }
    }
    default: {
      return null
    }
  }
}

const medusaWeightGramsToKg = (weight: number): number => weight / GRAMS_PER_KG

const getOrderItemRawWeight = (
  orderItem: OrderLineItemWithWeight,
  productWeights: Map<string, number | null>,
): number | undefined => {
  const variantWeight = toFiniteNumber(orderItem.variant?.weight)
  if (variantWeight !== undefined) {
    return variantWeight
  }

  const variantProductWeight = toFiniteNumber(
    orderItem.variant?.product?.weight,
  )
  if (variantProductWeight !== undefined) {
    return variantProductWeight
  }

  const productId = orderItem.product_id
  return productId === undefined || productId === null
    ? undefined
    : toFiniteNumber(productWeights.get(productId))
}

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

/**
 * The framework's abstract provider currently narrows document methods below
 * the canonical `IFulfillmentProvider` contract. Implementing that contract
 * directly keeps the real document results typed while the discovery marker
 * preserves Medusa's runtime provider identification.
 */
class PacketaFulfillmentProviderService implements IFulfillmentProvider {
  static readonly _isFulfillmentService = true
  static readonly identifier = PACKETA_PROVIDER_IDENTIFIER

  protected readonly identifier = PACKETA_PROVIDER_IDENTIFIER
  protected readonly logger: Logger
  protected readonly packetaClient: PacketaClientDependency | undefined
  protected readonly fileService: FileServiceDependency
  protected readonly query: QueryDependency | undefined

  constructor(container: InjectedDependencies, _options: PacketaOptions) {
    this.logger = container.logger
    this.packetaClient = container[PACKETA_CLIENT_MODULE]
    this.fileService = container[Modules.FILE]
    this.query = container[ContainerRegistrationKeys.QUERY]
  }

  getIdentifier(): string {
    return this.identifier
  }

  private getClient(): PacketaClientDependency {
    if (!this.packetaClient) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta: packeta_client module not available. Check medusa-config dependencies.",
      )
    }
    return this.packetaClient
  }

  // ============================================
  // Shipping options
  // ============================================

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    try {
      const config = await this.getClient().getEffectiveConfig()
      if (!config) {
        return []
      }
    } catch (error) {
      this.logger.warn(
        `Packeta: Could not check config status, returning no options: ${error instanceof Error ? error.message : String(error)}`,
      )
      return []
    }

    return [
      {
        code: "z_point",
        id: "packeta-z-point",
        name: "Packeta Z-Point (pickup point)",
        requires_access_point: true,
        supports_cod: false,
      },
      {
        code: "z_point_cod",
        id: "packeta-z-point-cod",
        name: "Packeta Z-Point + COD",
        requires_access_point: true,
        supports_cod: true,
      },
    ]
  }

  async validateOption(data: unknown): Promise<boolean> {
    await Promise.resolve(this)
    return packetaOptionSchema.safeParse(data).success
  }

  /**
   * Called during checkout when the customer finalises the shipping method.
   * Validates that a Packeta pickup-point was selected by the widget.
   */
  async validateFulfillmentData(
    optionData: unknown,
    data: unknown,
    _context: ValidateFulfillmentDataContext,
  ): Promise<PacketaShippingOptionData> {
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta shipping is currently unavailable. Please select a different shipping method.",
      )
    }

    const checkoutResult = checkoutDataSchema.safeParse(data)
    if (!checkoutResult.success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Pickup point (Z-Point) selection is required for this shipping method",
      )
    }
    const accessPointId = checkoutResult.data.access_point_id
    if (accessPointId === undefined || accessPointId === null) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Pickup point (Z-Point) selection is required for this shipping method",
      )
    }

    const parsedAccessPointId =
      typeof accessPointId === "string"
        ? Math.trunc(Number(accessPointId))
        : accessPointId
    if (
      typeof parsedAccessPointId !== "number" ||
      !Number.isFinite(parsedAccessPointId) ||
      parsedAccessPointId <= 0
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Invalid pickup point ID",
      )
    }

    const optionResult = packetaOptionSchema.safeParse(optionData)
    if (!optionResult.success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Invalid shipping option code",
      )
    }
    const optionCode = optionResult.data.code

    const validatedData: PacketaShippingOptionData = {
      access_point_id: parsedAccessPointId,
      code: optionCode,
      requires_access_point: true,
      supports_cod: optionCode === "z_point_cod",
    }
    const { access_point_city, access_point_name, access_point_zip } =
      checkoutResult.data

    if (access_point_name !== undefined) {
      validatedData.access_point_name = access_point_name
    }
    if (access_point_zip !== undefined) {
      validatedData.access_point_zip = access_point_zip
    }
    if (access_point_city !== undefined) {
      validatedData.access_point_city = access_point_city
    }

    return validatedData
  }

  async createFulfillment(
    data: unknown,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<
      Omit<FulfillmentDTO, "provider_id" | "data" | "items">
    >,
  ): Promise<CreateFulfillmentResult> {
    const shippingDataResult = packetaShippingDataSchema.safeParse(data)
    if (!shippingDataResult.success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Invalid shipping data",
      )
    }
    const shippingData = shippingDataResult.data

    if (!order) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Order is required for fulfillment",
      )
    }
    if (!order.shipping_address) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Shipping address is required",
      )
    }
    if (
      shippingData.access_point_id === undefined ||
      shippingData.access_point_id === 0
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: access_point_id is required",
      )
    }

    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta: Service is disabled or not configured. Enable it in Settings → Packeta.",
      )
    }

    const attributes = await this.buildPacketAttributes({
      accessPointId: shippingData.access_point_id,
      config,
      items: _items,
      order,
      shippingAddress: order.shipping_address,
      shippingData,
    })

    const fulfillmentId = fulfillment.id ?? `temp-${Date.now()}`
    this.logger.info(
      `Packeta: Creating packet for ${fulfillmentId}, access point ${shippingData.access_point_id}`,
    )

    const result = await this.getClient().createPacket(attributes)
    const trackingUrl = `https://tracking.packeta.com/${result.barcode}`

    let labelUrl: string | undefined
    try {
      const pdfBuffer = await this.getClient().downloadLabelPdf(result.id)
      const uploaded = await this.fileService.createFiles([
        {
          content: pdfBuffer.toString("base64"),
          filename: `packeta-label-${result.barcode}.pdf`,
          mimeType: "application/pdf",
        },
      ])
      labelUrl = uploaded[0]?.url
    } catch (error) {
      this.logger.warn(
        `Packeta: Packet ${result.id} created (barcode ${result.barcode}) but label download/upload failed: ${error instanceof Error ? error.message : String(error)}. The label can be retrieved later from Packeta directly.`,
      )
    }

    const fulfillmentData: PacketaFulfillmentData = {
      access_point_id: shippingData.access_point_id,
      barcode: result.barcode,
      packet_id: result.id,
      status: "completed",
      supports_cod: shippingData.supports_cod,
      ...(labelUrl === undefined ? {} : { label_url: labelUrl }),
      tracking_url: trackingUrl,
    }

    return {
      data: { ...fulfillmentData },
      labels:
        labelUrl === undefined
          ? []
          : [
              {
                label_url: labelUrl,
                tracking_number: result.barcode,
                tracking_url: trackingUrl,
              },
            ],
    }
  }

  async cancelFulfillment(data: unknown): Promise<CancellationResult> {
    const fulfillmentData = getPacketaFulfillmentData(data)
    const packetId = fulfillmentData.packet_id

    if (packetId === undefined || packetId === 0) {
      this.logger.warn(
        "Packeta: Cannot cancel - no packet_id in fulfillment data",
      )
      return { cancelled: false, note: "No packet_id on fulfillment" }
    }

    const cancelled = await this.getClient().cancelPacket(packetId)
    if (!cancelled) {
      return {
        cancelled: false,
        note: "Cancellation failed. Packet may have been picked up by carrier. Contact Packeta support.",
        packet_id: packetId,
      }
    }
    return { cancelled: true, packet_id: packetId }
  }

  async createReturnFulfillment(
    _fulfillment: unknown,
  ): Promise<CreateFulfillmentResult> {
    await Promise.resolve(this)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Packeta: Return fulfillment not yet implemented.",
    )
  }

  async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    await Promise.resolve(this)
    return false
  }

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

  async getFulfillmentDocuments(data: unknown): Promise<FulfillmentDocument[]> {
    await Promise.resolve(this)
    return buildFulfillmentDocuments(data)
  }

  async retrieveDocuments(
    fulfillmentData: unknown,
    documentType: string,
  ): Promise<FulfillmentDocument | null> {
    await Promise.resolve(this)
    return retrieveFulfillmentDocument(fulfillmentData, documentType)
  }

  async getReturnDocuments(_data: unknown): Promise<never[]> {
    await Promise.resolve(this)
    return []
  }

  async getShipmentDocuments(_data: unknown): Promise<never[]> {
    await Promise.resolve(this)
    return []
  }

  // ============================================
  // Internal helpers
  // ============================================

  private async buildPacketAttributes(params: {
    order: Partial<FulfillmentOrderDTO>
    shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
    accessPointId: number
    shippingData: PacketaShippingData
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

    const recipient =
      PacketaFulfillmentProviderService.getRequiredRecipientName(
        shippingAddress,
      )
    const orderNumber =
      PacketaFulfillmentProviderService.getPacketOrderNumber(order)
    const totalNumber = PacketaFulfillmentProviderService.getPacketOrderTotal(
      order,
      shippingData,
    )
    const packetWeight = await this.getPacketWeight(order, items, shippingData)

    if (packetWeight === DEFAULT_PACKET_WEIGHT_KG) {
      this.logger.warn(
        `Packeta: Falling back to default packet weight ${DEFAULT_PACKET_WEIGHT_KG}kg for order ${orderNumber}. Fill product or variant weight in Medusa to send an exact parcel weight.`,
      )
    }

    const attributes =
      PacketaFulfillmentProviderService.buildBasePacketAttributes({
        accessPointId,
        config,
        currency: PacketaFulfillmentProviderService.getPacketCurrency(
          order,
          shippingData,
        ),
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

  private static getRequiredRecipientName(
    shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>,
  ): { firstName: string; lastName: string } {
    const firstName = shippingAddress.first_name ?? ""
    const lastName = shippingAddress.last_name ?? ""

    if (firstName || lastName) {
      return { firstName, lastName }
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Packeta: Shipping address first_name or last_name is required",
    )
  }

  private static getPacketOrderNumber(
    order: Partial<FulfillmentOrderDTO>,
  ): string {
    const displayId = order.display_id?.toString()
    if (displayId !== undefined && displayId !== "") {
      return displayId
    }
    if (order.id !== undefined && order.id !== "") {
      return order.id
    }
    return `fulfillment-${Date.now()}`
  }

  private static getPacketOrderTotal(
    order: Partial<FulfillmentOrderDTO>,
    shippingData: PacketaShippingData,
  ): number {
    const orderTotal =
      toFiniteNumber(order.total) ?? toFiniteNumber(order.item_total)

    if (orderTotal !== undefined) {
      return orderTotal
    }

    if (!shippingData.supports_cod) {
      return 1
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Packeta: order total or item_total is required for COD shipments",
    )
  }

  private async getPacketWeight(
    order: Partial<FulfillmentOrderDTO>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    shippingData: PacketaShippingData,
  ): Promise<number> {
    return (
      shippingData.weight ??
      (await this.calculateOrderItemsWeightKg(order, items)) ??
      DEFAULT_PACKET_WEIGHT_KG
    )
  }

  private static getPacketCurrency(
    order: Partial<FulfillmentOrderDTO>,
    shippingData: PacketaShippingData,
  ): string {
    const currency = order.currency_code?.toUpperCase()

    if (currency !== undefined && currency !== "") {
      return currency
    }

    if (!shippingData.supports_cod) {
      return "CZK"
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Packeta: currency_code is required on the order for COD shipments",
    )
  }

  private static buildBasePacketAttributes(params: {
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

    const attributes: PacketaPacketAttributes = {
      addressId: accessPointId,
      currency,
      name: recipient.firstName,
      number: orderNumber,
      surname: recipient.lastName,
      value: totalNumber,
      weight: packetWeight,
    }

    if (order.email !== undefined && order.email !== "") {
      attributes.email = order.email
    }
    if (shippingAddress.phone !== undefined && shippingAddress.phone !== "") {
      attributes.phone = shippingAddress.phone
    }
    if (config.sender_label !== undefined && config.sender_label !== "") {
      attributes.eshop = config.sender_label
    }

    return attributes
  }

  private async calculateOrderItemsWeightKg(
    order: Partial<FulfillmentOrderDTO>,
    fulfillmentItems: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
  ): Promise<number | undefined> {
    const orderItemsResult = z
      .array(orderLineItemWeightSchema)
      .safeParse(order.items ?? [])
    if (!orderItemsResult.success || orderItemsResult.data.length === 0) {
      return undefined
    }
    const orderItems = orderItemsResult.data

    const productWeights = await this.getProductWeights(orderItems)
    const orderItemsById = new Map<string, OrderLineItemWithWeight>()
    for (const item of orderItems) {
      if (item.id !== undefined && item.id.length > 0) {
        orderItemsById.set(item.id, item)
      }
    }

    const itemsToWeigh =
      fulfillmentItems.length > 0
        ? fulfillmentItems
        : orderItems.map((item) => ({
            line_item_id: item.id,
            quantity: item.quantity,
          }))

    let totalWeightKg = 0
    for (const item of itemsToWeigh) {
      const lineItemId = item.line_item_id
      const orderItem =
        lineItemId === undefined || lineItemId === null || lineItemId === ""
          ? undefined
          : orderItemsById.get(lineItemId)
      const rawWeight =
        orderItem === undefined
          ? undefined
          : getOrderItemRawWeight(orderItem, productWeights)

      if (orderItem !== undefined && rawWeight !== undefined && rawWeight > 0) {
        const quantity = item.quantity ?? orderItem.quantity ?? 1
        totalWeightKg += medusaWeightGramsToKg(rawWeight) * quantity
      }
    }

    return totalWeightKg > 0 ? totalWeightKg : undefined
  }

  private async getProductWeights(
    orderItems: OrderLineItemWithWeight[],
  ): Promise<Map<string, number | null>> {
    const productIds = new Set<string>()
    for (const item of orderItems) {
      const productId = item.product_id ?? item.variant?.product?.id
      if (
        productId !== undefined &&
        productId !== null &&
        productId.length > 0
      ) {
        productIds.add(productId)
      }
    }

    if (this.query === undefined || productIds.size === 0) {
      return new Map()
    }

    const { data } = await this.query.graph({
      entity: "product",
      fields: ["id", "weight"],
      filters: {
        id: [...productIds],
      },
    })

    const productWeights = new Map<string, number | null>()
    for (const product of data) {
      productWeights.set(product.id, product.weight)
    }
    return productWeights
  }
}

export default PacketaFulfillmentProviderService

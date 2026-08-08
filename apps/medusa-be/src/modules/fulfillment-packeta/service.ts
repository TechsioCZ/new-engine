import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  Context,
  CreateFileDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FileDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
  Logger,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import {
  AbstractFulfillmentProviderService,
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

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
  | "cancelPacket"
  | "createPacket"
  | "downloadLabelPdf"
  | "getBranches"
  | "getEffectiveConfig"
  | "getPacketStatus"
>
interface FileServiceDependency {
  createFiles: (
    data: CreateFileDTO[],
    sharedContext?: Context,
  ) => Promise<FileDTO[]>
}

type InjectedDependencies = {
  logger: Logger
  [Modules.FILE]: FileServiceDependency
  [ContainerRegistrationKeys.QUERY]?: QueryService
} & Partial<Record<typeof PACKETA_CLIENT_MODULE, PacketaClientDependency>>

const DEFAULT_PACKET_WEIGHT_KG = 0.5
const GRAMS_PER_KG = 1000

interface QueryService {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }) => Promise<{ data: unknown[] }>
}

interface ProductWeightRecord {
  id: string
  weight?: unknown
}

type ValidatedPacketaShippingOptionData = PacketaShippingOptionData & {
  weight?: unknown
}

interface OrderLineItemWithWeight {
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

interface FulfillmentItemWithQuantity {
  line_item_id?: string | null | undefined
  quantity?: unknown
}

interface FulfillmentDocument {
  format?: string
  type: string
  url: string
}

const resolvePromiseWithValue = async <Result>(
  value: unknown,
): Promise<Result> => {
  await Promise.resolve()
  const error = new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "Resolved Packeta fulfillment value",
  )
  error.cause = value
  throw error
}

const getPacketaFulfillmentData = (
  data: Record<string, unknown>,
): Partial<PacketaFulfillmentData> => ({
  ...(typeof data["packet_id"] === "number"
    ? { packet_id: data["packet_id"] }
    : {}),
  ...(typeof data["label_url"] === "string"
    ? { label_url: data["label_url"] }
    : {}),
  ...(typeof data["tracking_url"] === "string"
    ? { tracking_url: data["tracking_url"] }
    : {}),
})

const buildFulfillmentDocuments = (
  data: Record<string, unknown>,
): FulfillmentDocument[] => {
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
  fulfillmentData: Record<string, unknown>,
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

const isProductWeightRecord = (value: unknown): value is ProductWeightRecord =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string"

const isPacketaShippingOptionData = (
  value: Record<string, unknown>,
): value is Record<string, unknown> & ValidatedPacketaShippingOptionData => {
  const { code } = value
  if (code !== "z_point" && code !== "z_point_cod") {
    return false
  }
  if (
    value["requires_access_point"] !== true ||
    typeof value["supports_cod"] !== "boolean"
  ) {
    return false
  }

  const accessPointId = value["access_point_id"]
  return (
    accessPointId === undefined ||
    (typeof accessPointId === "number" && Number.isFinite(accessPointId))
  )
}

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  if (typeof value === "object" && value !== null && "value" in value) {
    return toFiniteNumber(value.value)
  }

  return undefined
}

const medusaWeightGramsToKg = (weight: number): number => weight / GRAMS_PER_KG

const getOrderItemRawWeight = (
  orderItem: OrderLineItemWithWeight,
  productWeights: Map<string, unknown>,
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

class PacketaFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static override readonly identifier = PACKETA_PROVIDER_IDENTIFIER

  protected readonly logger: Logger
  protected readonly packetaClient: PacketaClientDependency | undefined
  protected readonly fileService: FileServiceDependency
  protected readonly query: QueryService | undefined

  constructor(container: InjectedDependencies, _options: PacketaOptions) {
    super()
    this.logger = container.logger
    this.packetaClient = container[PACKETA_CLIENT_MODULE]
    this.fileService = container[Modules.FILE]
    this.query = container[ContainerRegistrationKeys.QUERY]
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

  override async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
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

  override async validateOption(
    data: Record<string, unknown>,
  ): Promise<boolean> {
    await Promise.resolve()
    void this.logger
    return data["code"] === "z_point" || data["code"] === "z_point_cod"
  }

  /**
   * Called during checkout when the customer finalises the shipping method.
   * Validates that a Packeta pickup-point was selected by the widget.
   */
  override async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext,
  ): Promise<Record<string, unknown>> {
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta shipping is currently unavailable. Please select a different shipping method.",
      )
    }

    const accessPointId = data["access_point_id"]
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
    const optionCode = optionData["code"]
    if (optionCode !== "z_point" && optionCode !== "z_point_cod") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Invalid shipping option code",
      )
    }

    const validatedData: PacketaShippingOptionData = {
      access_point_id: parsedAccessPointId,
      code: optionCode,
      requires_access_point: true,
      supports_cod: optionCode === "z_point_cod",
    }
    const accessPointName = data["access_point_name"]
    const accessPointZip = data["access_point_zip"]
    const accessPointCity = data["access_point_city"]

    if (typeof accessPointName === "string") {
      validatedData.access_point_name = accessPointName
    }
    if (typeof accessPointZip === "string") {
      validatedData.access_point_zip = accessPointZip
    }
    if (typeof accessPointCity === "string") {
      validatedData.access_point_city = accessPointCity
    }

    return { ...validatedData }
  }

  override async createFulfillment(
    data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<
      Omit<FulfillmentDTO, "provider_id" | "data" | "items">
    >,
  ): Promise<CreateFulfillmentResult> {
    if (!isPacketaShippingOptionData(data)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: Invalid shipping data",
      )
    }
    const shippingData = data

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
      data: fulfillmentData,
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

  override async cancelFulfillment(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
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

  override async createReturnFulfillment(
    _fulfillment: Record<string, unknown>,
  ): Promise<CreateFulfillmentResult> {
    await Promise.resolve()
    void this.logger
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Packeta: Return fulfillment not yet implemented.",
    )
  }

  override async canCalculate(
    _data: CreateShippingOptionDTO,
  ): Promise<boolean> {
    await Promise.resolve()
    void this.logger
    return false
  }

  override async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    _context: CalculateShippingOptionPriceDTO["context"],
  ): Promise<CalculatedShippingOptionPrice> {
    await Promise.resolve()
    void this.logger
    return {
      calculated_amount: 0,
      is_calculated_price_tax_inclusive: false,
    }
  }

  override async getFulfillmentDocuments(
    data: Record<string, unknown>,
  ): Promise<never[]> {
    await Promise.resolve()
    void this.logger
    const documents = buildFulfillmentDocuments(data)
    return await resolvePromiseWithValue<never[]>(documents)
  }

  override async retrieveDocuments(
    fulfillmentData: Record<string, unknown>,
    documentType: string,
  ): Promise<void> {
    await Promise.resolve()
    void this.logger
    const document = retrieveFulfillmentDocument(fulfillmentData, documentType)
    await resolvePromiseWithValue<undefined>(document)
  }

  override async getReturnDocuments(
    _data: Record<string, unknown>,
  ): Promise<never[]> {
    await Promise.resolve()
    void this.logger
    return []
  }

  override async getShipmentDocuments(
    data: Record<string, unknown>,
  ): Promise<never[]> {
    await Promise.resolve()
    void this.logger
    void data
    return []
  }

  // ============================================
  // Internal helpers
  // ============================================

  private async buildPacketAttributes(params: {
    order: Partial<FulfillmentOrderDTO>
    shippingAddress: NonNullable<FulfillmentOrderDTO["shipping_address"]>
    accessPointId: number
    shippingData: ValidatedPacketaShippingOptionData
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
    shippingData: PacketaShippingOptionData,
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
      "Packeta: order total or item_total is required for COD shipments",
    )
  }

  private async getPacketWeight(
    order: Partial<FulfillmentOrderDTO>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    shippingData: ValidatedPacketaShippingOptionData,
  ): Promise<number> {
    return (
      toFiniteNumber(shippingData.weight) ??
      (await this.calculateOrderItemsWeightKg(order, items)) ??
      DEFAULT_PACKET_WEIGHT_KG
    )
  }

  private static getPacketCurrency(
    order: Partial<FulfillmentOrderDTO>,
    shippingData: PacketaShippingOptionData,
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
    const orderItems: OrderLineItemWithWeight[] = order.items ?? []
    if (orderItems.length === 0) {
      return undefined
    }

    const productWeights = await this.getProductWeights(orderItems)
    const orderItemsById = new Map(
      orderItems
        .filter((item): item is OrderLineItemWithWeight & { id: string } =>
          Boolean(item.id),
        )
        .map((item) => [item.id, item]),
    )

    const itemsToWeigh: FulfillmentItemWithQuantity[] =
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
        const quantity =
          toFiniteNumber(item.quantity) ??
          toFiniteNumber(orderItem.quantity) ??
          1
        totalWeightKg += medusaWeightGramsToKg(rawWeight) * quantity
      }
    }

    return totalWeightKg > 0 ? totalWeightKg : undefined
  }

  private async getProductWeights(
    orderItems: OrderLineItemWithWeight[],
  ): Promise<Map<string, unknown>> {
    const productIds = [
      ...new Set(
        orderItems
          .map(
            (item) => item.product_id ?? item.variant?.product?.id ?? undefined,
          )
          .filter((id): id is string => Boolean(id)),
      ),
    ]

    if (this.query === undefined || productIds.length === 0) {
      return new Map()
    }

    const { data } = await this.query.graph({
      entity: "product",
      fields: ["id", "weight"],
      filters: {
        id: productIds,
      },
    })

    const productWeights = new Map<string, unknown>()
    for (const product of data) {
      if (isProductWeightRecord(product)) {
        productWeights.set(product.id, product.weight)
      }
    }
    return productWeights
  }
}

export default PacketaFulfillmentProviderService

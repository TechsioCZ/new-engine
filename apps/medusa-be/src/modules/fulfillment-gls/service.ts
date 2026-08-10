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
import { GLS_CLIENT_MODULE, type GLSClientModuleService } from "../gls-client"
import type {
  GLSFulfillmentData,
  GLSCreatePacketResult,
  GLSOptions,
  GLSShippingOptionData,
} from "../gls-client/types"
import {
  buildGLSPacketAttributes,
  type QueryService,
} from "./helpers/packet-attributes"
import { resolveGLSCartContext } from "./helpers/cart-context"
import {
  buildGLSFulfillmentOperationIdentity,
  resolveOrderFulfillmentIds,
} from "./helpers/operation-key"

type InjectedDependencies = {
  logger: Logger
  [Modules.FILE]: IFileModuleService
  [ContainerRegistrationKeys.QUERY]?: QueryService
} & Record<typeof GLS_CLIENT_MODULE, GLSClientModuleService>

const isGLSShippingOptionData = (
  value: Record<string, unknown>
): value is GLSShippingOptionData => {
  const code: unknown = value.code
  const requiresAccessPoint: unknown = value.requires_access_point
  const supportsCod: unknown = value.supports_cod
  const accessPointId: unknown = value.access_point_id

  if (
    (accessPointId !== undefined && typeof accessPointId !== "string") ||
    typeof supportsCod !== "boolean"
  ) {
    return false
  }

  if (code === "home_delivery" || code === "home_delivery_cod") {
    return requiresAccessPoint === false && supportsCod === (code === "home_delivery_cod")
  }

  return (
    (code === "parcelshop" || code === "parcelshop_cod") &&
    requiresAccessPoint === true &&
    supportsCod === (code === "parcelshop_cod")
  )
}

const isGLSFulfillmentData = (
  value: Record<string, unknown>
): value is GLSFulfillmentData => {
  const packetId: unknown = value.packet_id
  const barcode: unknown = value.barcode
  const accessPointId: unknown = value.access_point_id
  const supportsCod: unknown = value.supports_cod
  const status: unknown = value.status
  const attemptId: unknown = value.attempt_id
  const operationKey: unknown = value.operation_key
  const configId: unknown = value.config_id
  const environment: unknown = value.environment

  return (
    (typeof packetId === "string" || typeof packetId === "number") &&
    typeof barcode === "string" &&
    (accessPointId === undefined || typeof accessPointId === "string") &&
    (attemptId === undefined || typeof attemptId === "string") &&
    (operationKey === undefined || typeof operationKey === "string") &&
    typeof configId === "string" &&
    configId.trim().length > 0 &&
    (environment === "testing" || environment === "production") &&
    typeof supportsCod === "boolean" &&
    (status === "completed" || status === "error")
  )
}

const assertRequiredPickupPoint = (shippingData: GLSShippingOptionData) => {
  if (shippingData.requires_access_point && !shippingData.access_point_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: access_point_id is required"
    )
  }
}

const resolveGLSOption = (optionCode: unknown): { code: GLSShippingOptionData["code"]; requiresAccessPoint: boolean; supportsCod: boolean } => {
  if (optionCode !== "home_delivery" && optionCode !== "home_delivery_cod" && optionCode !== "parcelshop" && optionCode !== "parcelshop_cod") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "GLS: Invalid shipping option code")
  }

  return {
    code: optionCode,
    requiresAccessPoint: optionCode === "parcelshop" || optionCode === "parcelshop_cod",
    supportsCod: optionCode === "home_delivery_cod" || optionCode === "parcelshop_cod",
  }
}

export const GLS_PROVIDER_IDENTIFIER = "gls"

export class GLSFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static override identifier = GLS_PROVIDER_IDENTIFIER

  protected readonly logger_: Logger
  protected readonly glsClient_: GLSClientModuleService
  protected readonly fileService_: IFileModuleService
  protected readonly query_?: QueryService

  constructor(container: InjectedDependencies, _options: GLSOptions) {
    super()
    this.logger_ = container.logger
    this.glsClient_ = container[GLS_CLIENT_MODULE]
    this.fileService_ = container[Modules.FILE]
    this.query_ = container[ContainerRegistrationKeys.QUERY]
  }

  private getClient(): GLSClientModuleService {
    if (!this.glsClient_) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS: gls_client module not available. Check medusa-config dependencies."
      )
    }
    return this.glsClient_
  }

  override async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    try {
      const config = await this.getClient().getEffectiveConfig()
      if (!config) {
        return []
      }
    } catch (error) {
      this.logger_.warn(
        `GLS: Could not check config status, returning no options: ${error instanceof Error ? error.message : String(error)}`
      )
      return []
    }

    return [
      {
        id: "gls-home-delivery",
        name: "GLS Courier (home delivery)",
        code: "home_delivery",
        requires_access_point: false,
        supports_cod: false,
      },
      {
        id: "gls-home-delivery-cod",
        name: "GLS Courier COD (home delivery)",
        code: "home_delivery_cod",
        requires_access_point: false,
        supports_cod: true,
      },
      {
        id: "gls-parcelshop",
        name: "GLS ParcelShop (pickup point)",
        code: "parcelshop",
        requires_access_point: true,
        supports_cod: false,
      },
      {
        id: "gls-parcelshop-cod",
        name: "GLS ParcelShop COD (pickup point)",
        code: "parcelshop_cod",
        requires_access_point: true,
        supports_cod: true,
      },
    ]
  }

  override async validateOption(
    data: Record<string, unknown>
  ): Promise<boolean> {
    return data.code === "home_delivery" || data.code === "home_delivery_cod" || data.code === "parcelshop" || data.code === "parcelshop_cod"
  }

  override async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: ValidateFulfillmentDataContext
  ): Promise<Record<string, unknown>> {
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS shipping is currently unavailable. Please select a different shipping method."
      )
    }

    const option = resolveGLSOption(optionData.code)
    const cartContext = await this.resolveCartContext(context, config)
    const parsedAccessPointId = String(data.access_point_id ?? "").trim()
    if (option.requiresAccessPoint && !parsedAccessPointId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Pickup point (ParcelShop) selection is required for this shipping method"
      )
    }

    const branch = option.requiresAccessPoint
      ? await this.getClient().getBranch(
          cartContext.countryCode,
          parsedAccessPointId
        )
      : null
    if (option.requiresAccessPoint && !branch) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: The selected pickup point is unavailable for this cart"
      )
    }

    return {
      code: option.code,
      requires_access_point: option.requiresAccessPoint,
      supports_cod: option.supportsCod,
      ...(branch
        ? {
            access_point_id: branch.id,
            access_point_name: branch.name || branch.nameStreet || branch.id,
            access_point_street: branch.street || branch.nameStreet,
            access_point_zip: branch.zip,
            access_point_city: branch.city,
            access_point_country: branch.country,
          }
        : {}),
      email: typeof data.email === "string" ? data.email.trim() || undefined : undefined,
    } satisfies GLSShippingOptionData
  }

  private async resolveCartContext(context: ValidateFulfillmentDataContext, config: GLSOptions) {
    if (!this.query_) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "GLS: Cart query service is unavailable")
    }

    const cartContext = await resolveGLSCartContext(this.query_, context.id)
    const addressCountryCode = context.shipping_address?.country_code?.trim().toUpperCase()
    if (addressCountryCode && addressCountryCode !== cartContext.countryCode) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "GLS: Cart shipping country does not match its region")
    }
    if (!config.supported_countries.includes(cartContext.countryCode)) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "GLS is not enabled for this storefront market")
    }

    return cartContext
  }

  override async createFulfillment(
    data: Record<string, unknown>,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>
  ): Promise<CreateFulfillmentResult> {
    if (!isGLSShippingOptionData(data)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Invalid shipping data"
      )
    }
    const shippingData = data

    if (!order) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Order is required for fulfillment"
      )
    }
    if (!order.shipping_address) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Shipping address is required"
      )
    }
    assertRequiredPickupPoint(shippingData)
    const shippingCountryCode = order.shipping_address.country_code
      ?.trim()
      .toUpperCase()
    if (
      shippingData.requires_access_point &&
      shippingData.access_point_country !== shippingCountryCode
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Pickup point country does not match the order shipping country"
      )
    }

    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS: Service is disabled or not configured. Enable it in Settings → GLS."
      )
    }

    const attributes = await buildGLSPacketAttributes({
      order,
      shippingAddress: order.shipping_address,
      accessPointId: shippingData.access_point_id,
      shippingData,
      items: _items,
      config,
      query: this.query_,
      logger: this.logger_,
    })

    if (!fulfillment.id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "GLS: Fulfillment id is required before carrier parcel creation"
      )
    }
    if (!this.query_) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "GLS: Order query service is unavailable"
      )
    }

    const fulfillmentId = fulfillment.id
    const orderId = order.id ?? attributes.number
    const operation = buildGLSFulfillmentOperationIdentity({
      environment: config.environment,
      orderId,
      items: _items,
      attributes,
    })
    const activeFulfillmentIds = await resolveOrderFulfillmentIds(
      this.query_,
      orderId
    )
    this.logger_.info(
      `GLS: Creating ${shippingData.requires_access_point ? "ParcelShop" : "courier"} packet for ${fulfillmentId}`
    )

    const result = await this.getClient().createOrRecoverPacket({
      config_id: config.config_id,
      environment: config.environment,
      operation_key: operation.operationKey,
      client_reference: operation.clientReference,
      fulfillment_id: fulfillmentId,
      active_fulfillment_ids: activeFulfillmentIds,
      attributes,
    })
    const trackingUrl = `https://tracking.gls.com/${result.barcode}`

    const labelUrl = await this.uploadLabel(result, { config_id: config.config_id, environment: config.environment })

    const fulfillmentData: GLSFulfillmentData = {
      status: "completed",
      packet_id: result.id,
      barcode: result.barcode,
      parcel_number: result.parcel_number,
      ...(shippingData.access_point_id
        ? { access_point_id: shippingData.access_point_id }
        : {}),
      supports_cod: shippingData.supports_cod,
      config_id: config.config_id,
      environment: config.environment,
      ...(labelUrl && { label_url: labelUrl }),
      tracking_url: trackingUrl,
      attempt_id: result.attempt_id,
      operation_key: result.operation_key,
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

  private async uploadLabel(result: GLSCreatePacketResult, reference: { config_id: string; environment: "testing" | "production" }): Promise<string | undefined> {
    try {
      const pdfBuffer =
        result.label_pdf && result.label_pdf.length > 0
          ? result.label_pdf
          : await this.getClient().downloadLabelPdf(result.id, reference)
      const uploaded = await this.fileService_.createFiles([
        {
          filename: `gls-label-${result.barcode}.pdf`,
          mimeType: "application/pdf",
          content: pdfBuffer.toString("base64"),
        },
      ])
      return uploaded[0]?.url
    } catch (error) {
      this.logger_.warn(
        `GLS: Packet ${result.id} created (parcel number ${result.barcode}) but label upload failed: ${error instanceof Error ? error.message : String(error)}. The label can be retrieved later from MyGLS.`
      )
      return
    }
  }

  override async cancelFulfillment(
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!isGLSFulfillmentData(data)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Cannot cancel fulfillment with invalid carrier data"
      )
    }
    const fulfillmentData = data
    const packetId = fulfillmentData.packet_id
    const configReference = { config_id: fulfillmentData.config_id, environment: fulfillmentData.environment }

    if (!packetId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Cannot cancel fulfillment without a packet id"
      )
    }

    const cancelled = fulfillmentData.attempt_id
      ? await this.getClient().cancelPacketForAttempt(
          fulfillmentData.attempt_id,
          packetId,
          configReference
        )
      : await this.getClient().cancelPacket(packetId, configReference)
    if (!cancelled) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS did not confirm cancellation. The parcel may already be with the carrier; local fulfillment remains active."
      )
    }
    return { cancelled: true, packet_id: packetId }
  }

  override async createReturnFulfillment(
    _fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "GLS: Return fulfillment not yet implemented."
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
    const documents: { type: string; url: string; format?: string }[] = []
    if (!isGLSFulfillmentData(data)) {
      return documents
    }
    const fulfillmentData = data

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
    if (!isGLSFulfillmentData(fulfillmentData)) {
      return null
    }
    const data = fulfillmentData

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
}

export default GLSFulfillmentProviderService

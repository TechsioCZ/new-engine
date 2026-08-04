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
  GLSOptions,
  GLSShippingOptionData,
} from "../gls-client/types"
import {
  buildGLSPacketAttributes,
  type QueryService,
} from "./helpers/packet-attributes"

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

  return (
    (code === "parcelshop" || code === "parcelshop_cod") &&
    requiresAccessPoint === true &&
    typeof supportsCod === "boolean" &&
    (accessPointId === undefined || typeof accessPointId === "string")
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

  return (
    (packetId === undefined ||
      typeof packetId === "string" ||
      typeof packetId === "number") &&
    (barcode === undefined || typeof barcode === "string") &&
    (accessPointId === undefined || typeof accessPointId === "string") &&
    (supportsCod === undefined || typeof supportsCod === "boolean") &&
    (status === undefined || status === "completed" || status === "error")
  )
}

/**
 * GLS Fulfillment Provider
 *
 * ParcelShop (pickup-point) shipments only, with optional COD. No home delivery.
 *
 * Unlike PPL, GLS's createPacket API is synchronous: the call returns a
 * barcode + packet ID immediately, and the label PDF is fetchable right away.
 * This means we can create the label file during createFulfillment without a
 * separate background sync job.
 */
export const GLS_PROVIDER_IDENTIFIER = "gls"

class GLSFulfillmentProviderService extends AbstractFulfillmentProviderService {
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
        `GLS: Could not check config status, returning no options: ${error instanceof Error ? error.message : String(error)}`
      )
      return []
    }

    return [
      {
        id: "gls-parcelshop",
        name: "GLS ParcelShop (pickup point)",
        code: "parcelshop",
        requires_access_point: true,
        supports_cod: false,
      },
      {
        id: "gls-parcelshop-cod",
        name: "GLS ParcelShop + COD",
        code: "parcelshop_cod",
        requires_access_point: true,
        supports_cod: true,
      },
    ]
  }

  override async validateOption(
    data: Record<string, unknown>
  ): Promise<boolean> {
    return data.code === "parcelshop" || data.code === "parcelshop_cod"
  }

  /**
   * Called during checkout when the customer finalises the shipping method.
   * Validates that a GLS pickup-point was selected by the widget.
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
        "GLS shipping is currently unavailable. Please select a different shipping method."
      )
    }

    const accessPointId = data.access_point_id
    const parsedAccessPointId = String(accessPointId ?? "").trim()
    if (!parsedAccessPointId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Pickup point (ParcelShop) selection is required for this shipping method"
      )
    }

    const optionCode = optionData.code
    if (optionCode !== "parcelshop" && optionCode !== "parcelshop_cod") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Invalid shipping option code"
      )
    }

    return {
      code: optionCode,
      requires_access_point: true,
      supports_cod: optionCode === "parcelshop_cod",
      access_point_id: parsedAccessPointId,
      access_point_name: data.access_point_name as string | undefined,
      access_point_zip: data.access_point_zip as string | undefined,
      access_point_city: data.access_point_city as string | undefined,
      email: data.email as string | undefined,
    } satisfies GLSShippingOptionData
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
    if (!shippingData.access_point_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: access_point_id is required"
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

    const fulfillmentId = fulfillment.id ?? `temp-${Date.now()}`
    this.logger_.info(
      `GLS: Creating packet for ${fulfillmentId}, access point ${shippingData.access_point_id}`
    )

    const result = await this.getClient().createPacket(attributes)
    const trackingUrl = `https://tracking.gls.com/${result.barcode}`

    let labelUrl: string | undefined
    try {
      const pdfBuffer =
        result.label_pdf && result.label_pdf.length > 0
          ? result.label_pdf
          : await this.getClient().downloadLabelPdf(result.id)
      const uploaded = await this.fileService_.createFiles([
        {
          filename: `gls-label-${result.barcode}.pdf`,
          mimeType: "application/pdf",
          content: pdfBuffer.toString("base64"),
        },
      ])
      labelUrl = uploaded[0]?.url
    } catch (error) {
      this.logger_.warn(
        `GLS: Packet ${result.id} created (parcel number ${result.barcode}) but label upload failed: ${error instanceof Error ? error.message : String(error)}. The label can be retrieved later from MyGLS.`
      )
    }

    const fulfillmentData: GLSFulfillmentData = {
      status: "completed",
      packet_id: result.id,
      barcode: result.barcode,
      parcel_number: result.barcode,
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
    if (!isGLSFulfillmentData(data)) {
      this.logger_.warn("GLS: Cannot cancel - invalid fulfillment data")
      return { cancelled: false, note: "Invalid fulfillment data" }
    }
    const fulfillmentData = data
    const packetId = fulfillmentData.packet_id

    if (!packetId) {
      this.logger_.warn("GLS: Cannot cancel - no packet_id in fulfillment data")
      return { cancelled: false, note: "No packet_id on fulfillment" }
    }

    const cancelled = await this.getClient().cancelPacket(packetId)
    if (!cancelled) {
      return {
        cancelled: false,
        packet_id: packetId,
        note: "Cancellation failed. Packet may have been picked up by carrier. Contact GLS support.",
      }
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

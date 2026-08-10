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
  IFileModuleService,
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

import { GLS_CLIENT_MODULE } from "../gls-client"
import type { GLSClientModuleService } from "../gls-client"
import type {
  GLSFulfillmentData,
  GLSOptions,
  GLSShippingOptionData,
} from "../gls-client/types"
import {
  buildGLSPacketAttributes,
  toFiniteNumber,
} from "./helpers/packet-attributes"

/**
 * The gls_client registration is declared optional so the defensive
 * `getClient()` guard below stays type-checkable: a misconfigured
 * `medusa-config` leaves the slot unresolved at runtime.
 */
type InjectedDependencies = {
  logger: Logger
  [Modules.FILE]: IFileModuleService
  [ContainerRegistrationKeys.QUERY]?: Query
} & Partial<Record<typeof GLS_CLIENT_MODULE, GLSClientModuleService>>

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.length > 0

/**
 * Mirrors the truthiness guard that used to be applied directly to the
 * `string | number` packet id: empty strings, `0` and `NaN` count as missing.
 */
const hasPacketId = (value: string | number): boolean => {
  if (typeof value === "string") {
    return value.length > 0
  }

  return value !== 0 && !Number.isNaN(value)
}

/**
 * The MyGLS ParcelShop id arrives as a string from the checkout widget;
 * numeric ids are still accepted defensively. Other shapes are rejected by the
 * caller instead of being stringified into `"[object Object]"`.
 */
const toAccessPointId = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim()
  }

  return typeof value === "number" ? String(value) : ""
}

const optionalStringSchema = z
  .unknown()
  .transform((value) => (typeof value === "string" ? value : undefined))
  .optional()
const optionalNumberSchema = z.unknown().transform(toFiniteNumber).optional()
const optionalPacketIdSchema = z
  .unknown()
  .transform((value) =>
    typeof value === "string" || typeof value === "number" ? value : undefined,
  )
  .optional()

const parcelShopOptionSchema = z.object({
  code: z.enum(["parcelshop", "parcelshop_cod"]),
})

const checkoutDataSchema = z.object({
  access_point_city: optionalStringSchema,
  access_point_id: z.unknown(),
  access_point_name: optionalStringSchema,
  access_point_zip: optionalStringSchema,
  email: optionalStringSchema,
})

const glsShippingOptionDataSchema = z.object({
  access_point_city: optionalStringSchema,
  access_point_id: optionalStringSchema,
  access_point_name: optionalStringSchema,
  access_point_zip: optionalStringSchema,
  code: z.enum(["parcelshop", "parcelshop_cod"]),
  email: optionalStringSchema,
  requires_access_point: z.literal(true),
  supports_cod: z.boolean(),
  weight: optionalNumberSchema,
})

const glsFulfillmentDataSchema = z.object({
  access_point_id: z.string(),
  barcode: z.string(),
  delivery_failed: z.boolean().optional(),
  error_message: optionalStringSchema,
  first_sync_attempt: optionalStringSchema,
  label_url: optionalStringSchema,
  last_status: optionalStringSchema,
  last_status_date: optionalStringSchema,
  last_sync_attempt: optionalStringSchema,
  packet_id: z.union([z.string(), z.number()]),
  parcel_number: optionalPacketIdSchema,
  status: z.enum(["completed", "error"]),
  supports_cod: z.boolean(),
  sync_attempts: optionalNumberSchema,
  tracking_url: optionalStringSchema,
})

interface FulfillmentDocument {
  format?: string
  type: string
  url: string
}

type CancellationResult =
  | { cancelled: true; packet_id: string | number }
  | {
      cancelled: false
      note: string
      packet_id?: string | number
    }

const withOptionalCheckoutData = (data: {
  access_point_city?: string | undefined
  access_point_name?: string | undefined
  access_point_zip?: string | undefined
  email?: string | undefined
}): Pick<
  GLSShippingOptionData,
  "access_point_city" | "access_point_name" | "access_point_zip" | "email"
> => ({
  ...(data.access_point_city === undefined
    ? {}
    : { access_point_city: data.access_point_city }),
  ...(data.access_point_name === undefined
    ? {}
    : { access_point_name: data.access_point_name }),
  ...(data.access_point_zip === undefined
    ? {}
    : { access_point_zip: data.access_point_zip }),
  ...(data.email === undefined ? {} : { email: data.email }),
})

const parseShippingData = (
  value: unknown,
): GLSShippingOptionData | undefined => {
  const parsed = glsShippingOptionDataSchema.safeParse(value)
  if (!parsed.success) {
    return undefined
  }

  const { data } = parsed
  return {
    code: data.code,
    requires_access_point: data.requires_access_point,
    supports_cod: data.supports_cod,
    ...(data.access_point_id === undefined
      ? {}
      : { access_point_id: data.access_point_id }),
    ...withOptionalCheckoutData(data),
    ...(data.weight === undefined ? {} : { weight: data.weight }),
  }
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

/**
 * The framework's abstract provider currently narrows document methods below
 * the canonical `IFulfillmentProvider` contract. Implementing that contract
 * directly keeps the real document results typed while the discovery marker
 * preserves Medusa's runtime provider identification.
 */
class GLSFulfillmentProviderService implements IFulfillmentProvider {
  static readonly _isFulfillmentService = true
  static readonly identifier = GLS_PROVIDER_IDENTIFIER

  protected readonly identifier = GLS_PROVIDER_IDENTIFIER
  protected readonly logger: Logger
  protected readonly glsClient: GLSClientModuleService | undefined
  protected readonly fileService: IFileModuleService
  protected readonly query: Query | undefined

  constructor(container: InjectedDependencies, _options: GLSOptions) {
    this.logger = container.logger
    this.glsClient = container[GLS_CLIENT_MODULE]
    this.fileService = container[Modules.FILE]
    this.query = container[ContainerRegistrationKeys.QUERY]
  }

  getIdentifier(): string {
    return this.identifier
  }

  private getClient(): GLSClientModuleService {
    const client = this.glsClient
    if (!client) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS: gls_client module not available. Check medusa-config dependencies.",
      )
    }
    return client
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
        `GLS: Could not check config status, returning no options: ${error instanceof Error ? error.message : String(error)}`,
      )
      return []
    }

    return [
      {
        code: "parcelshop",
        id: "gls-parcelshop",
        name: "GLS ParcelShop (pickup point)",
        requires_access_point: true,
        supports_cod: false,
      },
      {
        code: "parcelshop_cod",
        id: "gls-parcelshop-cod",
        name: "GLS ParcelShop + COD",
        requires_access_point: true,
        supports_cod: true,
      },
    ]
  }

  async validateOption(data: unknown): Promise<boolean> {
    await Promise.resolve(this)
    return parcelShopOptionSchema.safeParse(data).success
  }

  /**
   * Called during checkout when the customer finalises the shipping method.
   * Validates that a GLS pickup-point was selected by the widget.
   */
  async validateFulfillmentData(
    optionData: unknown,
    data: unknown,
    _context: ValidateFulfillmentDataContext,
  ): Promise<GLSShippingOptionData> {
    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS shipping is currently unavailable. Please select a different shipping method.",
      )
    }

    const parsedData = checkoutDataSchema.safeParse(data)
    const parsedAccessPointId = toAccessPointId(
      parsedData.success ? parsedData.data.access_point_id : undefined,
    )
    if (!isNonEmptyString(parsedAccessPointId)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Pickup point (ParcelShop) selection is required for this shipping method",
      )
    }

    const parsedOption = parcelShopOptionSchema.safeParse(optionData)
    if (!parsedOption.success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Invalid shipping option code",
      )
    }
    const optionCode = parsedOption.data.code

    return {
      ...(parsedData.success ? withOptionalCheckoutData(parsedData.data) : {}),
      access_point_id: parsedAccessPointId,
      code: optionCode,
      requires_access_point: true,
      supports_cod: optionCode === "parcelshop_cod",
    }
  }

  async createFulfillment(
    data: unknown,
    _items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<
      Omit<FulfillmentDTO, "provider_id" | "data" | "items">
    >,
  ): Promise<CreateFulfillmentResult> {
    const shippingData = parseShippingData(data)
    if (shippingData === undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Invalid shipping data",
      )
    }

    if (!order) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Order is required for fulfillment",
      )
    }
    if (!order.shipping_address) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Shipping address is required",
      )
    }
    if (!isNonEmptyString(shippingData.access_point_id)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: access_point_id is required",
      )
    }

    const config = await this.getClient().getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS: Service is disabled or not configured. Enable it in Settings → GLS.",
      )
    }

    const attributes = await buildGLSPacketAttributes({
      accessPointId: shippingData.access_point_id,
      config,
      items: _items,
      logger: this.logger,
      order,
      shippingAddress: order.shipping_address,
      shippingData,
      ...(this.query === undefined ? {} : { query: this.query }),
    })

    const fulfillmentId = fulfillment.id ?? `temp-${Date.now()}`
    this.logger.info(
      `GLS: Creating packet for ${fulfillmentId}, access point ${shippingData.access_point_id}`,
    )

    const result = await this.getClient().createPacket(attributes)
    const trackingUrl = `https://tracking.gls.com/${result.barcode}`

    let labelUrl: string | undefined
    try {
      const pdfBuffer =
        result.label_pdf && result.label_pdf.length > 0
          ? result.label_pdf
          : await this.getClient().downloadLabelPdf(result.id)
      const uploaded = await this.fileService.createFiles([
        {
          content: pdfBuffer.toString("base64"),
          filename: `gls-label-${result.barcode}.pdf`,
          mimeType: "application/pdf",
        },
      ])
      labelUrl = uploaded[0]?.url
    } catch (error) {
      this.logger.warn(
        `GLS: Packet ${result.id} created (parcel number ${result.barcode}) but label upload failed: ${error instanceof Error ? error.message : String(error)}. The label can be retrieved later from MyGLS.`,
      )
    }

    const fulfillmentData: GLSFulfillmentData = {
      access_point_id: shippingData.access_point_id,
      barcode: result.barcode,
      packet_id: result.id,
      parcel_number: result.parcel_number,
      status: "completed",
      supports_cod: shippingData.supports_cod,
      ...(isNonEmptyString(labelUrl) ? { label_url: labelUrl } : {}),
      tracking_url: trackingUrl,
    }

    return {
      data: { ...fulfillmentData },
      labels: isNonEmptyString(labelUrl)
        ? [
            {
              label_url: labelUrl,
              tracking_number: result.barcode,
              tracking_url: trackingUrl,
            },
          ]
        : [],
    }
  }

  async cancelFulfillment(data: unknown): Promise<CancellationResult> {
    const parsed = glsFulfillmentDataSchema.safeParse(data)
    if (!parsed.success) {
      this.logger.warn("GLS: Cannot cancel - invalid fulfillment data")
      return { cancelled: false, note: "Invalid fulfillment data" }
    }
    const packetId = parsed.data.packet_id

    if (!hasPacketId(packetId)) {
      this.logger.warn("GLS: Cannot cancel - no packet_id in fulfillment data")
      return { cancelled: false, note: "No packet_id on fulfillment" }
    }

    const cancelled = await this.getClient().cancelPacket(packetId)
    if (!cancelled) {
      return {
        cancelled: false,
        note: "Cancellation failed. Packet may have been picked up by carrier. Contact GLS support.",
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
      "GLS: Return fulfillment not yet implemented.",
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
    const documents: FulfillmentDocument[] = []
    const parsed = glsFulfillmentDataSchema.safeParse(data)
    if (!parsed.success) {
      return documents
    }
    const fulfillmentData = parsed.data

    if (isNonEmptyString(fulfillmentData.label_url)) {
      documents.push({
        format: "pdf",
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

  async retrieveDocuments(
    fulfillmentData: unknown,
    documentType: string,
  ): Promise<FulfillmentDocument | null> {
    await Promise.resolve(this)
    const parsed = glsFulfillmentDataSchema.safeParse(fulfillmentData)
    if (!parsed.success) {
      return null
    }
    const { data } = parsed

    switch (documentType) {
      case "label": {
        return isNonEmptyString(data.label_url)
          ? { format: "pdf", type: "label", url: data.label_url }
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

  async getReturnDocuments(_data: unknown): Promise<never[]> {
    await Promise.resolve(this)
    return []
  }

  async getShipmentDocuments(_data: unknown): Promise<never[]> {
    await Promise.resolve(this)
    return []
  }
}

export default GLSFulfillmentProviderService

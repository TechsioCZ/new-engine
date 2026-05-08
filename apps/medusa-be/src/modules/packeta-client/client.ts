import { MedusaError } from "@medusajs/framework/utils"
import { XMLBuilder, XMLParser } from "fast-xml-parser"
import type {
  PacketaBranch,
  PacketaCreatePacketResult,
  PacketaOptions,
  PacketaPacketAttributes,
  PacketaPacketStatusRecord,
} from "./types"
import { mapPacketaStatusCode } from "./utils"

/**
 * Packeta REST/XML API endpoint. Single URL — environment routing happens via
 * sender credentials, not URL.
 * @see https://docs.packeta.com/docs/getting-started/packeta-api
 */
const REST_API_URL = "https://www.zasilkovna.cz/api/rest"

/**
 * Public branch-list feed used for pickup-point discovery. JSON, separate from
 * the REST/XML API. `{apiKey}` is substituted into the path.
 */
const BRANCH_FEED_URL =
  "https://pickup-point.api.packeta.com/v5/{apiKey}/branch.json?lang=cs"

type RequestOptions = {
  /** Body fields placed inside the method element alongside apiPassword */
  params?: Record<string, unknown>
}

type PacketaResponseEnvelope<T> = {
  status: "ok" | "fault"
  result?: T
  fault?: string
  string?: string
  detail?: unknown
}

/**
 * Packeta REST/XML API Client — pure HTTP layer.
 *
 * No caching, no rate limiting, no token management — handled by
 * PacketaClientModuleService. This client only:
 *
 * - POSTs XML bodies to https://www.zasilkovna.cz/api/rest
 * - Retries on transient failures (429 / 5xx)
 * - Translates Packeta `<status>fault</status>` envelopes into MedusaErrors
 * - Decodes base64 label PDFs
 */
export class PacketaClient {
  private readonly MAX_RETRIES = 3
  private readonly INITIAL_RETRY_DELAY_MS = 200
  private readonly REQUEST_TIMEOUT_MS = 30_000

  private readonly options: PacketaOptions
  private readonly xmlBuilder: XMLBuilder
  private readonly xmlParser: XMLParser

  constructor(options: PacketaOptions) {
    this.options = options
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: true,
      suppressEmptyNode: true,
    })
    this.xmlParser = new XMLParser({
      ignoreAttributes: true,
      parseTagValue: true,
      // Force these to always be arrays even when the API returns a single child.
      isArray: (name) => name === "record",
    })
  }

  // ============================================
  // Shipment Operations
  // ============================================

  /**
   * Create a packet (synchronous — returns packet ID + barcode immediately).
   */
  async createPacket(
    attributes: PacketaPacketAttributes
  ): Promise<PacketaCreatePacketResult> {
    const params = {
      packetAttributes: {
        ...attributes,
        eshop: attributes.eshop ?? this.options.sender_label ?? undefined,
      },
    }

    const result = await this.request<PacketaCreatePacketResult>(
      "createPacket",
      { params }
    )

    if (!(result?.id && result?.barcode)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: createPacket returned no id/barcode"
      )
    }
    return result
  }

  /**
   * Cancel a packet (only possible before pickup by carrier).
   * Returns true on success, false on Packeta-side refusal.
   */
  async cancelPacket(packetId: number): Promise<boolean> {
    try {
      await this.request("cancelPacket", { params: { packetId } })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get the normalised status history for a packet.
   *
   * Calls Packeta's `packetTracking` — `packetStatus` only returns the single
   * current state, while consumers (tracking-sync job) need the full history.
   */
  async packetStatus(packetId: number): Promise<PacketaPacketStatusRecord[]> {
    const raw = await this.request<{
      record?: Array<{
        dateTime: string
        statusCode: string | number
        statusName?: string
      }>
    }>("packetTracking", { params: { packetId } })

    const records = raw?.record ?? []
    return records.map((r) => ({
      dateTime: r.dateTime,
      statusCode: r.statusCode,
      statusName: r.statusName ?? String(r.statusCode),
      state: mapPacketaStatusCode(r.statusCode),
    }))
  }

  /**
   * Download label PDF for a packet. Returns raw bytes — caller uploads to storage.
   *
   * Packeta's `format` parameter takes composite values like "A6 on A6" or
   * "A7 on A4" — we accept the simpler "A6"/"A7" enum from config and translate.
   */
  async downloadLabelPdf(
    packetId: number,
    format: "A6" | "A7" = this.options.default_label_format,
    offset: number = this.options.default_label_offset
  ): Promise<Buffer> {
    const apiFormat = format === "A6" ? "A6 on A6" : "A7 on A4"
    const result = await this.request<string>("packetLabelPdf", {
      params: { packetId, format: apiFormat, offset },
    })

    if (!result || typeof result !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Packeta: packetLabelPdf returned no PDF data for packet ${packetId}`
      )
    }
    return Buffer.from(result, "base64")
  }

  // ============================================
  // Branch (Pickup Point) Feed
  // ============================================

  /**
   * Fetch the full pickup-point feed. Large JSON payload — the service layer
   * caches this (24h TTL) and shouldn't call it on request hot paths.
   */
  async getBranchList(): Promise<PacketaBranch[]> {
    const url = BRANCH_FEED_URL.replace(
      "{apiKey}",
      encodeURIComponent(
        process.env.PACKETA_PICKUP_POINTS_API_KEY ?? this.options.api_password
      )
    )

    const payload = await this.withRetry(
      () => this.fetchWithTimeout(url, { method: "GET" }),
      async (response) => {
        if (!response.ok) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Packeta branch feed failed: ${response.status}`
          )
        }
        const text = await response.text()
        return JSON.parse(text) as
          | {
              data?: { branches?: PacketaBranch[] }
              branches?: PacketaBranch[]
            }
          | PacketaBranch[]
      },
      `Packeta GET ${url}`
    )

    if (Array.isArray(payload)) {
      return payload
    }

    return payload?.data?.branches ?? payload?.branches ?? []
  }

  // ============================================
  // Internal: HTTP + Retry + Envelope handling
  // ============================================

  /**
   * Builds an XML body of the form
   *   <methodName>
   *     <apiPassword>...</apiPassword>
   *     ...params
   *   </methodName>
   * POSTs it to the REST/XML endpoint, parses the `<response>` envelope, and
   * unwraps the `<result>` payload.
   */
  private async request<T>(
    methodName: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params = {} } = options

    const xmlBody = this.xmlBuilder.build({
      [methodName]: {
        apiPassword: this.options.api_password,
        ...params,
      },
    })

    return this.withRetry(
      () =>
        this.fetchWithTimeout(REST_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            Accept: "text/xml",
          },
          body: xmlBody,
        }),
      async (response) => {
        if (!response.ok) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Packeta request failed: ${response.status} - ${await response.text()}`
          )
        }

        const text = await response.text()
        if (!text) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Packeta: empty response body from ${methodName}`
          )
        }

        const parsed: unknown = this.xmlParser.parse(text)
        const envelope = (parsed as { response?: PacketaResponseEnvelope<T> })
          ?.response

        if (!envelope) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Packeta ${methodName}: missing <response> element`
          )
        }

        if (envelope.status === "fault") {
          throw this.faultToError(envelope, methodName)
        }

        if (envelope.status !== "ok") {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Packeta ${methodName}: unexpected status "${envelope.status}"`
          )
        }

        return envelope.result as T
      },
      `Packeta ${methodName}`
    )
  }

  private faultToError(
    envelope: PacketaResponseEnvelope<unknown>,
    methodName: string
  ): MedusaError {
    const message = envelope.string ?? envelope.fault ?? "unknown fault"
    const detailSuffix = envelope.detail
      ? ` Detail: ${JSON.stringify(envelope.detail)}`
      : ""
    return new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Packeta ${methodName} fault (${envelope.fault}): ${message}${detailSuffix}`
    )
  }

  private isRetryable(status: number): boolean {
    return status === 429 || status >= 500
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number = this.REQUEST_TIMEOUT_MS
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        const abortError = new Error(
          `Packeta request timed out after ${timeoutMs}ms: ${url}`
        )
        abortError.name = "AbortError"
        throw abortError
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private async withRetry<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    errorContext: string
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await this.sleep(this.INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1))
      }

      try {
        const response = await operation()

        if (this.isRetryable(response.status) && attempt < this.MAX_RETRIES) {
          lastError = new Error(`${response.status} - ${await response.text()}`)
          continue
        }

        return await handleResponse(response)
      } catch (error) {
        if (error instanceof MedusaError) {
          throw error
        }
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt === this.MAX_RETRIES) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `${errorContext} after ${this.MAX_RETRIES + 1} attempts: ${lastError.message}`
          )
        }
      }
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${errorContext}: ${lastError?.message || "Unknown error"}`
    )
  }
}

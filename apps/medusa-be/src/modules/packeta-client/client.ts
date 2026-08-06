import { MedusaError } from "@medusajs/framework/utils"
import { sleep } from "@techsio/std/async"
import { isRecord } from "@techsio/std/object"
import { XMLParser } from "fast-xml-parser"

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
const REQUEST_TIMEOUT_MS = 30_000

/**
 * Public branch-list feed used for pickup-point discovery. JSON, separate from
 * the REST/XML API. `{apiKey}` is substituted into the path.
 */
const BRANCH_FEED_URL =
  "https://pickup-point.api.packeta.com/v5/{apiKey}/branch.json?lang=cs"

interface RequestOptions {
  /** Body fields placed inside the method element alongside apiPassword */
  params?: Record<string, unknown>
}

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

const serializeXmlElement = (name: string, value: unknown): string => {
  if (isRecord(value)) {
    const children = Object.entries(value)
      .map(([childName, childValue]) =>
        serializeXmlElement(childName, childValue),
      )
      .join("")
    return `<${name}>${children}</${name}>`
  }
  return `<${name}>${escapeXml(String(value))}</${name}>`
}

const isCreatePacketResult = (
  value: unknown,
): value is PacketaCreatePacketResult =>
  isRecord(value) &&
  typeof value["id"] === "number" &&
  typeof value["barcode"] === "string"

const hasStringProperties = (
  value: Record<string, unknown>,
  properties: readonly string[],
): boolean =>
  properties.every((property) => typeof value[property] === "string")

interface TrackingRecord {
  dateTime: string
  statusCode: string | number
  statusName?: string
}

const isTrackingRecord = (value: unknown): value is TrackingRecord => {
  if (!isRecord(value) || !hasStringProperties(value, ["dateTime"])) {
    return false
  }
  const { statusCode, statusName } = value
  const hasStatusCode =
    typeof statusCode === "string" || typeof statusCode === "number"
  const hasStatusName =
    statusName === undefined || typeof statusName === "string"
  return hasStatusCode && hasStatusName
}

const isTrackingResult = (
  value: unknown,
): value is { record?: TrackingRecord[] } => {
  if (!isRecord(value)) {
    return false
  }
  const { record } = value
  return (
    record === undefined ||
    (Array.isArray(record) && record.every(isTrackingRecord))
  )
}

const isPacketaBranch = (value: unknown): value is PacketaBranch => {
  if (!isRecord(value) || typeof value["id"] !== "number") {
    return false
  }
  return hasStringProperties(value, [
    "city",
    "country",
    "name",
    "nameStreet",
    "street",
    "zip",
  ])
}

const getBranchArray = (value: unknown): PacketaBranch[] =>
  Array.isArray(value) ? value.filter(isPacketaBranch) : []

type RetryAttemptResult<T> =
  | { retry: true; error: Error }
  | { retry: false; value: T }

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

  private readonly options: PacketaOptions
  private readonly xmlParser: XMLParser

  constructor(options: PacketaOptions) {
    this.options = options
    this.xmlParser = new XMLParser({
      ignoreAttributes: true,
      // Force these to always be arrays even when the API returns a single child.
      isArray: (name) => name === "record",
      parseTagValue: true,
    })
  }

  // ============================================
  // Shipment Operations
  // ============================================

  /**
   * Create a packet (synchronous — returns packet ID + barcode immediately).
   */
  async createPacket(
    attributes: PacketaPacketAttributes,
  ): Promise<PacketaCreatePacketResult> {
    const params = {
      packetAttributes: {
        ...attributes,
        eshop: attributes.eshop ?? this.options.sender_label ?? undefined,
      },
    }

    const result = await this.request("createPacket", { params })

    if (!isCreatePacketResult(result)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: createPacket returned no id/barcode",
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
    const raw = await this.request("packetTracking", { params: { packetId } })
    if (!isTrackingResult(raw)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Packeta: packetTracking returned an invalid response",
      )
    }

    const records = raw.record ?? []
    return records.map((r) => ({
      dateTime: r.dateTime,
      state: mapPacketaStatusCode(r.statusCode),
      statusCode: r.statusCode,
      statusName: r.statusName ?? String(r.statusCode),
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
    offset: number = this.options.default_label_offset,
  ): Promise<Buffer> {
    const apiFormat = format === "A6" ? "A6 on A6" : "A7 on A4"
    const result = await this.request("packetLabelPdf", {
      params: { format: apiFormat, offset, packetId },
    })

    if (typeof result !== "string" || result === "") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Packeta: packetLabelPdf returned no PDF data for packet ${packetId}`,
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
        this.options.pickup_points_api_key ?? this.options.api_password,
      ),
    )

    const payload = await this.withRetry(
      async () => await PacketaClient.fetchWithTimeout(url, { method: "GET" }),
      async (response) => {
        if (!response.ok) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Packeta branch feed failed: ${response.status}`,
          )
        }
        const text = await response.text()
        const parsed: unknown = JSON.parse(text)
        return parsed
      },
      `Packeta GET ${url}`,
    )

    if (Array.isArray(payload)) {
      return getBranchArray(payload)
    }
    if (!isRecord(payload)) {
      return []
    }
    const { data, branches } = payload
    if (isRecord(data)) {
      return getBranchArray(data["branches"])
    }
    return getBranchArray(branches)
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
  private async request(
    methodName: string,
    options: RequestOptions = {},
  ): Promise<unknown> {
    const { params = {} } = options

    const xmlBody = serializeXmlElement(methodName, {
      apiPassword: this.options.api_password,
      ...params,
    })

    return await this.withRetry(
      async () =>
        await PacketaClient.fetchWithTimeout(REST_API_URL, {
          body: xmlBody,
          headers: {
            Accept: "text/xml",
            "Content-Type": "text/xml; charset=utf-8",
          },
          method: "POST",
        }),
      async (response) => {
        if (!response.ok) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Packeta request failed: ${response.status} - ${await response.text()}`,
          )
        }

        const text = await response.text()
        if (!text) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Packeta: empty response body from ${methodName}`,
          )
        }

        const parsed: unknown = this.xmlParser.parse(text)
        const envelope = isRecord(parsed) ? parsed["response"] : undefined

        if (!isRecord(envelope)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Packeta ${methodName}: missing <response> element`,
          )
        }

        if (envelope["status"] === "fault") {
          throw PacketaClient.faultToError(envelope, methodName)
        }

        if (envelope["status"] !== "ok") {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Packeta ${methodName}: unexpected status ${JSON.stringify(envelope["status"])}`,
          )
        }

        return envelope["result"]
      },
      `Packeta ${methodName}`,
    )
  }

  private static faultToError(
    envelope: Record<string, unknown>,
    methodName: string,
  ): MedusaError {
    const { detail, fault, string: responseMessage } = envelope
    let message = "unknown fault"
    if (typeof responseMessage === "string") {
      message = responseMessage
    } else if (typeof fault === "string") {
      message = fault
    }
    const detailSuffix =
      detail === undefined || detail === null
        ? ""
        : ` Detail: ${JSON.stringify(detail)}`
    return new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Packeta ${methodName} fault (${String(fault)}): ${message}${detailSuffix}`,
    )
  }

  private static isRetryable(status: number): boolean {
    return status === 429 || status >= 500
  }

  private static async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number = REQUEST_TIMEOUT_MS,
  ): Promise<Response> {
    const timeoutController = new AbortController()
    const controller = new AbortController()
    const requestSignal = init.signal
    const abortFromRequestSignal = () => {
      controller.abort()
    }
    const abortFromTimeout = () => {
      controller.abort()
    }

    if (requestSignal?.aborted === true) {
      controller.abort()
    } else {
      requestSignal?.addEventListener("abort", abortFromRequestSignal, {
        once: true,
      })
    }

    timeoutController.signal.addEventListener("abort", abortFromTimeout, {
      once: true,
    })

    const timeoutId = setTimeout(() => {
      timeoutController.abort()
    }, timeoutMs)

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError" &&
        timeoutController.signal.aborted
      ) {
        const abortError = new Error(
          `Packeta request timed out after ${timeoutMs}ms: ${url}`,
        )
        abortError.name = "AbortError"
        throw abortError
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
      requestSignal?.removeEventListener("abort", abortFromRequestSignal)
      timeoutController.signal.removeEventListener("abort", abortFromTimeout)
    }
  }

  private async withRetry<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    errorContext: string,
  ): Promise<T> {
    const runAttempt = async (attempt: number): Promise<T> => {
      await this.waitBeforeRetry(attempt)
      try {
        const result = await this.runRetryAttempt(
          operation,
          handleResponse,
          attempt,
        )
        if (result.retry) {
          return await runAttempt(attempt + 1)
        }
        return result.value
      } catch (error) {
        const normalizedError = PacketaClient.normalizeRetryError(error)
        this.throwIfFinalAttempt(attempt, errorContext, normalizedError)
        return await runAttempt(attempt + 1)
      }
    }

    return await runAttempt(0)
  }

  private async waitBeforeRetry(attempt: number): Promise<void> {
    if (attempt === 0) {
      return
    }

    await sleep(this.INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1))
  }

  private async runRetryAttempt<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    attempt: number,
  ): Promise<RetryAttemptResult<T>> {
    const response = await operation()

    if (
      PacketaClient.isRetryable(response.status) &&
      attempt < this.MAX_RETRIES
    ) {
      return {
        error: new Error(`${response.status} - ${await response.text()}`),
        retry: true,
      }
    }

    return {
      retry: false,
      value: await handleResponse(response),
    }
  }

  private static normalizeRetryError(error: unknown): Error {
    if (error instanceof MedusaError) {
      throw error
    }

    return error instanceof Error ? error : new Error(String(error))
  }

  private throwIfFinalAttempt(
    attempt: number,
    errorContext: string,
    lastError: Error,
  ): void {
    if (attempt !== this.MAX_RETRIES) {
      return
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${errorContext} after ${this.MAX_RETRIES + 1} attempts: ${lastError.message}`,
    )
  }
}

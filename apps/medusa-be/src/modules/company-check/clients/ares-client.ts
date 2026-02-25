import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  AresEconomicSubjectSchema,
  AresEconomicSubjectSearchResponseSchema,
  AresStandardizedAddressSearchResponseSchema,
} from "../schema"
import type {
  AresClientOptions,
  AresEconomicSubject,
  AresEconomicSubjectSearchRequest,
  AresEconomicSubjectSearchResponse,
  AresStandardizedAddressSearchRequest,
  AresStandardizedAddressSearchResponse,
} from "../types"
import {
  assertResponseOk,
  DEFAULT_RETRY_POLICY,
  fetchWithTimeout,
  parseJson,
  readResponseText,
  withRetry,
} from "../../../utils/http"
import { ICO_REGEX, ICO_REGEX_MESSAGE } from "../constants"

const ARES_TIMEOUT_MS = 10_000

const JSON_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
} as const

export class AresClient {
  private readonly baseUrl_: string

  constructor(options: AresClientOptions) {
    const trimmedUrl = options.baseUrl?.trim()
    if (!trimmedUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "ARES base URL is required"
      )
    }

    this.baseUrl_ = trimmedUrl.replace(/\/+$/, "")
  }

  async getEconomicSubjectByIco(ico: string): Promise<AresEconomicSubject> {
    const normalizedIco = ico.trim()
    if (!ICO_REGEX.test(normalizedIco)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        ICO_REGEX_MESSAGE
      )
    }

    return this.request(
      `/ekonomicke-subjekty/${encodeURIComponent(normalizedIco)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
      AresEconomicSubjectSchema,
      "ARES economic-subject lookup failed"
    )
  }

  async searchEconomicSubjects(
    payload: AresEconomicSubjectSearchRequest
  ): Promise<AresEconomicSubjectSearchResponse> {
    this.assertObjectPayload(payload, "ARES economic-subject search payload")

    return this.request(
      "/ekonomicke-subjekty/vyhledat",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      },
      AresEconomicSubjectSearchResponseSchema,
      "ARES economic-subject search failed"
    )
  }

  async searchStandardizedAddresses(
    payload: AresStandardizedAddressSearchRequest
  ): Promise<AresStandardizedAddressSearchResponse> {
    this.assertObjectPayload(payload, "ARES standardized-address search payload")

    return this.request(
      "/standardizovane-adresy/vyhledat",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      },
      AresStandardizedAddressSearchResponseSchema,
      "ARES standardized-address search failed"
    )
  }

  private async request<TSchema extends z.ZodTypeAny>(
    path: string,
    init: RequestInit,
    schema: TSchema,
    errorContext: string
  ): Promise<z.output<TSchema>> {
    const url = `${this.baseUrl_}${path}`

    return withRetry(
      () => fetchWithTimeout(url, init, ARES_TIMEOUT_MS),
      async (response) => {
        await assertResponseOk(response, errorContext)

        const raw = await readResponseText(response, "ARES response was empty")
        const parsed = parseJson(raw, "ARES response was not valid JSON")

        const result = schema.safeParse(parsed)
        if (!result.success) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            `ARES response validation failed: ${result.error.message}`
          )
        }

        return result.data
      },
      errorContext,
      DEFAULT_RETRY_POLICY
    )
  }

  private assertObjectPayload(payload: unknown, context: string): void {
    if (
      typeof payload !== "object" ||
      payload === null ||
      Array.isArray(payload)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${context} must be an object`
      )
    }
  }
}

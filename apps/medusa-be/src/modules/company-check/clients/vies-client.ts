import { MedusaError } from "@medusajs/framework/utils"
import { ViesCheckVatResponseSchema } from "../schema"
import type {
  ViesCheckVatRequest,
  ViesCheckVatResponse,
  ViesClientOptions,
} from "../types"
import {
  assertResponseOk,
  DEFAULT_RETRY_POLICY,
  DEFAULT_RETRY_TIMEOUT_MS,
  fetchWithTimeout,
  parseJson,
  readResponseText,
  withRetry,
} from "../../../utils/http"

export class ViesClient {
  private readonly baseUrl_: string

  constructor(options: ViesClientOptions) {
    const trimmedUrl = options.baseUrl?.trim()
    if (!trimmedUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "VIES base URL is required"
      )
    }

    this.baseUrl_ = trimmedUrl.replace(/\/+$/, "")
  }

  async checkVatNumber(
    input: ViesCheckVatRequest
  ): Promise<ViesCheckVatResponse> {
    const payload = {
      countryCode: input.countryCode.toUpperCase(),
      vatNumber: input.vatNumber,
    }

    return withRetry(
      () =>
        fetchWithTimeout(
          `${this.baseUrl_}/check-vat-number`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
          DEFAULT_RETRY_TIMEOUT_MS
        ),
      async (response) => {
        await assertResponseOk(response, "VIES request failed")

        const raw = await readResponseText(response, "VIES response was empty")

        const parsed = parseJson(raw, "VIES response was not valid JSON")

        const result = ViesCheckVatResponseSchema.safeParse(parsed)
        if (!result.success) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            `VIES response validation failed: ${result.error.message}`
          )
        }

        return result.data
      },
      "VIES check-vat-number failed",
      DEFAULT_RETRY_POLICY
    )
  }
}

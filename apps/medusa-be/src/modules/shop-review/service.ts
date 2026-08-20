import type { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import type { ApiStoreModuleService, ApiStoreSecretDTO } from "../api-store"
import { API_STORE_MODULE } from "../api-store"
import { assertIntegrationConfigEnabled } from "../api-store/integration-config"
import type {
  FetchHeurekaReviewsInput,
  FetchHeurekaShopReviewsInput,
  HeurekaLocale,
  HeurekaReviewKind,
  ShopReviewProviderResponse,
  ShopReviewTrustSummary,
} from "./types"
import {
  ACCESS_TOKEN_API_STORE_NAME,
  extractZboziAccessToken,
  REFRESH_TOKEN_API_STORE_NAME,
  refreshZboziAccessTokenStore,
} from "./zbozi-token"

const DEFAULT_HEUREKA_LOCALE: HeurekaLocale = "sk"
const HEUREKA_API_STORE_NAMES: Record<HeurekaLocale, string[]> = {
  cs: ["Heureka CZ", "Heureka"],
  sk: ["Heureka SK"],
}
const DEFAULT_HEUREKA_EXPORT_URLS: Record<
  HeurekaLocale,
  Record<HeurekaReviewKind, string>
> = {
  cs: {
    product: "https://www.heureka.cz/direct/dotaznik/export-product-review.php",
    shop: "https://www.heureka.cz/direct/dotaznik/export-review.php",
  },
  sk: {
    product: "https://www.heureka.sk/direct/dotaznik/export-product-review.php",
    shop: "https://www.heureka.sk/direct/dotaznik/export-review.php",
  },
}
const DEFAULT_CONTENT_TYPE = "application/xml; charset=utf-8"
const DEFAULT_JSON_CONTENT_TYPE = "application/json; charset=utf-8"
const REQUEST_TIMEOUT_MS = 15_000
const ZBOZI_REVIEW_SCORE_MONTHS = 24
const ZBOZI_REQUEST_INTERVAL_MS = 1000
const ZBOZI_REVIEWS_PATH_PATTERN = /\/reviews\/?$/

type ZboziShopsResponse = {
  items: Array<{
    premiseId?: unknown
    rating?: unknown
  }>
}

type ZboziReviewsResponse = {
  meta: {
    count?: unknown
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isZboziShopsResponse = (value: unknown): value is ZboziShopsResponse =>
  isRecord(value) && Array.isArray(value.items) && value.items.every(isRecord)

const isZboziReviewsResponse = (
  value: unknown
): value is ZboziReviewsResponse => isRecord(value) && isRecord(value.meta)

type InjectedDependencies = {
  [API_STORE_MODULE]: ApiStoreModuleService
  logger: Logger
}

const getCredentialValue = (
  credentials: Record<string, unknown> | null,
  key: string
): string | null => {
  const value = credentials?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

class ShopReviewModuleService {
  protected readonly apiStoreService_: ApiStoreModuleService
  protected readonly logger_: Logger

  constructor(container: InjectedDependencies) {
    this.apiStoreService_ = container[API_STORE_MODULE]
    this.logger_ = container.logger
  }

  async fetchHeurekaReviews(
    input: FetchHeurekaReviewsInput = {}
  ): Promise<ShopReviewProviderResponse> {
    const locale = input.locale ?? DEFAULT_HEUREKA_LOCALE
    const kind = input.kind ?? "shop"
    const { apiStore, apiStoreName } =
      await this.retrieveHeurekaApiStore(locale)

    if (!apiStore) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `API store config for Heureka ${locale.toUpperCase()} was not found. Tried: ${HEUREKA_API_STORE_NAMES[locale].join(", ")}`
      )
    }

    const apiKey =
      apiStore.api_key ??
      getCredentialValue(apiStore.credentials, "api_key") ??
      getCredentialValue(apiStore.credentials, "key")

    if (!apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `API store config "${apiStoreName}" must contain api_key`
      )
    }

    const url = this.buildHeurekaExportUrl(
      apiStore.api_url,
      apiKey,
      locale,
      kind
    )
    const response = await fetch(url, {
      headers: {
        accept: "application/xml,text/xml,*/*",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = await response.text()

    if (!response.ok) {
      this.logger_.warn(
        `Heureka shop reviews request failed with status ${response.status}`
      )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Heureka shop reviews request failed with status ${response.status}`
      )
    }

    return {
      body,
      content_type:
        response.headers.get("content-type") ?? DEFAULT_CONTENT_TYPE,
      provider: "heureka",
      source_url: this.redactUrl(url),
    }
  }

  async fetchHeurekaShopReviews(
    input: FetchHeurekaShopReviewsInput = {}
  ): Promise<ShopReviewProviderResponse> {
    return this.fetchHeurekaReviews({ ...input, kind: "shop" })
  }

  async fetchZboziShopReviews(): Promise<ShopReviewProviderResponse> {
    const { refreshApiStore, accessApiStore } =
      await this.retrieveZboziApiStores()

    if (!refreshApiStore.api_url) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `API store config "${REFRESH_TOKEN_API_STORE_NAME}" must contain api_url`
      )
    }

    const accessToken = extractZboziAccessToken(accessApiStore)
    const url = this.buildUrl(refreshApiStore.api_url, accessToken)
    const response = await fetch(url, {
      headers: {
        accept: "application/json,*/*",
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = await response.text()

    if (!response.ok) {
      this.logger_.warn(
        `Zboží shop reviews request failed with status ${response.status}`
      )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Zboží shop reviews request failed with status ${response.status}`
      )
    }

    return {
      body,
      content_type:
        response.headers.get("content-type") ?? DEFAULT_JSON_CONTENT_TYPE,
      provider: "zbozi",
      source_url: this.redactUrl(url),
    }
  }

  async fetchZboziShopTrustSummary(): Promise<ShopReviewTrustSummary> {
    const { refreshApiStore, accessApiStore } =
      await this.retrieveZboziApiStores()

    if (!refreshApiStore.api_url) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `API store config "${REFRESH_TOKEN_API_STORE_NAME}" must contain api_url`
      )
    }

    const accessToken = extractZboziAccessToken(accessApiStore)
    const now = new Date()
    const reviewsUrl = this.buildUrl(refreshApiStore.api_url, accessToken)
    const premiseId = reviewsUrl.searchParams.get("premiseId")

    if (!premiseId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `API store config "${REFRESH_TOKEN_API_STORE_NAME}" api_url must contain premiseId`
      )
    }

    const shopsUrl = this.buildZboziShopsUrl(reviewsUrl, premiseId)
    const reviewCountUrl = this.buildZboziReviewCountUrl(reviewsUrl, now)
    const shopsResponse = await this.fetchZboziJson(
      shopsUrl,
      accessToken,
      "shop rating",
      isZboziShopsResponse
    )

    await new Promise<void>((resolve) => {
      setTimeout(resolve, ZBOZI_REQUEST_INTERVAL_MS)
    })

    const reviewsResponse = await this.fetchZboziJson(
      reviewCountUrl,
      accessToken,
      "review count",
      isZboziReviewsResponse
    )
    const shop = shopsResponse.items.find(
      (item) => String(item.premiseId) === premiseId
    )
    const score = typeof shop?.rating === "number" ? shop.rating : Number.NaN
    const reviewCount = Number(reviewsResponse.meta.count)

    if (!(Number.isFinite(score) && score >= 0 && score <= 100)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Zboží shop rating response is missing a valid rating"
      )
    }

    if (!(Number.isInteger(reviewCount) && reviewCount >= 0)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Zboží shop reviews response is missing a valid review count"
      )
    }

    return {
      provider: "zbozi",
      review_count: reviewCount,
      score,
      updated_at: now.toISOString(),
    }
  }

  async retrieveZboziAccessTokenApiStore(): Promise<ApiStoreSecretDTO | null> {
    return this.apiStoreService_.retrieveApiStoreSecretsByName(
      ACCESS_TOKEN_API_STORE_NAME
    )
  }

  async refreshZboziAccessToken(): Promise<{
    accessToken: string
    expiresAt: Date
  }> {
    return refreshZboziAccessTokenStore({
      apiStoreService: this.apiStoreService_,
    })
  }

  private async retrieveZboziApiStores(): Promise<{
    refreshApiStore: ApiStoreSecretDTO
    accessApiStore: ApiStoreSecretDTO | null
  }> {
    const refreshApiStore =
      await this.apiStoreService_.retrieveApiStoreSecretsByName(
        REFRESH_TOKEN_API_STORE_NAME
      )

    if (!refreshApiStore) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `API store config for ${REFRESH_TOKEN_API_STORE_NAME} was not found`
      )
    }
    assertIntegrationConfigEnabled(
      refreshApiStore,
      REFRESH_TOKEN_API_STORE_NAME
    )

    const accessApiStore =
      await this.apiStoreService_.retrieveApiStoreSecretsByName(
        ACCESS_TOKEN_API_STORE_NAME
      )

    return { refreshApiStore, accessApiStore }
  }

  private async retrieveHeurekaApiStore(locale: HeurekaLocale): Promise<{
    apiStore: ApiStoreSecretDTO | null
    apiStoreName: string
  }> {
    const apiStoreNames = HEUREKA_API_STORE_NAMES[locale]

    return this.retrieveApiStoreByNames(apiStoreNames)
  }

  private async retrieveApiStoreByNames(apiStoreNames: string[]): Promise<{
    apiStore: ApiStoreSecretDTO | null
    apiStoreName: string
  }> {
    for (const apiStoreName of apiStoreNames) {
      const apiStore =
        await this.apiStoreService_.retrieveApiStoreSecretsByName(apiStoreName)

      if (apiStore) {
        assertIntegrationConfigEnabled(apiStore, apiStoreName)
        return { apiStore, apiStoreName }
      }
    }

    return {
      apiStore: null,
      apiStoreName: apiStoreNames[0] ?? "API Store",
    }
  }

  private buildHeurekaExportUrl(
    apiUrl: string | null,
    apiKey: string,
    locale: HeurekaLocale,
    kind: HeurekaReviewKind
  ): string {
    const configuredUrl = apiUrl?.trim()
    const rawUrl = configuredUrl
      ? configuredUrl
      : DEFAULT_HEUREKA_EXPORT_URLS[locale][kind]
    const url = this.buildUrl(rawUrl, apiKey)
    const key = url.searchParams.get("key")

    if (!key) {
      url.searchParams.set("key", apiKey)
    }

    return url.toString()
  }

  private buildZboziShopsUrl(reviewsUrl: URL, premiseId: string): URL {
    const url = new URL(reviewsUrl)
    const shopsPath = url.pathname.replace(
      ZBOZI_REVIEWS_PATH_PATTERN,
      "/shops/"
    )

    if (shopsPath === url.pathname) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `API store config "${REFRESH_TOKEN_API_STORE_NAME}" api_url must point to the Fenix reviews endpoint`
      )
    }

    url.pathname = shopsPath
    url.search = ""
    url.searchParams.append("id", premiseId)
    url.searchParams.set("premiseId", premiseId)

    return url
  }

  private buildZboziReviewCountUrl(reviewsUrl: URL, now: Date): URL {
    const url = new URL(reviewsUrl)
    const from = new Date(now)
    from.setUTCMonth(from.getUTCMonth() - ZBOZI_REVIEW_SCORE_MONTHS)

    url.searchParams.set("fromDatetime", from.toISOString())
    url.searchParams.set("toDatetime", now.toISOString())
    url.searchParams.set("limit", "1")
    url.searchParams.set("offset", "0")

    return url
  }

  private async fetchZboziJson<T>(
    url: URL,
    accessToken: string,
    resourceLabel: string,
    isExpectedResponse: (value: unknown) => value is T
  ): Promise<T> {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!response.ok) {
      this.logger_.warn(
        `Zboží ${resourceLabel} request failed with status ${response.status}`
      )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Zboží ${resourceLabel} request failed with status ${response.status}`
      )
    }

    let data: unknown
    try {
      data = await response.json()
    } catch {
      this.logger_.warn(`Zboží ${resourceLabel} response returned invalid JSON`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Zboží ${resourceLabel} response returned invalid JSON`
      )
    }

    if (!data) {
      this.logger_.warn(`Zboží ${resourceLabel} response returned no data`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Zboží ${resourceLabel} response returned no data`
      )
    }

    if (!isExpectedResponse(data)) {
      this.logger_.warn(`Zboží ${resourceLabel} response has an invalid shape`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Zboží ${resourceLabel} response has an invalid shape`
      )
    }

    return data
  }

  private buildUrl(rawUrl: string, apiKey: string): URL {
    const url = new URL(rawUrl.replace("API_KEY", apiKey))

    for (const secretParam of ["key", "api_key", "access_token", "token"]) {
      if (url.searchParams.get(secretParam) === "") {
        url.searchParams.set(secretParam, apiKey)
      }
    }

    return url
  }

  private redactUrl(url: string | URL): string {
    const parsedUrl = new URL(url.toString())
    for (const secretParam of ["key", "api_key", "access_token", "token"]) {
      if (parsedUrl.searchParams.has(secretParam)) {
        parsedUrl.searchParams.set(secretParam, "[REDACTED]")
      }
    }
    return parsedUrl.toString()
  }
}

export default ShopReviewModuleService

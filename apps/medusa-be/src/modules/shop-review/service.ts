import type { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import type { ApiStoreModuleService, ApiStoreSecretDTO } from "../api-store"
import { API_STORE_MODULE } from "../api-store"
import type {
  FetchHeurekaShopReviewsInput,
  HeurekaLocale,
  ShopReviewProviderResponse,
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
const DEFAULT_HEUREKA_EXPORT_URLS: Record<HeurekaLocale, string> = {
  cs: "https://www.heureka.cz/direct/dotaznik/export-review.php",
  sk: "https://www.heureka.sk/direct/dotaznik/export-review.php",
}
const DEFAULT_CONTENT_TYPE = "application/xml; charset=utf-8"
const DEFAULT_JSON_CONTENT_TYPE = "application/json; charset=utf-8"
const REQUEST_TIMEOUT_MS = 15_000

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

  async fetchHeurekaShopReviews(
    input: FetchHeurekaShopReviewsInput = {}
  ): Promise<ShopReviewProviderResponse> {
    const locale = input.locale ?? DEFAULT_HEUREKA_LOCALE
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

    const url = this.buildHeurekaExportUrl(apiStore.api_url, apiKey, locale)
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
    locale: HeurekaLocale
  ): string {
    const rawUrl = apiUrl || DEFAULT_HEUREKA_EXPORT_URLS[locale]
    const url = this.buildUrl(rawUrl, apiKey)
    const key = url.searchParams.get("key")

    if (!key) {
      url.searchParams.set("key", apiKey)
    }

    return url.toString()
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

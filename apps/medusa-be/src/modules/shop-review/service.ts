import type { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { getRecordValue, isRecord } from "@techsio/std/object"

import type {
  ApiStoreCredentials,
  ApiStoreModuleService,
  ApiStoreSecretDTO,
} from "../api-store"
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

interface InjectedDependencies {
  [API_STORE_MODULE]: ApiStoreModuleService
  logger: Logger
}

const getCredentialValue = (
  credentials: ApiStoreCredentials | null,
  key: string,
): string | null => {
  const value = isRecord(credentials)
    ? getRecordValue(credentials, key)
    : undefined
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

class ShopReviewModuleService {
  protected readonly apiStoreService: ApiStoreModuleService
  protected readonly logger: Pick<Logger, "warn">

  constructor(container: InjectedDependencies) {
    this.apiStoreService = container[API_STORE_MODULE]
    this.logger = container.logger
  }

  async fetchHeurekaShopReviews(
    input: FetchHeurekaShopReviewsInput = {},
  ): Promise<ShopReviewProviderResponse> {
    const locale = input.locale ?? DEFAULT_HEUREKA_LOCALE
    const { apiStore, apiStoreName } =
      await this.retrieveHeurekaApiStore(locale)

    if (apiStore === null) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `API store config for Heureka ${locale.toUpperCase()} was not found. Tried: ${HEUREKA_API_STORE_NAMES[locale].join(", ")}`,
      )
    }

    const apiKey =
      apiStore.api_key ??
      getCredentialValue(apiStore.credentials, "api_key") ??
      getCredentialValue(apiStore.credentials, "key")

    if (apiKey === null || apiKey === "") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `API store config "${apiStoreName}" must contain api_key`,
      )
    }

    const url = ShopReviewModuleService.buildHeurekaExportUrl(
      apiStore.api_url,
      apiKey,
      locale,
    )
    const response = await fetch(url, {
      headers: {
        accept: "application/xml,text/xml,*/*",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = await response.text()

    if (!response.ok) {
      this.logger.warn(
        `Heureka shop reviews request failed with status ${response.status}`,
      )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Heureka shop reviews request failed with status ${response.status}`,
      )
    }

    return {
      body,
      content_type:
        response.headers.get("content-type") ?? DEFAULT_CONTENT_TYPE,
      provider: "heureka",
      source_url: ShopReviewModuleService.redactUrl(url),
    }
  }

  async fetchZboziShopReviews(): Promise<ShopReviewProviderResponse> {
    const { refreshApiStore, accessApiStore } =
      await this.retrieveZboziApiStores()

    if (refreshApiStore.api_url === null || refreshApiStore.api_url === "") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `API store config "${REFRESH_TOKEN_API_STORE_NAME}" must contain api_url`,
      )
    }

    const accessToken = extractZboziAccessToken(accessApiStore)
    const url = ShopReviewModuleService.buildUrl(
      refreshApiStore.api_url,
      accessToken,
    )
    const response = await fetch(url, {
      headers: {
        accept: "application/json,*/*",
        authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    const body = await response.text()

    if (!response.ok) {
      this.logger.warn(
        `Zboží shop reviews request failed with status ${response.status}`,
      )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Zboží shop reviews request failed with status ${response.status}`,
      )
    }

    return {
      body,
      content_type:
        response.headers.get("content-type") ?? DEFAULT_JSON_CONTENT_TYPE,
      provider: "zbozi",
      source_url: ShopReviewModuleService.redactUrl(url),
    }
  }

  async retrieveZboziAccessTokenApiStore(): Promise<ApiStoreSecretDTO | null> {
    return await this.apiStoreService.retrieveApiStoreSecretsByName(
      ACCESS_TOKEN_API_STORE_NAME,
    )
  }

  async refreshZboziAccessToken(): Promise<{
    accessToken: string
    expiresAt: Date
  }> {
    return await refreshZboziAccessTokenStore({
      apiStoreService: this.apiStoreService,
    })
  }

  private async retrieveZboziApiStores(): Promise<{
    refreshApiStore: ApiStoreSecretDTO
    accessApiStore: ApiStoreSecretDTO | null
  }> {
    const refreshApiStore =
      await this.apiStoreService.retrieveApiStoreSecretsByName(
        REFRESH_TOKEN_API_STORE_NAME,
      )

    if (refreshApiStore === null) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `API store config for ${REFRESH_TOKEN_API_STORE_NAME} was not found`,
      )
    }

    const accessApiStore =
      await this.apiStoreService.retrieveApiStoreSecretsByName(
        ACCESS_TOKEN_API_STORE_NAME,
      )

    return { accessApiStore, refreshApiStore }
  }

  private async retrieveHeurekaApiStore(locale: HeurekaLocale): Promise<{
    apiStore: ApiStoreSecretDTO | null
    apiStoreName: string
  }> {
    const apiStoreNames = HEUREKA_API_STORE_NAMES[locale]

    return await this.retrieveApiStoreByNames(apiStoreNames)
  }

  private async retrieveApiStoreByNames(apiStoreNames: string[]): Promise<{
    apiStore: ApiStoreSecretDTO | null
    apiStoreName: string
  }> {
    const apiStores = await Promise.all(
      apiStoreNames.map(async (apiStoreName) => ({
        apiStore:
          await this.apiStoreService.retrieveApiStoreSecretsByName(
            apiStoreName,
          ),
        apiStoreName,
      })),
    )
    return (
      apiStores.find(({ apiStore }) => apiStore !== null) ?? {
        apiStore: null,
        apiStoreName: apiStoreNames[0] ?? "API Store",
      }
    )
  }

  private static buildHeurekaExportUrl(
    apiUrl: string | null,
    apiKey: string,
    locale: HeurekaLocale,
  ): string {
    const rawUrl =
      apiUrl === null || apiUrl === ""
        ? DEFAULT_HEUREKA_EXPORT_URLS[locale]
        : apiUrl
    const url = ShopReviewModuleService.buildUrl(rawUrl, apiKey)
    const key = url.searchParams.get("key")

    if (key === null || key === "") {
      url.searchParams.set("key", apiKey)
    }

    return url.toString()
  }

  private static buildUrl(rawUrl: string, apiKey: string): URL {
    const url = new URL(rawUrl.replace("API_KEY", apiKey))

    for (const secretParam of ["key", "api_key", "access_token", "token"]) {
      if (url.searchParams.get(secretParam) === "") {
        url.searchParams.set(secretParam, apiKey)
      }
    }

    return url
  }

  private static redactUrl(url: string | URL): string {
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

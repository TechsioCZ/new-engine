import { MedusaError } from "@medusajs/framework/utils"
import type { ApiStoreModuleService } from "../api-store"
import {
  getCredentialValue,
  normalizeSecret,
  toValidDate,
  type ZboziApiStoreTokenSource,
} from "./zbozi-token-normalizers"

export const REFRESH_TOKEN_API_STORE_NAME = "Zboží"
export const ACCESS_TOKEN_API_STORE_NAME = "Zboží Access token"
export const ZBOZI_TOKEN_URL = "https://api.sklik.cz/v1/user/token"

export {
  calculateNextRefreshDelayMs,
  shouldRefreshZboziAccessToken,
  ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS,
} from "./zbozi-token-helpers"
export type { ZboziApiStoreTokenSource } from "./zbozi-token-normalizers"

export function extractZboziRefreshToken(
  apiStore: ZboziApiStoreTokenSource | null
): string {
  const refreshToken = normalizeSecret(apiStore?.api_key)

  if (!refreshToken) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `API store config "${REFRESH_TOKEN_API_STORE_NAME}" must contain api_key`
    )
  }

  return refreshToken
}

export function extractZboziAccessToken(
  apiStore: ZboziApiStoreTokenSource | null,
  now = new Date()
): string {
  const accessToken = normalizeSecret(apiStore?.api_key)
  const expiresAt = toValidDate(apiStore?.access_token_expires_at)

  if (!(accessToken && expiresAt && expiresAt.getTime() > now.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Zboží access token is missing or expired"
    )
  }

  return accessToken
}

export function parseZboziTokenResponse(
  data: { access_token?: unknown; expires_in?: unknown },
  now = new Date()
): { accessToken: string; expiresAt: Date } {
  const accessToken = normalizeSecret(data.access_token)
  const expiresIn = Number(data.expires_in)

  if (!accessToken) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Zboží access token response must contain access_token"
    )
  }

  if (!(Number.isFinite(expiresIn) && expiresIn > 0)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Zboží access token response must contain expires_in"
    )
  }

  return {
    accessToken,
    expiresAt: new Date(now.getTime() + expiresIn * 1000),
  }
}

export async function refreshZboziAccessTokenStore({
  apiStoreService,
  fetchImpl = fetch,
  now = new Date(),
}: {
  apiStoreService: ApiStoreModuleService
  fetchImpl?: typeof fetch
  now?: Date
}): Promise<{ accessToken: string; expiresAt: Date }> {
  const refreshApiStore = await apiStoreService.retrieveApiStoreSecretsByName(
    REFRESH_TOKEN_API_STORE_NAME
  )
  if (!refreshApiStore) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `API store config for ${REFRESH_TOKEN_API_STORE_NAME} was not found`
    )
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
  })
  const userId = getCredentialValue(refreshApiStore.credentials, "user_id")
  const clientId = getCredentialValue(refreshApiStore.credentials, "client_id")
  const clientSecret = getCredentialValue(
    refreshApiStore.credentials,
    "client_secret"
  )

  if (userId) {
    body.set("user_id", userId)
  }
  if (clientId) {
    body.set("client_id", clientId)
  }
  if (clientSecret) {
    body.set("client_secret", clientSecret)
  }

  const response = await fetchImpl(ZBOZI_TOKEN_URL, {
    body,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${extractZboziRefreshToken(refreshApiStore)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  })
  const data = (await response.json().catch(() => null)) as {
    access_token?: unknown
    expires_in?: unknown
  } | null

  if (!(response.ok && data)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Zboží access token request failed with status ${response.status}`
    )
  }

  const token = parseZboziTokenResponse(data, now)
  await apiStoreService.upsertApiStoreConfigByName({
    name: ACCESS_TOKEN_API_STORE_NAME,
    api_key: token.accessToken,
    is_internal: true,
    access_token_expires_at: token.expiresAt,
  })

  return token
}

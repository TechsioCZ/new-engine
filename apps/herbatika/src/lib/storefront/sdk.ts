import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "@techsio/storefront-data/shared/local-storage"
import {
  createMedusaSdk,
  type MedusaClientConfig,
} from "@techsio/storefront-data/shared/medusa-client"
import { resolveClientMedusaGatewayBaseUrl } from "./client-medusa-gateway"

export const AUTH_TOKEN_STORAGE_KEY = "herbatika_auth_token"
export const AUTH_SESSION_LOGOUT_STORAGE_KEY = "herbatika_auth_session_logout"
export type StorefrontAuthMode = "jwt_localstorage" | "session_proxy"

const DEFAULT_AUTH_MODE: StorefrontAuthMode = "session_proxy"

const CLIENT_MEDUSA_GATEWAY_URL = resolveClientMedusaGatewayBaseUrl(
  typeof globalThis.location === "undefined"
    ? undefined
    : globalThis.location.origin
)

const resolveAuthMode = (): StorefrontAuthMode => {
  const rawMode =
    process.env.NEXT_PUBLIC_STOREFRONT_AUTH_MODE?.trim().toLowerCase()

  if (!rawMode) {
    return DEFAULT_AUTH_MODE
  }

  if (rawMode === "jwt_localstorage" || rawMode === "session_proxy") {
    return rawMode
  }

  if (process.env.NODE_ENV !== "test") {
    console.warn(
      `Unsupported NEXT_PUBLIC_STOREFRONT_AUTH_MODE="${rawMode}". Falling back to "${DEFAULT_AUTH_MODE}".`
    )
  }

  return DEFAULT_AUTH_MODE
}

export const STOREFRONT_AUTH_MODE = resolveAuthMode()
export const isSessionProxyAuthMode = STOREFRONT_AUTH_MODE === "session_proxy"

let inMemoryAuthToken: string | null = null

export const authTokenStorage = {
  set(token: string) {
    if (isSessionProxyAuthMode) {
      inMemoryAuthToken = token
      removeLocalStorageItem(AUTH_TOKEN_STORAGE_KEY)
      return
    }

    setLocalStorageItem(AUTH_TOKEN_STORAGE_KEY, token)
  },
  get() {
    if (isSessionProxyAuthMode) {
      return inMemoryAuthToken
    }

    return getLocalStorageItem(AUTH_TOKEN_STORAGE_KEY)
  },
  clear() {
    if (isSessionProxyAuthMode) {
      inMemoryAuthToken = null
    }

    removeLocalStorageItem(AUTH_TOKEN_STORAGE_KEY)
  },
}

export const broadcastAuthSessionLogout = () => {
  setLocalStorageItem(AUTH_SESSION_LOGOUT_STORAGE_KEY, String(Date.now()))
}

const medusaClientConfig: MedusaClientConfig = {
  baseUrl: CLIENT_MEDUSA_GATEWAY_URL,
  debug: process.env.NODE_ENV === "development",
  auth: {
    fetchCredentials: "same-origin",
    type: "jwt",
    jwtTokenStorageKey: AUTH_TOKEN_STORAGE_KEY,
    jwtTokenStorageMethod: isSessionProxyAuthMode ? "memory" : "local",
  },
}

export const storefrontSdk = createMedusaSdk(medusaClientConfig)

export const storefrontConfig = {
  backendUrl: CLIENT_MEDUSA_GATEWAY_URL,
}

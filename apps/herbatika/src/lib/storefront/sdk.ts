import { getRecordValue } from "@techsio/std/object"
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "@techsio/storefront-data/shared/local-storage"
import { createMedusaSdk } from "@techsio/storefront-data/shared/medusa-client"
import type { MedusaClientConfig } from "@techsio/storefront-data/shared/medusa-client"

import { resolveMedusaBackendUrl } from "./runtime-env"

const AUTH_TOKEN_STORAGE_KEY = "herbatika_auth_token"
export const AUTH_SESSION_LOGOUT_STORAGE_KEY = "herbatika_auth_session_logout"
type StorefrontAuthMode = "jwt_localstorage" | "session_proxy"

const DEFAULT_AUTH_MODE: StorefrontAuthMode = "session_proxy"

const MEDUSA_BACKEND_URL = resolveMedusaBackendUrl()
const publishableKey = getRecordValue(
  process.env,
  "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
)
const MEDUSA_PUBLISHABLE_KEY =
  typeof publishableKey === "string" ? publishableKey : ""

const resolveAuthMode = (): StorefrontAuthMode => {
  const rawModeValue = getRecordValue(
    process.env,
    "NEXT_PUBLIC_STOREFRONT_AUTH_MODE",
  )
  if (typeof rawModeValue !== "string") {
    return DEFAULT_AUTH_MODE
  }
  const rawMode = rawModeValue.trim().toLowerCase()

  if (rawMode.length === 0) {
    return DEFAULT_AUTH_MODE
  }

  if (rawMode === "jwt_localstorage" || rawMode === "session_proxy") {
    return rawMode
  }

  if (process.env.NODE_ENV !== "test") {
    console.warn(
      `Unsupported NEXT_PUBLIC_STOREFRONT_AUTH_MODE="${rawMode}". Falling back to "${DEFAULT_AUTH_MODE}".`,
    )
  }

  return DEFAULT_AUTH_MODE
}

const STOREFRONT_AUTH_MODE = resolveAuthMode()
export const isSessionProxyAuthMode = STOREFRONT_AUTH_MODE === "session_proxy"

if (MEDUSA_PUBLISHABLE_KEY.length === 0 && process.env.NODE_ENV !== "test") {
  console.warn(
    "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set. Storefront requests may be rejected by Medusa.",
  )
}

let inMemoryAuthToken: string | null = null

export const authTokenStorage = {
  clear() {
    if (isSessionProxyAuthMode) {
      inMemoryAuthToken = null
    }

    removeLocalStorageItem(AUTH_TOKEN_STORAGE_KEY)
  },
  get() {
    if (isSessionProxyAuthMode) {
      return inMemoryAuthToken
    }

    return getLocalStorageItem(AUTH_TOKEN_STORAGE_KEY)
  },
  set(token: string) {
    if (isSessionProxyAuthMode) {
      inMemoryAuthToken = token
      removeLocalStorageItem(AUTH_TOKEN_STORAGE_KEY)
      return
    }

    setLocalStorageItem(AUTH_TOKEN_STORAGE_KEY, token)
  },
}

export const broadcastAuthSessionLogout = () => {
  setLocalStorageItem(AUTH_SESSION_LOGOUT_STORAGE_KEY, String(Date.now()))
}

const medusaClientConfig: MedusaClientConfig = {
  auth: {
    jwtTokenStorageKey: AUTH_TOKEN_STORAGE_KEY,
    jwtTokenStorageMethod: isSessionProxyAuthMode ? "memory" : "local",
    type: "jwt",
  },
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
}

export const storefrontSdk = createMedusaSdk(medusaClientConfig)

export const storefrontConfig = {
  backendUrl: MEDUSA_BACKEND_URL,
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
}

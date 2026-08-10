import Medusa from "@medusajs/js-sdk"

import { STORAGE_KEYS } from "./constants"

// Environment validation
const BACKEND_URL_ENV_KEY = "NEXT_PUBLIC_MEDUSA_BACKEND_URL"
const PUBLISHABLE_KEY_ENV_KEY = "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY"
const BACKEND_URL = process.env[BACKEND_URL_ENV_KEY] ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env[PUBLISHABLE_KEY_ENV_KEY] ?? ""

if (PUBLISHABLE_KEY.length === 0) {
  console.warn("⚠️ NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set!")
}

// Custom storage implementation
const customStorage = {
  getItem: (key: string) => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(key)
    }
    return null
  },
  removeItem: (key: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key)
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value)
    }
  },
}

// Function to create SDK instance
const createSDK = () => {
  if (typeof window === "undefined") {
    return new Medusa({
      baseUrl: BACKEND_URL,
      publishableKey: PUBLISHABLE_KEY,
      // No auth for server-side/static generation
    })
  }

  const sdkInstance = new Medusa({
    auth: {
      jwtTokenStorageKey: STORAGE_KEYS.AUTH_TOKEN,
      jwtTokenStorageMethod: "custom",
      storage: customStorage,
      type: "jwt",
    },
    baseUrl: BACKEND_URL,
    // Add debug logging
    debug: process.env.NODE_ENV === "development",
    publishableKey: PUBLISHABLE_KEY,
  })

  return sdkInstance
}

// Create SDK instance
export const sdk = createSDK()

// Initialize auth on client side
if (typeof window !== "undefined") {
  // Try to refresh token if it exists
  const initializeAuth = async () => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    if (token !== null && token.length > 0) {
      try {
        await sdk.auth.refresh()
      } catch (error) {
        console.warn("[Auth] Token refresh failed during initialization", error)
      }
    }
  }
  void initializeAuth()
}

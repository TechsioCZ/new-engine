import Medusa from "@medusajs/js-sdk"
import { clearStoredAuthToken } from "./auth-token"
import { STORAGE_KEYS } from "./constants"

// Environment validation
const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

if (!PUBLISHABLE_KEY) {
  console.warn("⚠️ NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set!")
}

// Custom storage implementation
const customStorage = {
  setItem: (key: string, value: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value)
    }
  },
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
    baseUrl: BACKEND_URL,
    publishableKey: PUBLISHABLE_KEY,
    auth: {
      type: "jwt",
      jwtTokenStorageKey: STORAGE_KEYS.AUTH_TOKEN,
      jwtTokenStorageMethod: "custom",
      storage: customStorage,
    },
    // Add debug logging
    debug: process.env.NODE_ENV === "development",
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
    if (token && sdk.auth) {
      try {
        await sdk.auth.refresh()
      } catch (error) {
        clearStoredAuthToken()
      }
    }
  }
  initializeAuth()
}

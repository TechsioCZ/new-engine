import { createMedusaSdk } from "@techsio/storefront-data/shared/medusa-client"

// Environment validation
const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const LEGACY_AUTH_TOKEN_STORAGE_KEY = "medusa_auth_token"

if (!PUBLISHABLE_KEY) {
  console.warn("âš ď¸Ź NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set!")
}

export const sdk = createMedusaSdk({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
  auth: {
    type: "session",
    fetchCredentials: "include",
    // Session mode still uses a token briefly during login/register; keep it
    // in memory only so we do not persist customer auth into localStorage.
    jwtTokenStorageMethod: "memory",
  },
  debug: process.env.NODE_ENV === "development",
})

if (typeof window !== "undefined") {
  // Cleanup stale tokens from the previous JWT/localStorage auth model.
  window.localStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY)
}

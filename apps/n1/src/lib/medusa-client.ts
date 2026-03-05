import { createMedusaSdk } from "@techsio/storefront-data/shared/medusa-client"
import { getMedusaBackendUrl } from "@/lib/medusa-backend-url"

// Environment validation
const BACKEND_URL = getMedusaBackendUrl()
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

if (!PUBLISHABLE_KEY) {
  console.warn("⚠️ NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set!")
}

// Create SDK instance through storefront-data helper for consistent behavior.
export const sdk = createMedusaSdk({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
  debug: process.env.NODE_ENV === "development",
})

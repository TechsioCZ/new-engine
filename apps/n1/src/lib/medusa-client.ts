import Medusa from "@medusajs/js-sdk"
import { getMedusaBackendUrl } from "@/lib/medusa-backend-url"

// Environment validation
const BACKEND_URL = getMedusaBackendUrl()
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

if (!PUBLISHABLE_KEY) {
  console.warn("⚠️ NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not set!")
}

// Create SDK instance (uses JWT + localStorage by default)
export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_KEY,
  debug: process.env.NODE_ENV === "development",
})

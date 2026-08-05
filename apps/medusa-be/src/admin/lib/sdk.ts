import Medusa from "@medusajs/js-sdk"

export const sdk = new Medusa({
  auth: {
    type: "session",
  },
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
})

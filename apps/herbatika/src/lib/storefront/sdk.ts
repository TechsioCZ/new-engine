import {
  createMedusaSdk,
  type MedusaClientConfig,
} from "@techsio/storefront-data/shared/medusa-client"
import { resolveClientMedusaGatewayBaseUrl } from "./client-medusa-gateway"

const CLIENT_MEDUSA_GATEWAY_URL = resolveClientMedusaGatewayBaseUrl(
  typeof globalThis.location === "undefined"
    ? undefined
    : globalThis.location.origin
)

const medusaClientConfig: MedusaClientConfig = {
  baseUrl: CLIENT_MEDUSA_GATEWAY_URL,
  debug: process.env.NODE_ENV === "development",
  auth: {
    fetchCredentials: "same-origin",
    type: "jwt",
    jwtTokenStorageMethod: "memory",
  },
}

export const storefrontSdk = createMedusaSdk(medusaClientConfig)

export const storefrontConfig = {
  backendUrl: CLIENT_MEDUSA_GATEWAY_URL,
}

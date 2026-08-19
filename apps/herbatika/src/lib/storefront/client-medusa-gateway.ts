const CLIENT_MEDUSA_GATEWAY_PATH = "/api/storefront-medusa"
const SERVER_GUARD_ORIGIN = "https://client-medusa-gateway.invalid"

export const resolveClientMedusaGatewayBaseUrl = (
  browserOrigin?: string
): string =>
  new URL(
    CLIENT_MEDUSA_GATEWAY_PATH,
    browserOrigin ?? SERVER_GUARD_ORIGIN
  ).toString()

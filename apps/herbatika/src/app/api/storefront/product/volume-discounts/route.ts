import { getSessionTokenFromCookieHeader } from "@/app/api/storefront-auth/_lib"
import { handleVolumeDiscountGatewayFromMedusa } from "@/lib/storefront/volume-discounts-gateway.server"

export function GET(request: Request) {
  const authToken = getSessionTokenFromCookieHeader(
    request.headers.get("cookie")
  )

  return handleVolumeDiscountGatewayFromMedusa(request, authToken)
}

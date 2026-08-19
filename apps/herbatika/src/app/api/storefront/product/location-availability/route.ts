import { handleProductLocationAvailabilityGatewayFromMedusa } from "@/lib/storefront/product-location-availability-gateway.server"

export function GET(request: Request) {
  return handleProductLocationAvailabilityGatewayFromMedusa(request)
}

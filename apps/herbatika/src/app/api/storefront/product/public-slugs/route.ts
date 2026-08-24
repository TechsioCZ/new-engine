import { handleProductPublicSlugsRequest } from "@/lib/storefront/product-public-slugs-gateway.server"

export function GET(request: Request) {
  return handleProductPublicSlugsRequest(request)
}

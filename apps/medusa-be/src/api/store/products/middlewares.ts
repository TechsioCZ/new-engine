import type { MiddlewareRoute } from "@medusajs/framework/http"
import { enforceExactStorefrontMarketSalesChannel } from "../storefront-market-sales-channel"

export const storeProductMarketScopeRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/products",
    middlewares: [enforceExactStorefrontMarketSalesChannel],
  },
  {
    methods: ["GET"],
    matcher: "/store/products/:id",
    middlewares: [enforceExactStorefrontMarketSalesChannel],
  },
]

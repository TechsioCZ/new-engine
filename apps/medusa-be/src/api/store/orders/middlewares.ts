import type { MiddlewareRoute } from "@medusajs/framework/http"
import { enforceExactStorefrontMarketSalesChannel } from "../storefront-market-sales-channel"

export const storeOrderMarketScopeRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/orders",
    // Core StoreGetOrdersParams validation runs before project route middleware.
    // Apply the trusted market after validation so caller filters cannot widen it.
    middlewares: [enforceExactStorefrontMarketSalesChannel],
  },
]

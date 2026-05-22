import type { MiddlewareRoute } from "@medusajs/framework/http"
import { authenticate } from "@medusajs/framework/http"

export const symmyPriceListsRoutes: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/api/symmy/v1/price-lists",
    middlewares: [authenticate("user", ["bearer", "session", "api-key"])],
  },
]

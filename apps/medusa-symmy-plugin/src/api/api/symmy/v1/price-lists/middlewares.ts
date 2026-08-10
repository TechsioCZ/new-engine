import type { MiddlewareRoute } from "@medusajs/framework/http"
import { authenticate } from "@medusajs/framework/http"

export const symmyPriceListsRoutes: MiddlewareRoute[] = [
  {
    matcher: "/api/symmy/v1/price-lists",
    methods: ["GET"],
    middlewares: [authenticate("user", ["bearer", "session", "api-key"])],
  },
]

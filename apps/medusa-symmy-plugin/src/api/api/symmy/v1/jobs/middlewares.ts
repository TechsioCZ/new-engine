import type { MiddlewareRoute } from "@medusajs/framework/http"
import { authenticate } from "@medusajs/framework/http"

export const symmyJobRoutes: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/api/symmy/v1/jobs/:id",
    middlewares: [authenticate("user", ["bearer", "session", "api-key"])],
  },
]

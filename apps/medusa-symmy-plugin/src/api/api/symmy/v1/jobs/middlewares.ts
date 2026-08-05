import type { MiddlewareRoute } from "@medusajs/framework/http"
import { authenticate } from "@medusajs/framework/http"

export const symmyJobRoutes: MiddlewareRoute[] = [
  {
    matcher: "/api/symmy/v1/jobs/:id",
    methods: ["GET"],
    middlewares: [authenticate("user", ["bearer", "session", "api-key"])],
  },
]

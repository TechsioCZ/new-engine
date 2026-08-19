import { authenticate, type MiddlewareRoute } from "@medusajs/framework/http"

export const storeOrderConfirmationRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/store/order-confirmations/*",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
    ],
  },
]

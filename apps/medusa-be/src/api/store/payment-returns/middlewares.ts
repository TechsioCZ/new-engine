import { authenticate, type MiddlewareRoute } from "@medusajs/framework/http"

export const storePaymentReturnRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["POST"],
    matcher: "/store/payment-returns/*",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
    ],
  },
]

import { validateAndTransformBody } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { verifyCloudflareTurnstile } from "../../middlewares/cloudflare-turnstile"
import { enforceExactStorefrontMarketSalesChannel } from "../storefront-market-sales-channel"
import {
  StoreCreateClaimSchema,
  StoreRequestClaimAccessSchema,
  StoreVerifyClaimAccessSchema,
} from "./validators"

export const storeClaimRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/claims/order-access/request",
    methods: ["POST"],
    middlewares: [
      enforceExactStorefrontMarketSalesChannel,
      verifyCloudflareTurnstile(),
      validateAndTransformBody(StoreRequestClaimAccessSchema),
    ],
  },
  {
    matcher: "/store/claims/order-access/verify",
    methods: ["POST"],
    middlewares: [
      enforceExactStorefrontMarketSalesChannel,
      validateAndTransformBody(StoreVerifyClaimAccessSchema),
    ],
  },
  {
    matcher: "/store/claims",
    methods: ["POST"],
    middlewares: [
      enforceExactStorefrontMarketSalesChannel,
      verifyCloudflareTurnstile(),
      validateAndTransformBody(StoreCreateClaimSchema),
    ],
  },
]

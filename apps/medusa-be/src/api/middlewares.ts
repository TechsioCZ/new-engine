import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { errorHandler } from "@medusajs/framework/http"
import { defineMiddlewares } from "@medusajs/medusa"
import { captureException } from "@sentry/node"
import { normalizeError, shouldCaptureException } from "../utils/errors"
import { adminBrandRoutesMiddlewares } from "./admin/brands/middlewares"
import { adminMiddlewares } from "./admin/middlewares"
import { adminOrderBusinessStatusesRoutesMiddlewares } from "./admin/order-business-statuses/middlewares"
import { adminOrderExpeditionRoutesMiddlewares } from "./admin/order-expedition/middlewares"
import { adminOrderBusinessStatusRoutesMiddlewares } from "./admin/orders/[id]/business-status/middlewares"
import { adminOrderCommercialValuesRoutesMiddlewares } from "./admin/orders/[id]/commercial-values/middlewares"
import { adminOrderEmailRoutesMiddlewares } from "./admin/orders/[id]/email/middlewares"
import { adminPacketaConfigRoutesMiddlewares } from "./admin/packeta-config/middlewares"
import { adminPacketaLabelsRoutesMiddlewares } from "./admin/packeta-labels/middlewares"
import { adminPayloadSsoRoutesMiddlewares } from "./admin/payload/sso/middlewares"
import { adminPplConfigRoutesMiddlewares } from "./admin/ppl-config/middlewares"
import { adminPromotionsExtensionMiddlewares } from "./admin/promotions/middlewares"
import { adminPublishableKeyRoutesMiddlewares } from "./admin/provisioning/publishable-key/middlewares"
import { adminQrPaymentConfigRoutesMiddlewares } from "./admin/qr-payment-config/middlewares"
import { adminReviewRoutesMiddlewares } from "./admin/reviews/middlewares"
import { serveAdminAppStatic } from "./admin-app-static"
import { storeBrandsRoutesMiddlewares } from "./store/brands/middlewares"
import { storeCatalogProductsRoutesMiddlewares } from "./store/catalog/products/middlewares"
import { storeCmsRoutesMiddlewares } from "./store/cms/middlewares"
import { storeMiddlewares } from "./store/middlewares"
import { storeProductListsRoutesMiddlewares } from "./store/product-lists/middlewares"
import { storeReviewRoutesMiddlewares } from "./store/reviews/middlewares"

const originalErrorHandler = errorHandler()

export default defineMiddlewares({
  errorHandler: (
    error: unknown,
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const normalizedError = normalizeError(error)
    if (shouldCaptureException(error)) {
      captureException(normalizedError)
    }
    return originalErrorHandler(error, req, res, next)
  },
  routes: [
    {
      matcher: "/app*",
      middlewares: [serveAdminAppStatic],
    },
    {
      methods: ["POST"],
      matcher: "/webhooks/*",
      bodyParser: { preserveRawBody: true },
    },
    ...adminMiddlewares,
    ...adminOrderExpeditionRoutesMiddlewares,
    ...adminOrderBusinessStatusesRoutesMiddlewares,
    ...adminOrderCommercialValuesRoutesMiddlewares,
    ...adminOrderBusinessStatusRoutesMiddlewares,
    ...adminOrderEmailRoutesMiddlewares,
    ...adminPayloadSsoRoutesMiddlewares,
    ...adminPacketaConfigRoutesMiddlewares,
    ...adminPacketaLabelsRoutesMiddlewares,
    ...adminPplConfigRoutesMiddlewares,
    ...adminBrandRoutesMiddlewares,
    ...adminPromotionsExtensionMiddlewares,
    ...adminPublishableKeyRoutesMiddlewares,
    ...adminQrPaymentConfigRoutesMiddlewares,
    ...adminReviewRoutesMiddlewares,
    ...storeMiddlewares,
    ...storeCatalogProductsRoutesMiddlewares,
    ...storeCmsRoutesMiddlewares,
    ...storeProductListsRoutesMiddlewares,
    ...storeBrandsRoutesMiddlewares,
    ...storeReviewRoutesMiddlewares,
  ],
})

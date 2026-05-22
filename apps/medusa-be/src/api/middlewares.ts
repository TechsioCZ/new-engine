import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { errorHandler } from "@medusajs/framework/http"
import { defineMiddlewares } from "@medusajs/medusa"
import { captureException } from "@sentry/node"
import { normalizeError, shouldCaptureException } from "../utils/errors"
import { adminOrderBusinessStatusesRoutesMiddlewares } from "./admin/order-business-statuses/middlewares"
import { adminOrderExpeditionRoutesMiddlewares } from "./admin/order-expedition/middlewares"
import { adminOrderBusinessStatusRoutesMiddlewares } from "./admin/orders/[id]/business-status/middlewares"
import { adminOrderCommercialValuesRoutesMiddlewares } from "./admin/orders/[id]/commercial-values/middlewares"
import { adminOrderEmailRoutesMiddlewares } from "./admin/orders/[id]/email/middlewares"
import { adminPacketaConfigRoutesMiddlewares } from "./admin/packeta-config/middlewares"
import { adminPacketaLabelsRoutesMiddlewares } from "./admin/packeta-labels/middlewares"
import { adminPayloadSsoRoutesMiddlewares } from "./admin/payload/sso/middlewares"
import { adminPplConfigRoutesMiddlewares } from "./admin/ppl-config/middlewares"
import { adminProducerRoutesMiddlewares } from "./admin/producers/middlewares"
import { adminPromotionsExtensionMiddlewares } from "./admin/promotions/middlewares"
import { adminPublishableKeyRoutesMiddlewares } from "./admin/provisioning/publishable-key/middlewares"
import { adminQrPaymentConfigRoutesMiddlewares } from "./admin/qr-payment-config/middlewares"
import { storeCatalogProductsRoutesMiddlewares } from "./store/catalog/products/middlewares"
import { storeCmsRoutesMiddlewares } from "./store/cms/middlewares"
import { storeProducersRoutesMiddlewares } from "./store/producers/middlewares"

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
      methods: ["POST"],
      matcher: "/webhooks/*",
      bodyParser: { preserveRawBody: true },
    },
    ...adminOrderExpeditionRoutesMiddlewares,
    ...adminOrderBusinessStatusesRoutesMiddlewares,
    ...adminOrderCommercialValuesRoutesMiddlewares,
    ...adminOrderBusinessStatusRoutesMiddlewares,
    ...adminOrderEmailRoutesMiddlewares,
    ...adminPayloadSsoRoutesMiddlewares,
    ...adminPacketaConfigRoutesMiddlewares,
    ...adminPacketaLabelsRoutesMiddlewares,
    ...adminPplConfigRoutesMiddlewares,
    ...adminProducerRoutesMiddlewares,
    ...adminPromotionsExtensionMiddlewares,
    ...adminPublishableKeyRoutesMiddlewares,
    ...adminQrPaymentConfigRoutesMiddlewares,
    ...storeCatalogProductsRoutesMiddlewares,
    ...storeCmsRoutesMiddlewares,
    ...storeProducersRoutesMiddlewares,
  ],
})

import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { errorHandler } from "@medusajs/framework/http"
import { defineMiddlewares } from "@medusajs/medusa"
import { captureException } from "@sentry/node"

import { normalizeError, shouldCaptureException } from "../utils/errors"
import { serveAdminAppStatic } from "./admin-app-static"
import { adminApiStoreRoutesMiddlewares } from "./admin/api-store/middlewares"
import { adminBrandRoutesMiddlewares } from "./admin/brands/middlewares"
import { adminGLSConfigRoutesMiddlewares } from "./admin/gls-config/middlewares"
import { adminGLSLabelsRoutesMiddlewares } from "./admin/gls-labels/middlewares"
import { adminMeasurementUnitRoutesMiddlewares } from "./admin/measurement-units/middlewares"
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
import { adminProductAttributeRoutesMiddlewares } from "./admin/product-attributes/middlewares"
import { adminPromotionsExtensionMiddlewares } from "./admin/promotions/middlewares"
import { adminPublishableKeyRoutesMiddlewares } from "./admin/provisioning/publishable-key/middlewares"
import { adminQrPaymentConfigRoutesMiddlewares } from "./admin/qr-payment-config/middlewares"
import { adminReviewRoutesMiddlewares } from "./admin/reviews/middlewares"
import { adminSearchProfileRoutesMiddlewares } from "./admin/search-profiles/middlewares"
import { adminStorefrontTextRoutesMiddlewares } from "./admin/storefront-texts/middlewares"
import { storeBrandsRoutesMiddlewares } from "./store/brands/middlewares"
import { storeCatalogProductsRoutesMiddlewares } from "./store/catalog/products/middlewares"
import { storeCmsRoutesMiddlewares } from "./store/cms/middlewares"
import { storeCustomerReviewRoutesMiddlewares } from "./store/customers/me/reviews/middlewares"
import { storeMiddlewares } from "./store/middlewares"
import { storeProductListsRoutesMiddlewares } from "./store/product-lists/middlewares"
import { storeProductLocationAvailabilityRoutesMiddlewares } from "./store/products/[id]/location-availability/middlewares"
import { storeProductAttributesRoutesMiddlewares } from "./store/products/[id]/product-attributes/middlewares"
import { storeReviewRoutesMiddlewares } from "./store/reviews/middlewares"
import { storeSearchAutocompleteRoutesMiddlewares } from "./store/search/autocomplete/middlewares"
import { storeShopReviewRoutesMiddlewares } from "./store/shop-reviews/middlewares"
import { storeStorefrontTextRoutesMiddlewares } from "./store/storefront-texts/middlewares"

const originalErrorHandler = errorHandler()

export default defineMiddlewares({
  errorHandler: (
    error: unknown,
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction,
  ) => {
    const normalizedError = normalizeError(error)
    if (shouldCaptureException(error)) {
      captureException(normalizedError)
    }
    originalErrorHandler(error, req, res, next)
  },
  routes: [
    {
      matcher: "/app*",
      middlewares: [serveAdminAppStatic],
    },
    {
      bodyParser: { preserveRawBody: true },
      matcher: "/webhooks/*",
      methods: ["POST"],
    },
    ...adminMiddlewares,
    ...adminOrderExpeditionRoutesMiddlewares,
    ...adminOrderBusinessStatusesRoutesMiddlewares,
    ...adminOrderCommercialValuesRoutesMiddlewares,
    ...adminOrderBusinessStatusRoutesMiddlewares,
    ...adminOrderEmailRoutesMiddlewares,
    ...adminPayloadSsoRoutesMiddlewares,
    ...adminMeasurementUnitRoutesMiddlewares,
    ...adminGLSConfigRoutesMiddlewares,
    ...adminGLSLabelsRoutesMiddlewares,
    ...adminPacketaConfigRoutesMiddlewares,
    ...adminPacketaLabelsRoutesMiddlewares,
    ...adminPplConfigRoutesMiddlewares,
    ...adminApiStoreRoutesMiddlewares,
    ...adminBrandRoutesMiddlewares,
    ...adminPromotionsExtensionMiddlewares,
    ...adminPublishableKeyRoutesMiddlewares,
    ...adminProductAttributeRoutesMiddlewares,
    ...adminQrPaymentConfigRoutesMiddlewares,
    ...adminReviewRoutesMiddlewares,
    ...adminSearchProfileRoutesMiddlewares,
    ...adminStorefrontTextRoutesMiddlewares,
    ...storeMiddlewares,
    ...storeCustomerReviewRoutesMiddlewares,
    ...storeCatalogProductsRoutesMiddlewares,
    ...storeSearchAutocompleteRoutesMiddlewares,
    ...storeCmsRoutesMiddlewares,
    ...storeProductListsRoutesMiddlewares,
    ...storeProductLocationAvailabilityRoutesMiddlewares,
    ...storeProductAttributesRoutesMiddlewares,
    ...storeBrandsRoutesMiddlewares,
    ...storeReviewRoutesMiddlewares,
    ...storeShopReviewRoutesMiddlewares,
    ...storeStorefrontTextRoutesMiddlewares,
  ],
})

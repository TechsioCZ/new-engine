import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { errorHandler } from "@medusajs/framework/http"
import { defineMiddlewares } from "@medusajs/medusa"
import { captureException } from "@sentry/node"
import { normalizeError, shouldCaptureException } from "../utils/errors"
import { adminMiddlewares } from "./admin/middlewares"
import { companiesCheckRoutesMiddlewares } from "./companies/check/middlewares"
import { adminPplConfigRoutesMiddlewares } from "./admin/ppl-config/middlewares"
import { storeMiddlewares } from "./store/middlewares"
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
    ...companiesCheckRoutesMiddlewares,
    ...adminPplConfigRoutesMiddlewares,
    ...adminMiddlewares,
    ...storeProducersRoutesMiddlewares,
    ...storeMiddlewares,
    {
      matcher: "/store/customers/me",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          req.allowed = ["employee"]
          next()
        },
      ],
    },
  ],
})

import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { StoreGLSBranchesSchema } from "./validators"

export const storeGLSBranchesRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/gls/branches",
    middlewares: [validateAndTransformQuery(StoreGLSBranchesSchema, {})],
  },
]

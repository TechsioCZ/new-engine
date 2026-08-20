import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformBody } from "@medusajs/framework/http"
import { PostAdminPPLLabelsSchema } from "./validators"

export const adminPPLLabelsRoutesMiddlewares: MiddlewareRoute[] =
  process.env.FEATURE_PPL_ENABLED === "1"
    ? [
        {
          methods: ["POST"],
          matcher: "/admin/ppl-labels",
          middlewares: [validateAndTransformBody(PostAdminPPLLabelsSchema)],
        },
      ]
    : []

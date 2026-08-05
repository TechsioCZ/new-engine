import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework/http"

import {
  RuleAttributeOptionsQuerySchema,
  RuleValueOptionsQuerySchema,
} from "./schema"

export const adminPromotionsExtensionMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/promotions/rule-attribute-options/:rule_type",
    method: ["GET"],
    middlewares: [
      validateAndTransformQuery(RuleAttributeOptionsQuerySchema, {}),
    ],
  },
  {
    matcher: "/admin/promotions/rule-value-options/:rule_type/product_variant",
    method: ["GET"],
    middlewares: [validateAndTransformQuery(RuleValueOptionsQuerySchema, {})],
  },
  {
    matcher: "/admin/promotions/rule-value-options/:rule_type/brand",
    method: ["GET"],
    middlewares: [validateAndTransformQuery(RuleValueOptionsQuerySchema, {})],
  },
]

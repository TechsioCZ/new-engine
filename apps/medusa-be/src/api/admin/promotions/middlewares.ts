import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework/http"
import {
  RuleAttributeOptionsQuerySchema,
  RuleValueOptionsQuerySchema,
} from "./schema"

export const adminPromotionsExtensionMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/promotions/rule-attribute-options/:rule_type",
    middlewares: [
      validateAndTransformQuery(RuleAttributeOptionsQuerySchema, {}),
    ],
  },
  {
    method: ["GET"],
    matcher: "/admin/promotions/rule-value-options/:rule_type/product_variant",
    middlewares: [validateAndTransformQuery(RuleValueOptionsQuerySchema, {})],
  },
  {
    method: ["GET"],
    matcher: "/admin/promotions/rule-value-options/:rule_type/producer",
    middlewares: [validateAndTransformQuery(RuleValueOptionsQuerySchema, {})],
  },
]

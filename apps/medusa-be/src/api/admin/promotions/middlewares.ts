import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework/http"

import {
  RuleAttributeOptionsQuerySchema,
  RuleValueOptionsQuerySchema,
} from "./schema"

export const adminPromotionsExtensionMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/promotions/rule-attribute-options/:rule_type",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(RuleAttributeOptionsQuerySchema, {}),
    ],
  },
  {
    matcher: "/admin/promotions/rule-value-options/:rule_type/product_variant",
    methods: ["GET"],
    middlewares: [validateAndTransformQuery(RuleValueOptionsQuerySchema, {})],
  },
  {
    matcher: "/admin/promotions/rule-value-options/:rule_type/brand",
    methods: ["GET"],
    middlewares: [validateAndTransformQuery(RuleValueOptionsQuerySchema, {})],
  },
]

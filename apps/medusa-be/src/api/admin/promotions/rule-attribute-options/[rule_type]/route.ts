import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { RuleType } from "../../types"
import { getExtendedRuleAttributesMap, validateRuleType } from "../../utils"

/**
 * GET /admin/promotions/rule-attribute-options/:rule_type
 *
 * Returns available rule attributes for promotions, extended with custom attributes.
 * This overrides the default Medusa endpoint to add support for product variants.
 *
 * Query params:
 * - promotion_type: "standard" | "buyget"
 * - application_method_type: "fixed" | "percentage"
 * - application_method_target_type: "order" | "items" | "shipping_methods"
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ruleType = req.params.rule_type

  if (!ruleType) {
    throw new Error("rule_type parameter is required")
  }

  validateRuleType(ruleType)

  const attributes =
    getExtendedRuleAttributesMap({
      promotionType: req.query.promotion_type as string | undefined,
      applicationMethodType: req.query.application_method_type as
        | string
        | undefined,
      applicationMethodTargetType: req.query.application_method_target_type as
        | string
        | undefined,
    })[ruleType as RuleType] || []

  res.json({ attributes })
}

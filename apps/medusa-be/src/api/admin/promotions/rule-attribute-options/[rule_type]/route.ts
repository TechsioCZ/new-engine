import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
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
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "rule_type parameter is required"
    )
  }

  validateRuleType(ruleType)

  const {
    promotion_type,
    application_method_type,
    application_method_target_type,
  } = req.validatedQuery
  const attributes =
    getExtendedRuleAttributesMap({
      promotionType: promotion_type,
      applicationMethodType: application_method_type,
      applicationMethodTargetType: application_method_target_type,
    })[ruleType] || []

  res.json({ attributes })
}

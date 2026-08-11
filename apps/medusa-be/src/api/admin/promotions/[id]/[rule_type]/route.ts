import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { HttpTypes } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  RuleOperator,
  RuleType,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import {
  operatorsMap,
  ruleQueryConfigurations,
} from "@medusajs/medusa/api/admin/promotions/utils/index"
import type {
  GetRuleAttributesMapParams,
  PromotionRuleAttribute,
  RuleType as PromotionRuleType,
} from "../../types"
import { getExtendedRuleAttributesMap, validateRuleType } from "../../utils"

type RuleQueryConfigurationKey = keyof typeof ruleQueryConfigurations

type PromotionRuleValue = {
  value: string
  label?: string
}

type PromotionRule = {
  id?: string
  attribute: string
  operator: string
  values?: PromotionRuleValue[] | string | number
  disguised?: boolean
}

type PromotionApplicationMethod = {
  type?: GetRuleAttributesMapParams["applicationMethodType"]
  target_type?: GetRuleAttributesMapParams["applicationMethodTargetType"]
  target_rules?: PromotionRule[]
  buy_rules?: PromotionRule[]
  [key: string]: unknown
}

type PromotionRecord = {
  type?: GetRuleAttributesMapParams["promotionType"]
  rules?: PromotionRule[]
  application_method?: PromotionApplicationMethod
}

type RemoteQuery = (
  query: ReturnType<typeof remoteQueryObjectFromString>
) => Promise<Record<string, unknown>[]>

const isRuleQueryConfigurationKey = (
  value: string
): value is RuleQueryConfigurationKey => value in ruleQueryConfigurations

function assertRuleType(value: string): asserts value is PromotionRuleType {
  validateRuleType(value)
}

function selectPromotionRules(
  promotion: PromotionRecord | undefined,
  normalizedRuleType: string
): PromotionRule[] {
  if (normalizedRuleType === RuleType.RULES) {
    return promotion?.rules ?? []
  }

  if (normalizedRuleType === RuleType.TARGET_RULES) {
    return promotion?.application_method?.target_rules ?? []
  }

  if (normalizedRuleType === RuleType.BUY_RULES) {
    return promotion?.application_method?.buy_rules ?? []
  }

  return []
}

function getDisguisedRuleValues(
  attribute: PromotionRuleAttribute,
  value: unknown
): PromotionRuleValue[] | number | string | undefined {
  if (attribute.field_type === "number") {
    return typeof value === "number" || typeof value === "string"
      ? value
      : undefined
  }

  return typeof value === "string" && value ? [{ label: value, value }] : []
}

function transformDisguisedRules(
  attributes: PromotionRuleAttribute[],
  promotion: PromotionRecord | undefined
): Record<string, unknown>[] {
  const applicationMethod = promotion?.application_method
  const transformedRules: Record<string, unknown>[] = []

  for (const attribute of attributes.filter((candidate) =>
    Boolean(candidate.disguised)
  )) {
    const value = applicationMethod?.[attribute.id]
    const required = attribute.required ?? true

    if (required || value) {
      transformedRules.push({
        ...attribute,
        id: undefined,
        attribute: attribute.id,
        attribute_label: attribute.label,
        operator: RuleOperator.EQ,
        operator_label: operatorsMap[RuleOperator.EQ].label,
        value: undefined,
        values: getDisguisedRuleValues(attribute, value),
      })
    }
  }

  return transformedRules
}

function transformNumberRule(
  attribute: PromotionRuleAttribute,
  promotionRule: PromotionRule,
  operatorLabel: string
): Record<string, unknown> | null {
  if (attribute.disguised) {
    return null
  }

  const value = Array.isArray(promotionRule.values)
    ? promotionRule.values[0]?.value
    : promotionRule.values

  return {
    ...attribute,
    ...promotionRule,
    attribute_label: attribute.label,
    operator_label: operatorLabel,
    values: value,
  }
}

function transformUnconfiguredRule(
  attribute: PromotionRuleAttribute,
  promotionRule: PromotionRule,
  operatorLabel: string
): Record<string, unknown> | null {
  if (attribute.disguised) {
    return null
  }

  const values = Array.isArray(promotionRule.values)
    ? promotionRule.values.map((value) => ({
        value: value.value,
        label: value.label ?? value.value,
      }))
    : []

  return {
    ...attribute,
    ...promotionRule,
    attribute_label: attribute.label,
    operator_label: operatorLabel,
    values,
  }
}

async function transformConfiguredRule(
  remoteQuery: RemoteQuery,
  attribute: PromotionRuleAttribute,
  promotionRule: PromotionRule,
  operatorLabel: string
) {
  if (!isRuleQueryConfigurationKey(attribute.id)) {
    return transformUnconfiguredRule(attribute, promotionRule, operatorLabel)
  }

  const queryConfiguration = ruleQueryConfigurations[attribute.id]
  const ruleValues = Array.isArray(promotionRule.values)
    ? promotionRule.values
    : []
  const rows = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: queryConfiguration.entryPoint,
      variables: {
        filters: {
          [queryConfiguration.valueAttr]: ruleValues.map(
            (value) => value.value
          ),
        },
      },
      fields: [queryConfiguration.labelAttr, queryConfiguration.valueAttr],
    })
  )
  const valueLabelMap = new Map(
    rows.map((row) => [
      row[queryConfiguration.valueAttr],
      row[queryConfiguration.labelAttr],
    ])
  )
  const values = ruleValues.map((value) => ({
    value: value.value,
    label: String(valueLabelMap.get(value.value) || value.value),
  }))

  return attribute.hydrate
    ? null
    : {
        ...attribute,
        ...promotionRule,
        attribute_label: attribute.label,
        operator_label: operatorLabel,
        values,
      }
}

async function transformPromotionRule(
  remoteQuery: RemoteQuery,
  attributes: PromotionRuleAttribute[],
  promotionRule: PromotionRule
) {
  const attribute = attributes.find(
    (candidate) => candidate.value === promotionRule.attribute
  )

  if (!attribute) {
    return null
  }

  const operatorLabel =
    attribute.operators.find(
      (operator) => operator.value === promotionRule.operator
    )?.label ?? promotionRule.operator

  return attribute.field_type === "number"
    ? transformNumberRule(attribute, promotionRule, operatorLabel)
    : transformConfiguredRule(
        remoteQuery,
        attribute,
        promotionRule,
        operatorLabel
      )
}

export async function GET(
  request: AuthenticatedMedusaRequest<HttpTypes.AdminGetPromotionRuleTypeParams>,
  response: MedusaResponse
) {
  const { id, rule_type: ruleType } = request.params

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Promotion ID is required"
    )
  }

  if (!ruleType) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Promotion rule type is required"
    )
  }

  assertRuleType(ruleType)

  const remoteQuery: RemoteQuery = request.scope.resolve(
    ContainerRegistrationKeys.REMOTE_QUERY
  )
  const [promotion]: PromotionRecord[] = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "promotion",
      variables: { id },
      fields: request.queryConfig.fields,
    })
  )
  const ruleAttributes = getExtendedRuleAttributesMap({
    promotionType: promotion?.type,
    applicationMethodType: promotion?.application_method?.type,
    applicationMethodTargetType: promotion?.application_method?.target_type,
  })[ruleType]
  const promotionRules = selectPromotionRules(
    promotion,
    ruleType.split("-").join("_")
  )
  const transformedRules = transformDisguisedRules(ruleAttributes, promotion)

  for (const promotionRule of promotionRules) {
    const transformedRule = await transformPromotionRule(
      remoteQuery,
      ruleAttributes,
      promotionRule
    )

    if (transformedRule) {
      transformedRules.push(transformedRule)
    }
  }

  response.json({ rules: transformedRules })
}

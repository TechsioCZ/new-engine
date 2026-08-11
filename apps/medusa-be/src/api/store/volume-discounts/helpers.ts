import type {
  ComputeActionContext,
  ComputeActionItemLine,
  ComputeActions,
  IPromotionModuleService,
} from "@medusajs/framework/types"
import { BigNumber, MedusaError } from "@medusajs/framework/utils"

type PromotionRuleRecord = {
  attribute?: unknown
  operator?: unknown
  values?: Array<{ value?: unknown }> | null
}

type PromotionApplicationMethodRecord = {
  allocation?: unknown
  target_type?: unknown
  type?: unknown
  value?: unknown
  target_rules?: PromotionRuleRecord[] | null
}

export type VolumeDiscountPromotionRecord = {
  id?: unknown
  code?: unknown
  application_method?: PromotionApplicationMethodRecord | null
}

export type VolumeDiscountTier = {
  promotion_id: string
  minimum_quantity: number
  percentage: number
  unit_amount: number
  total_amount: number
  currency_code: string
}

type VolumeDiscountCandidate = Pick<
  VolumeDiscountTier,
  "promotion_id" | "minimum_quantity" | "percentage"
> & {
  code: string
}

type VolumeDiscountEvaluationContext = {
  currency_code: string
  customer?: ComputeActionContext["customer"]
  email?: ComputeActionContext["email"]
  region?: ComputeActionContext["region"]
  shipping_address?: ComputeActionContext["shipping_address"]
  sales_channel_id?: string
  item: ComputeActionItemLine
  unitAmount: number
}

const VOLUME_DISCOUNT_EVALUATION_CONCURRENCY = 4

const toFiniteNumbers = (rule: PromotionRuleRecord): number[] =>
  (rule.values ?? [])
    .map((entry) => Number(entry.value))
    .filter(Number.isFinite)

export const resolveExactSalesChannelId = (value: unknown): string => {
  let salesChannelIds: unknown[] = []

  if (Array.isArray(value)) {
    salesChannelIds = value
  } else if (value) {
    salesChannelIds = [value]
  }

  const uniqueSalesChannelIds = Array.from(
    new Set(
      salesChannelIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean)
    )
  )

  if (uniqueSalesChannelIds.length !== 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "An exact Sales Channel is required for volume discounts"
    )
  }

  return uniqueSalesChannelIds[0] ?? ""
}

export const resolveMinimumQuantity = (
  rules: PromotionRuleRecord[]
): number | null => {
  const minimumQuantities = rules.flatMap((rule) => {
    if (
      rule.attribute !== "items.quantity" ||
      !["eq", "gt", "gte"].includes(String(rule.operator))
    ) {
      return []
    }

    return toFiniteNumbers(rule).map((value) =>
      rule.operator === "gt" ? value + 1 : value
    )
  })
  const minimumQuantity = Math.max(...minimumQuantities)

  return Number.isInteger(minimumQuantity) && minimumQuantity >= 2
    ? minimumQuantity
    : null
}

export const toVolumeDiscountCandidate = (
  promotion: VolumeDiscountPromotionRecord
): VolumeDiscountCandidate | null => {
  const method = promotion.application_method
  const percentageValue = Number(method?.value)
  const minimumQuantity = resolveMinimumQuantity(method?.target_rules ?? [])

  if (
    method?.type !== "percentage" ||
    method.target_type !== "items" ||
    method.allocation !== "each" ||
    !Number.isFinite(percentageValue) ||
    percentageValue <= 0 ||
    percentageValue >= 100 ||
    minimumQuantity === null ||
    typeof promotion.id !== "string" ||
    typeof promotion.code !== "string" ||
    !promotion.code.trim()
  ) {
    return null
  }

  return {
    code: promotion.code,
    promotion_id: promotion.id,
    minimum_quantity: minimumQuantity,
    percentage: percentageValue,
  }
}

const resolveCandidateAdjustmentAmount = (
  actions: ComputeActions[],
  candidate: VolumeDiscountCandidate,
  itemId: string
): number =>
  actions.reduce((total, action) => {
    if (
      action.action !== "addItemAdjustment" ||
      action.code !== candidate.code ||
      action.item_id !== itemId
    ) {
      return total
    }

    return total + new BigNumber(action.amount).numeric
  }, 0)

const evaluateVolumeDiscountCandidate = async (
  promotionService: Pick<IPromotionModuleService, "computeActions">,
  candidate: VolumeDiscountCandidate,
  context: VolumeDiscountEvaluationContext
): Promise<VolumeDiscountTier | null> => {
  const lineSubtotal = context.unitAmount * candidate.minimum_quantity
  const actions = await promotionService.computeActions(
    [candidate.code],
    {
      currency_code: context.currency_code,
      ...(context.customer ? { customer: context.customer } : {}),
      ...(context.email ? { email: context.email } : {}),
      ...(context.region ? { region: context.region } : {}),
      ...(context.shipping_address
        ? { shipping_address: context.shipping_address }
        : {}),
      ...(context.sales_channel_id
        ? { sales_channel_id: context.sales_channel_id }
        : {}),
      items: [
        {
          ...context.item,
          quantity: candidate.minimum_quantity,
          subtotal: lineSubtotal,
          original_total: lineSubtotal,
        },
      ],
    },
    { prevent_auto_promotions: true }
  )
  const adjustmentAmount = resolveCandidateAdjustmentAmount(
    actions,
    candidate,
    context.item.id
  )

  if (
    !Number.isFinite(adjustmentAmount) ||
    adjustmentAmount <= 0 ||
    adjustmentAmount >= lineSubtotal
  ) {
    return null
  }

  const totalAmount = lineSubtotal - adjustmentAmount

  return {
    promotion_id: candidate.promotion_id,
    minimum_quantity: candidate.minimum_quantity,
    percentage: candidate.percentage,
    unit_amount: totalAmount / candidate.minimum_quantity,
    total_amount: totalAmount,
    currency_code: context.currency_code,
  }
}

const evaluateVolumeDiscountCandidates = async (
  promotionService: Pick<IPromotionModuleService, "computeActions">,
  candidates: VolumeDiscountCandidate[],
  context: VolumeDiscountEvaluationContext
): Promise<Array<VolumeDiscountTier | null>> => {
  const evaluatedTiers = new Array<VolumeDiscountTier | null>(candidates.length)
  let nextCandidateIndex = 0
  const evaluateNextCandidate = async () => {
    while (nextCandidateIndex < candidates.length) {
      const candidateIndex = nextCandidateIndex
      nextCandidateIndex += 1
      const candidate = candidates[candidateIndex]

      if (candidate) {
        evaluatedTiers[candidateIndex] = await evaluateVolumeDiscountCandidate(
          promotionService,
          candidate,
          context
        )
      }
    }
  }
  const workerCount = Math.min(
    VOLUME_DISCOUNT_EVALUATION_CONCURRENCY,
    candidates.length
  )

  await Promise.all(
    Array.from({ length: workerCount }, () => evaluateNextCandidate())
  )

  return evaluatedTiers
}

export const resolveApplicableVolumeDiscountTiers = async (
  promotionService: Pick<IPromotionModuleService, "computeActions">,
  promotions: VolumeDiscountPromotionRecord[],
  context: VolumeDiscountEvaluationContext
): Promise<VolumeDiscountTier[]> => {
  const candidates = promotions
    .map(toVolumeDiscountCandidate)
    .filter(
      (candidate): candidate is VolumeDiscountCandidate => candidate !== null
    )
  const evaluatedTiers = await evaluateVolumeDiscountCandidates(
    promotionService,
    candidates,
    context
  )
  const tiersByQuantity = new Map<number, VolumeDiscountTier>()

  for (const tier of evaluatedTiers) {
    if (!tier) {
      continue
    }

    const currentTier = tiersByQuantity.get(tier.minimum_quantity)

    if (!currentTier || tier.percentage > currentTier.percentage) {
      tiersByQuantity.set(tier.minimum_quantity, tier)
    }
  }

  return Array.from(tiersByQuantity.values()).sort(
    (left, right) => left.minimum_quantity - right.minimum_quantity
  )
}

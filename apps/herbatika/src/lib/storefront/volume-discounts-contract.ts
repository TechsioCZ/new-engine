export type VolumeDiscountTier = {
  promotion_id: string
  minimum_quantity: number
  percentage: number
  unit_amount: number
  total_amount: number
  currency_code: string
}

export type VolumeDiscountTierResponse = {
  volume_discount_tiers: VolumeDiscountTier[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const parseVolumeDiscountTier = (value: unknown): VolumeDiscountTier | null => {
  if (
    !(
      isRecord(value) &&
      typeof value.promotion_id === "string" &&
      typeof value.minimum_quantity === "number" &&
      Number.isInteger(value.minimum_quantity) &&
      value.minimum_quantity >= 2 &&
      typeof value.percentage === "number" &&
      Number.isFinite(value.percentage) &&
      value.percentage > 0 &&
      value.percentage < 100 &&
      typeof value.unit_amount === "number" &&
      Number.isFinite(value.unit_amount) &&
      value.unit_amount >= 0 &&
      typeof value.total_amount === "number" &&
      Number.isFinite(value.total_amount) &&
      value.total_amount >= 0 &&
      typeof value.currency_code === "string" &&
      value.currency_code.length > 0
    )
  ) {
    return null
  }

  return {
    currency_code: value.currency_code,
    minimum_quantity: value.minimum_quantity,
    percentage: value.percentage,
    promotion_id: value.promotion_id,
    total_amount: value.total_amount,
    unit_amount: value.unit_amount,
  }
}

export const parseVolumeDiscountTierResponse = (
  value: unknown
): VolumeDiscountTierResponse => {
  if (!(isRecord(value) && Array.isArray(value.volume_discount_tiers))) {
    throw new Error("Invalid volume discount response")
  }

  const tiers: VolumeDiscountTier[] = []
  for (const sourceTier of value.volume_discount_tiers) {
    const tier = parseVolumeDiscountTier(sourceTier)
    if (!tier) {
      throw new Error("Invalid volume discount response")
    }
    tiers.push(tier)
  }

  return { volume_discount_tiers: tiers }
}

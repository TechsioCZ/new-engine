import {
  PAYKIT_COMGATE_PROVIDER_ID,
  PAYKIT_GOPAY_PROVIDER_ID,
  PAYKIT_PAYMENT_PROVIDER_IDENTIFIER,
  PAYKIT_STRIPE_PROVIDER_ID,
} from "../../modules/payment-paykit/constants"
import { SYSTEM_DEFAULT_PAYMENT_PROVIDER_ID } from "./constants"

const toMedusaPaymentProviderId = (providerId: string) =>
  `pp_${PAYKIT_PAYMENT_PROVIDER_IDENTIFIER}_${providerId}`

export const PAYKIT_REGION_PAYMENT_PROVIDER_IDS = [
  toMedusaPaymentProviderId(PAYKIT_GOPAY_PROVIDER_ID),
  toMedusaPaymentProviderId(PAYKIT_STRIPE_PROVIDER_ID),
  toMedusaPaymentProviderId(PAYKIT_COMGATE_PROVIDER_ID),
] as const

const mergePaymentProviders = (
  currentProviderIds: string[] | undefined,
  paykitProviderIds: readonly string[]
) => {
  const baseProviderIds = currentProviderIds?.length
    ? currentProviderIds
    : [SYSTEM_DEFAULT_PAYMENT_PROVIDER_ID]

  return [...new Set([...baseProviderIds, ...paykitProviderIds])]
}

type WithPaykitPaymentProviders<TRegion> = Omit<TRegion, "paymentProviders"> & {
  paymentProviders: string[]
}

export const withPaykitPaymentProviders = <
  TRegion extends { paymentProviders?: string[] },
>(
  regions: TRegion[],
  paykitProviderIds: readonly string[] = PAYKIT_REGION_PAYMENT_PROVIDER_IDS
): WithPaykitPaymentProviders<TRegion>[] =>
  regions.map((region) => ({
    ...region,
    paymentProviders: mergePaymentProviders(
      region.paymentProviders,
      paykitProviderIds
    ),
  }))

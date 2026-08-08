import type { AddressFormState } from "@/components/checkout/checkout.constants"

export interface CheckoutCompleteSectionProps {
  cartTotalAmount: number
  cartTaxAmount: number
  cartTotalWithoutTaxAmount: number
  currencyCode: string
  detailsStepHref: string
  heurekaConsent: boolean
  marketingConsent: boolean
  onHeurekaConsentChange: (value: boolean) => void
  onMarketingConsentChange: (value: boolean) => void
  onCompleteOrder: () => Promise<void>
  paymentProviderId?: string
  paymentLabel?: string
  shippingAddressForm: AddressFormState
  shippingLabel?: string
  shippingOptionId?: string | null
  shippingStepHref: string
  state: {
    canCompleteOrder: boolean
    hasPayment: boolean
    hasShipping: boolean
    hasStoredAddress: boolean
    isCompletingOrder: boolean
  }
}

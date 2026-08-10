import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"

import {
  formatProviderLabel,
  resolvePaymentDisplayTextKeys,
  resolvePaymentIcon,
} from "@/components/checkout/checkout-display.utils"
import { SupportingText } from "@/components/text/supporting-text"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"

import { CheckoutOptionRadioCard } from "./checkout-option-radio-card"

const PaymentSelectionMessage = ({ message }: { message: string }) => (
  <StatusText
    aria-live="polite"
    className="text-xs leading-relaxed"
    showIcon
    size="sm"
    status="error"
  >
    {message}
  </StatusText>
)

interface PaymentProvider {
  id?: string | null
}

type CheckoutTranslator = ReturnType<typeof useTranslations<"checkout">>

interface CheckoutPaymentSectionProps {
  canInitiatePayment: boolean
  isBusy: boolean
  isInitiatingPayment: boolean
  onSelectPaymentProvider: (providerId: string) => Promise<void> | void
  paymentProviders: PaymentProvider[]
  selectedPaymentProviderId?: string | null
  selectionMessage?: string | null
}

const resolveProviderId = (provider: PaymentProvider) => {
  if (typeof provider.id === "string") {
    return provider.id
  }

  return ""
}

const translatePaymentText = ({
  key,
  providerName,
  translate,
}: {
  key?: string
  providerName?: string
  translate: CheckoutTranslator
}) => {
  if (key === undefined || key.length === 0) {
    return null
  }

  return providerName !== undefined && providerName.length > 0
    ? translate(key, { providerName })
    : translate(key)
}

const createPaymentProviderOption = ({
  canInitiatePayment,
  index,
  isBusy,
  isInitiatingPayment,
  provider,
  translate,
}: {
  canInitiatePayment: boolean
  index: number
  isBusy: boolean
  isInitiatingPayment: boolean
  provider: PaymentProvider
  translate: CheckoutTranslator
}) => {
  const providerId = resolveProviderId(provider)
  const displayTextKeys = resolvePaymentDisplayTextKeys(providerId)
  const providerLabel =
    translatePaymentText({
      ...(displayTextKeys.labelKey === undefined
        ? {}
        : { key: displayTextKeys.labelKey }),
      ...(displayTextKeys.providerName === undefined
        ? {}
        : { providerName: displayTextKeys.providerName }),
      translate,
    }) ??
    displayTextKeys.providerName ??
    formatProviderLabel(providerId)
  const paymentDescription = translatePaymentText({
    ...(displayTextKeys.descriptionKey === undefined
      ? {}
      : { key: displayTextKeys.descriptionKey }),
    ...(displayTextKeys.providerName === undefined
      ? {}
      : { providerName: displayTextKeys.providerName }),
    translate,
  })
  const paymentHint =
    displayTextKeys.hintKey === undefined ||
    displayTextKeys.hintKey.length === 0
      ? displayTextKeys.hintValue
      : translate(displayTextKeys.hintKey)
  const isProviderSelectable = Boolean(providerId && canInitiatePayment)

  return {
    ...(paymentDescription === null ? {} : { bodyText: paymentDescription }),
    disabled: isBusy || isInitiatingPayment || !isProviderSelectable,
    ...(paymentHint === undefined ? {} : { hint: paymentHint }),
    icon: resolvePaymentIcon(providerId),
    priceLabel: translate("free"),
    priceTone: "success" as const,
    title: providerLabel,
    value: providerId || `${providerLabel}-${index}`,
  }
}

export const CheckoutPaymentSection = ({
  canInitiatePayment,
  isBusy,
  isInitiatingPayment,
  onSelectPaymentProvider,
  paymentProviders,
  selectedPaymentProviderId,
  selectionMessage,
}: CheckoutPaymentSectionProps) => {
  const tCheckout = useTranslations("checkout")

  const hasPaymentProviders = paymentProviders.length > 0
  const hasSelectionMessage =
    selectionMessage !== null &&
    selectionMessage !== undefined &&
    selectionMessage.length > 0

  return (
    <section className="space-y-250 rounded-sm p-550 font-rubik">
      <header>
        <h2 className="font-medium text-fg-primary text-xl">
          {tCheckout("payment")}
        </h2>
      </header>
      <div className="grid gap-150">
        {paymentProviders.length > 0 ? (
          <CheckoutOptionRadioCard
            label={tCheckout("payment")}
            onValueChange={(value) => {
              runDetachedPromise(onSelectPaymentProvider(value))
            }}
            options={paymentProviders.map((provider, index) =>
              createPaymentProviderOption({
                canInitiatePayment,
                index,
                isBusy,
                isInitiatingPayment,
                provider,
                translate: tCheckout,
              }),
            )}
            value={selectedPaymentProviderId ?? null}
          />
        ) : (
          <SupportingText>{tCheckout("no_payment_methods")}</SupportingText>
        )}
        {hasPaymentProviders && hasSelectionMessage ? (
          <PaymentSelectionMessage message={selectionMessage} />
        ) : null}
      </div>
    </section>
  )
}

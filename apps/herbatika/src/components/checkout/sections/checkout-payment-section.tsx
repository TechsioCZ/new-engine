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
  if (!key) {
    return
  }

  return providerName ? translate(key, { providerName }) : translate(key)
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
  const paymentHint = displayTextKeys.hintKey
    ? translate(displayTextKeys.hintKey)
    : displayTextKeys.hintValue
  const isProviderSelectable = Boolean(providerId && canInitiatePayment)

  return {
    ...(paymentDescription === undefined
      ? {}
      : { bodyText: paymentDescription }),
    disabled: isBusy || isInitiatingPayment || !isProviderSelectable,
    ...(paymentHint === undefined ? {} : { hint: paymentHint }),
    icon: resolvePaymentIcon(providerId),
    priceLabel: translate("free"),
    priceTone: "success" as const,
    title: providerLabel,
    value: providerId || `${providerLabel}-${index}`,
  }
}

export function CheckoutPaymentSection({
  canInitiatePayment,
  isBusy,
  isInitiatingPayment,
  onSelectPaymentProvider,
  paymentProviders,
  selectedPaymentProviderId,
  selectionMessage,
}: CheckoutPaymentSectionProps) {
  const tCheckout = useTranslations("checkout")

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
              })
            )}
            value={selectedPaymentProviderId ?? null}
          />
        ) : (
          <SupportingText>{tCheckout("no_payment_methods")}</SupportingText>
        )}
        {paymentProviders.length > 0 && selectionMessage ? (
          <PaymentSelectionMessage message={selectionMessage} />
        ) : null}
      </div>
    </section>
  )
}

function PaymentSelectionMessage({ message }: { message: string }) {
  return (
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
}

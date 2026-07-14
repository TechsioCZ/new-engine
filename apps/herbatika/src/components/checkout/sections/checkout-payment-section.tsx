import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import {
  resolvePaymentDescription,
  resolvePaymentHint,
  resolvePaymentIcon,
  resolveProviderLabel,
} from "@/components/checkout/checkout-display.utils"
import { SupportingText } from "@/components/text/supporting-text"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { CheckoutOptionRadioCard } from "./checkout-option-radio-card"

type PaymentProvider = {
  id?: string | null
}

type CheckoutPaymentSectionProps = {
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
            options={paymentProviders.map((provider, index) => {
              const providerId = resolveProviderId(provider)
              const providerLabel = resolveProviderLabel(providerId)
              const isProviderSelectable = Boolean(
                providerId && canInitiatePayment
              )

              return {
                disabled:
                  isBusy || isInitiatingPayment || !isProviderSelectable,
                bodyText: resolvePaymentDescription(providerId),
                hint: resolvePaymentHint(providerId),
                icon: resolvePaymentIcon(providerId),
                priceLabel: tCheckout("free"),
                priceTone: "success" as const,
                title: providerLabel,
                value: providerId || `${providerLabel}-${index}`,
              }
            })}
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

"use client"

import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"
import { useState } from "react"

import { useCheckoutPayment } from "@/hooks/use-checkout-payment"
import { useSuspenseRegion } from "@/hooks/use-region"
import type { Cart } from "@/services/cart-service"

type PaymentFormSectionProps = {
  cart: Cart
}

const CASH_ON_DELIVERY_PROVIDER = "pp_system_default"

export function PaymentFormSection({ cart }: PaymentFormSectionProps) {
  const { regionId } = useSuspenseRegion()
  const [selectedProvider, setSelectedProvider] = useState<string>("")

  const {
    paymentProviders,
    hasPaymentSessions,
    canInitiatePayment,
    isInitiatingPayment,
    initiatePayment,
  } = useCheckoutPayment(cart.id, regionId, cart)

  function handleProviderSelect(providerId: string) {
    if (selectedProvider !== providerId) {
      setSelectedProvider(providerId)
      initiatePayment(providerId)
    }
  }

  return (
    <section className="rounded border border-border-secondary bg-surface/70 p-400">
      <h2 className="mb-400 font-semibold text-fg-primary text-lg">Platba</h2>
      {paymentProviders && paymentProviders.length > 0 && (
        <>
          <div className="mb-300">
            <p className="font-medium text-fg-primary text-sm">
              Vyberte způsob platby:
            </p>
          </div>
          <ul className="space-y-300">
            {paymentProviders.map((provider) => {
              const providerInputId = `payment-provider-${provider.id}`
              return (
                <li key={provider.id}>
                  <label
                    className="flex w-full cursor-pointer items-center gap-300 rounded border border-border-secondary bg-surface-light p-300 hover:bg-overlay data-[selected=true]:border-border-primary/30 data-[selected=true]:bg-overlay-light"
                    data-selected={provider.id === selectedProvider}
                    htmlFor={providerInputId}
                  >
                    <Checkbox
                      checked={selectedProvider === provider.id}
                      disabled={isInitiatingPayment}
                      id={providerInputId}
                      name="payment-provider"
                      onChange={() => handleProviderSelect(provider.id)}
                    />
                    <span className="flex flex-1 flex-col">
                      <span className="font-medium text-fg-primary text-sm">
                        {provider.id === CASH_ON_DELIVERY_PROVIDER
                          ? "Při převzetí"
                          : provider.id}
                      </span>
                      <span className="text-fg-secondary text-xs">
                        {provider.id === CASH_ON_DELIVERY_PROVIDER
                          ? "Zaplatíte při doručení objednávky"
                          : "Online platba"}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          {!canInitiatePayment && (
            <p className="mt-300 text-fg-tertiary text-xs">
              💡 Nejprve vyberte způsob dopravy
            </p>
          )}
        </>
      )}

      {!hasPaymentSessions &&
        (!paymentProviders || paymentProviders.length === 0) && (
          <div className="rounded border border-border-primary p-300">
            <p className="font-medium text-fg-primary text-sm">Při převzetí</p>
            <p className="mt-100 text-fg-secondary text-xs">
              Zaplatíte při doručení objednávky
            </p>
          </div>
        )}
    </section>
  )
}

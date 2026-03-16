"use client"

import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"
import { useEffect, useState } from "react"
import { useCheckoutContext } from "../_context/checkout-context"

const CASH_ON_DELIVERY_PROVIDER = "pp_system_default"

export function PaymentFormSection() {
  const { payment, cart } = useCheckoutContext()
  const {
    paymentProviders,
    hasPaymentSessions,
    canInitiatePayment,
    isInitiatingPayment,
    isLoadingPaymentProviders,
    isFetchingPaymentProviders,
    initiatePaymentAsync,
  } = payment

  const isLoadingProviders =
    isLoadingPaymentProviders || isFetchingPaymentProviders

  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const currentProviderId =
    cart?.payment_collection?.payment_sessions?.[0]?.provider_id ?? ""

  useEffect(() => {
    setSelectedProvider(currentProviderId)
  }, [currentProviderId])

  async function handleProviderSelect(providerId: string) {
    if (!(canInitiatePayment && selectedProvider !== providerId)) {
      return
    }

    const previousProvider = selectedProvider
    setSelectedProvider(providerId)

    try {
      await initiatePaymentAsync(providerId)
    } catch {
      setSelectedProvider(previousProvider)
    }
  }

  return (
    <section className="rounded border border-border-secondary bg-surface/70 p-400">
      <h2 className="mb-400 font-semibold text-fg-primary text-lg">Platba</h2>
      {isLoadingProviders && !hasPaymentSessions && (
        <p className="text-fg-secondary text-sm">
          Načítáme dostupné způsoby platby…
        </p>
      )}

      {!isLoadingProviders &&
        paymentProviders &&
        paymentProviders.length > 0 && (
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
                        disabled={isInitiatingPayment || !canInitiatePayment}
                        id={providerInputId}
                        name="payment-provider"
                        onChange={async () => {
                          await handleProviderSelect(provider.id)
                        }}
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
                Nejprve vyberte způsob dopravy
              </p>
            )}
          </>
        )}

      {!(isLoadingProviders || hasPaymentSessions) &&
        (!paymentProviders || paymentProviders.length === 0) && (
          <p className="text-fg-secondary text-sm">
            Žádný způsob platby není momentálně k dispozici.
          </p>
        )}
    </section>
  )
}

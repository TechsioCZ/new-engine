"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
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

  const hasProviders = (paymentProviders?.length ?? 0) > 0
  const isLoadingProviders =
    !hasProviders &&
    (isLoadingPaymentProviders ||
      (isFetchingPaymentProviders && !hasPaymentSessions))

  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [selectionError, setSelectionError] = useState<string | null>(null)
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
    setSelectionError(null)
    setSelectedProvider(providerId)

    try {
      await initiatePaymentAsync(providerId)
    } catch (error) {
      setSelectedProvider(previousProvider)
      setSelectionError(
        error instanceof Error && error.message
          ? error.message
          : "Nepodařilo se změnit způsob platby"
      )
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

      {hasProviders && paymentProviders && (
        <>
          <div className="mb-300">
            <p className="font-medium text-fg-primary text-sm">
              Vyberte způsob platby:
            </p>
          </div>
          <div
            aria-label="Vyberte způsob platby"
            className="space-y-300"
            role="radiogroup"
          >
            {paymentProviders.map((provider) => {
              const selected = provider.id === selectedProvider

              return (
                <Button
                  aria-checked={selected}
                  aria-label={provider.id}
                  className="flex w-full items-center gap-300 rounded border border-border-secondary bg-surface-light p-300 text-left hover:bg-overlay data-[selected=true]:border-border-primary/30 data-[selected=true]:bg-overlay-light"
                  data-selected={selected}
                  disabled={isInitiatingPayment || !canInitiatePayment}
                  key={provider.id}
                  onClick={async () => {
                    await handleProviderSelect(provider.id)
                  }}
                  role="radio"
                  size="current"
                  theme="unstyled"
                  type="button"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border-primary/40">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-fg-primary" : "bg-transparent"}`}
                    />
                  </span>
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
                </Button>
              )
            })}
          </div>

          {isFetchingPaymentProviders && (
            <p className="mt-300 text-fg-tertiary text-xs">
              Aktualizujeme dostupné způsoby platby…
            </p>
          )}

          {selectionError && (
            <p className="mt-300 text-danger text-xs">{selectionError}</p>
          )}

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

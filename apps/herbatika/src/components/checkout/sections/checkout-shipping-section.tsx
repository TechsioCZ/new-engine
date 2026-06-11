import { useEffect, useMemo } from "react"
import {
  resolveCarrierPickupHint,
  resolveCarrierPickupRequirement,
} from "@/components/checkout/carrier-pickup.utils"
import { resolveShippingIcon } from "@/components/checkout/checkout-display.utils"
import { SupportingText } from "@/components/text/supporting-text"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { CheckoutCarrierPickupDetails } from "./checkout-carrier-pickup-details"
import { CheckoutOptionRadioCard } from "./checkout-option-radio-card"

type ShippingOption = {
  data?: Record<string, unknown> | null
  id: string
  name?: string | null
  provider_id?: string | null
}

type CheckoutShippingSectionProps = {
  currencyCode: string
  isBusy: boolean
  onSelectShipping: (optionId: string, data?: Record<string, unknown>) => void
  onPendingPickupOptionIdChange: (optionId: string | null) => void
  pendingPickupOptionId: string | null
  selectedShippingMethodId?: string | null
  shippingOptions: ShippingOption[]
  shippingPrices: Record<string, number>
}

const PICKUP_SELECTION_REQUIRED_TEXT =
  "Vyberte výdajné miesto, aby sa odomkla platba."

export function CheckoutShippingSection({
  currencyCode,
  isBusy,
  onSelectShipping,
  onPendingPickupOptionIdChange,
  pendingPickupOptionId,
  selectedShippingMethodId,
  shippingOptions,
  shippingPrices,
}: CheckoutShippingSectionProps) {
  const pickupRequirements = useMemo(
    () =>
      new Map(
        shippingOptions.flatMap((option) => {
          const requirement = resolveCarrierPickupRequirement(option)

          return requirement ? [[option.id, requirement]] : []
        })
      ),
    [shippingOptions]
  )

  useEffect(() => {
    if (
      pendingPickupOptionId &&
      !shippingOptions.some((option) => option.id === pendingPickupOptionId)
    ) {
      onPendingPickupOptionIdChange(null)
    }
  }, [onPendingPickupOptionIdChange, pendingPickupOptionId, shippingOptions])

  const resolveShippingPriceLabel = (amount: number) => {
    if (amount <= 0) {
      return "Zadarmo"
    }

    return `+ ${formatCurrencyAmount(amount, currencyCode)}`
  }

  return (
    <section className="space-y-250 rounded-sm p-550 font-rubik">
      <header className="space-y-50">
        <h2 className="font-medium text-fg-primary text-xl">Doprava</h2>
      </header>
      <div className="grid gap-150">
        {shippingOptions.length > 0 ? (
          <CheckoutOptionRadioCard
            expandedValue={pendingPickupOptionId}
            label="Doprava"
            onValueChange={(value) => {
              if (pickupRequirements.has(value)) {
                onPendingPickupOptionIdChange(value)
                return
              }

              onPendingPickupOptionIdChange(null)
              runDetachedPromise(onSelectShipping(value))
            }}
            options={shippingOptions.map((option) => {
              const optionPrice = shippingPrices[option.id] ?? 0
              const pickupRequirement = pickupRequirements.get(option.id)
              const isAwaitingPickupSelection = Boolean(
                pickupRequirement &&
                  pendingPickupOptionId === option.id &&
                  selectedShippingMethodId !== option.id
              )

              return {
                addon: pickupRequirement ? (
                  <CheckoutCarrierPickupDetails
                    disabled={isBusy}
                    onConfirm={(data) => {
                      onPendingPickupOptionIdChange(null)
                      runDetachedPromise(onSelectShipping(option.id, data))
                    }}
                    requirement={pickupRequirement}
                  />
                ) : undefined,
                disabled: isBusy,
                bodyText: isAwaitingPickupSelection
                  ? PICKUP_SELECTION_REQUIRED_TEXT
                  : undefined,
                hint: pickupRequirement
                  ? resolveCarrierPickupHint(pickupRequirement)
                  : undefined,
                icon: resolveShippingIcon(option),
                priceLabel: resolveShippingPriceLabel(optionPrice),
                priceTone: optionPrice > 0 ? "default" : "success",
                title: option.name ?? option.id,
                value: option.id,
              }
            })}
            value={selectedShippingMethodId ?? null}
          />
        ) : (
          <SupportingText>
            Nie sú dostupné žiadne možnosti dopravy.
          </SupportingText>
        )}
      </div>
    </section>
  )
}

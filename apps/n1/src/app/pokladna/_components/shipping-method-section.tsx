import type { HttpTypes } from "@medusajs/types"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"

import type { UseCheckoutShippingReturn } from "@/hooks/use-checkout-shipping"
import type { ShippingMethodData } from "@/services/cart-service"
import {
  accessPointToShippingData,
  isPPLParcelOption,
} from "@/utils/address-helpers"
import type { PplAccessPointData } from "@/utils/address-helpers"
import { formatToTaxIncluded } from "@/utils/format/format-product"

import { SelectedParcelCard } from "./selected-parcel-card"

interface ShippingMethodSectionProps {
  shipping: UseCheckoutShippingReturn
  selectedAccessPoint: PplAccessPointData | null
  onOpenPickupDialog: (optionId: string) => void
}

interface ShippingOptionCardProps {
  option: HttpTypes.StoreCartShippingOption
  selected: boolean
  isUpdating?: boolean
  selectedAccessPoint: PplAccessPointData | null
  onSelect: (id: string, data?: ShippingMethodData) => void
  onOpenPickupDialog: (optionId: string) => void
}

const ShippingOptionCard = ({
  option,
  selected,
  isUpdating,
  selectedAccessPoint,
  onSelect,
  onOpenPickupDialog,
}: ShippingOptionCardProps) => {
  const formattedPrice = formatToTaxIncluded({
    amount: option.amount,
    currency: option.calculated_price.currency_code ?? "czk",
  })

  const isPPLParcel = isPPLParcelOption(option.name)

  const handleClick = () => {
    if (isPPLParcel) {
      // PPL Parcel - if we have selected access point, use it; otherwise open dialog
      if (selectedAccessPoint) {
        onSelect(option.id, accessPointToShippingData(selectedAccessPoint))
      } else {
        onOpenPickupDialog(option.id)
      }
    } else {
      // Regular shipping (including PPL Private)
      onSelect(option.id)
    }
  }

  return (
    <label
      className="relative flex w-full cursor-pointer items-center gap-300 rounded border border-border-secondary bg-base px-300 py-200 text-left has-disabled:cursor-not-allowed has-disabled:opacity-50 has-focus-visible:outline-2 has-focus-visible:outline-border-primary data-[selected=true]:border-border-primary/30 data-[selected=true]:bg-overlay-light"
      data-selected={selected}
    >
      <input
        aria-label={`${option.name}, ${formattedPrice.length > 0 ? formattedPrice : "zdarma"}`}
        checked={selected}
        className="sr-only"
        disabled={isUpdating}
        name="shipping-method"
        onClick={handleClick}
        readOnly
        type="radio"
        value={option.id}
      />
      <div className="flex-1 text-left">
        <p className="font-medium text-fg-primary text-sm">{option.name}</p>
        <StatusText size="sm">Dodání 2-3 dny</StatusText>
      </div>
      <span>{formattedPrice.length > 0 ? formattedPrice : "Zdarma"}</span>
    </label>
  )
}

export const ShippingMethodSection = ({
  shipping,
  selectedAccessPoint,
  onOpenPickupDialog,
}: ShippingMethodSectionProps) => {
  const { selectedOption } = shipping

  const showParcelCard =
    selectedOption !== undefined &&
    isPPLParcelOption(selectedOption.name) &&
    selectedAccessPoint !== null

  const handleShippingSelect = shipping.setShipping
  const content =
    shipping.shippingOptions !== undefined &&
    shipping.shippingOptions.length > 0 ? (
      <div
        aria-label="Vyberte způsob dopravy"
        className="grid grid-cols-1 gap-200 md:grid-cols-2"
        data-updating={shipping.isSettingShipping}
        role="radiogroup"
      >
        {shipping.shippingOptions.map((option) => (
          <ShippingOptionCard
            isUpdating={shipping.isSettingShipping}
            key={option.id}
            onOpenPickupDialog={onOpenPickupDialog}
            onSelect={handleShippingSelect}
            option={option}
            selected={shipping.selectedShippingMethodId === option.id}
            selectedAccessPoint={selectedAccessPoint}
          />
        ))}
      </div>
    ) : (
      <StatusText showIcon size="md" status="error">
        Žádné způsoby dopravy nejsou momentálně k dispozici. Zkuste to prosím
        později.
      </StatusText>
    )

  return (
    <section className="rounded border border-border-secondary bg-surface-light p-400">
      <h2 className="mb-400 font-semibold text-fg-primary text-lg">
        Způsob dopravy
      </h2>
      {content}

      {showParcelCard && (
        <SelectedParcelCard
          accessPoint={selectedAccessPoint}
          onChangeClick={() => {
            onOpenPickupDialog(selectedOption.id)
          }}
        />
      )}
    </section>
  )
}

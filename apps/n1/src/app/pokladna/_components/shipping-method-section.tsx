import type { HttpTypes } from "@medusajs/types"
import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import type { ReactNode } from "react"
import type { UseCheckoutShippingReturn } from "@/hooks/use-checkout-shipping"
import type { ShippingMethodData } from "@/services/cart-service"
import {
  accessPointToShippingData,
  isPPLParcelOption,
  type PplAccessPointData,
} from "@/utils/address-helpers"
import { formatToTaxIncluded } from "@/utils/format/format-product"
import { SelectedParcelCard } from "./selected-parcel-card"

type ShippingMethodSectionProps = {
  shipping: UseCheckoutShippingReturn
  selectedAccessPoint: PplAccessPointData | null
  onOpenPickupDialog: (optionId: string) => void
}

type ShippingOptionCardProps = {
  option: HttpTypes.StoreCartShippingOption
  selected: boolean
  isUpdating?: boolean
  selectedAccessPoint: PplAccessPointData | null
  onSelect: (id: string, data?: ShippingMethodData) => void
  onOpenPickupDialog: (optionId: string) => void
}

function ShippingOptionCard({
  option,
  selected,
  isUpdating,
  selectedAccessPoint,
  onSelect,
  onOpenPickupDialog,
}: ShippingOptionCardProps) {
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
    <Button
      aria-checked={selected}
      aria-label={`${option.name}, ${formattedPrice || "zdarma"}`}
      className="flex w-full items-center gap-300 text-left data-[selected=true]:border-border-primary/30 data-[selected=true]:bg-overlay-light"
      data-selected={selected}
      disabled={isUpdating}
      onClick={handleClick}
      role="radio"
      theme="outlined"
      type="button"
      variant="secondary"
    >
      <div className="flex-1 text-left">
        <p className="font-medium text-fg-primary text-sm">{option.name}</p>
        <StatusText size="sm">Dodání 2-3 dny</StatusText>
      </div>
      <span>{formattedPrice || "Zdarma"}</span>
    </Button>
  )
}

export function ShippingMethodSection({
  shipping,
  selectedAccessPoint,
  onOpenPickupDialog,
}: ShippingMethodSectionProps) {
  let content: ReactNode

  const selectedOption = shipping.selectedOption

  const showParcelCard =
    selectedOption &&
    isPPLParcelOption(selectedOption.name) &&
    selectedAccessPoint

  if (shipping.shippingOptions && shipping.shippingOptions.length > 0) {
    content = (
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
            onSelect={shipping.setShipping}
            option={option}
            selected={shipping.selectedShippingMethodId === option.id}
            selectedAccessPoint={selectedAccessPoint}
          />
        ))}
      </div>
    )
  } else {
    content = (
      <StatusText showIcon size="md" status="error">
        Žádné způsoby dopravy nejsou momentálně k dispozici. Zkuste to prosím
        později.
      </StatusText>
    )
  }

  return (
    <section className="rounded border border-border-secondary bg-surface-light p-400">
      <h2 className="mb-400 font-semibold text-fg-primary text-lg">
        Způsob dopravy
      </h2>
      {content}

      {showParcelCard && (
        <SelectedParcelCard
          accessPoint={selectedAccessPoint}
          onChangeClick={() => onOpenPickupDialog(selectedOption.id)}
        />
      )}
    </section>
  )
}

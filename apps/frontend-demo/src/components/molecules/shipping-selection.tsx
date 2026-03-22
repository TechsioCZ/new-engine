import Image from "next/image"
import "../../tokens/app-components/molecules/_shipping-selection.css"
import { Button } from "@techsio/ui-kit/atoms/button"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { SHIPPING_METHODS } from "@/lib/checkout-data"
import { formatPrice } from "@/lib/format-price"
import type { ReducedShippingMethod } from "@/types/checkout"

interface ShippingSelectionProps {
  selected: string
  onSelect: (method: string) => void
  currentStep: number
  setCurrentStep: (step: number) => void
  shippingMethods: ReducedShippingMethod[] | undefined
  isLoading: boolean
}

const ShippingMethodDetail = ({
  method,
  selected,
}: {
  method: ReducedShippingMethod
  selected: string
}) => {
  const detailInfo = SHIPPING_METHODS.find((m) => m.name === method.name)

  const priceWithTax = (method.calculated_price?.calculated_amount || 0) * 1.21
  const formattedPrice = formatPrice(
    priceWithTax,
    method.calculated_price.currency_code || "CZK"
  )

  return (
    <div className="flex flex-1 items-center gap-3 sm:gap-4">
      {detailInfo?.image && (
        <Image
          alt={detailInfo.name}
          className={`${detailInfo.id === "balikovna" && "balikovna-dark"} h-[30px] w-[60px] object-contain sm:h-[40px] sm:w-[80px] lg:h-[50px] lg:w-[100px]`}
          height={50}
          src={detailInfo.image}
          width={100}
        />
      )}
      <div className="flex-1">
        <h3 className="xs:block hidden font-semibold text-fg-primary text-sm">
          {method.name}
        </h3>
        <p className="mt-0.5 xs:block hidden text-fg-secondary text-xs sm:text-sm">
          {detailInfo?.description}
        </p>
        <p className="xs:block hidden font-medium text-fg-secondary text-xs">
          {detailInfo?.deliveryDate || detailInfo?.delivery}
        </p>
      </div>
      <span className="ml-auto font-bold text-fg-primary text-sm sm:text-lg">
        {formattedPrice}
      </span>
      <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-border bg-base transition-all duration-200 sm:h-5 sm:w-5">
        <div
          className="h-2 w-2 scale-0 rounded-full bg-primary opacity-0 transition-all duration-200 data-[selected=true]:scale-100 data-[selected=true]:opacity-100 sm:h-2.5 sm:w-2.5"
          data-selected={selected === method.id}
        />
      </div>
    </div>
  )
}

export function ShippingSelection({
  selected,
  onSelect,
  currentStep,
  setCurrentStep,
  shippingMethods,
  isLoading,
}: ShippingSelectionProps) {
  const toast = useToast()
  const handleProgress = () => {
    if (selected) {
      setCurrentStep(currentStep + 1)
    } else {
      toast.create({
        type: "error",
        title: "Není vybrán dopravce",
        description: "Je potřeba zvolit jeden způsob dopravy",
      })
    }
  }

  return (
    <div className="w-full space-y-250 py-2 sm:py-4">
      <div
        aria-label="Vyberte způsob dopravy"
        className="grid grid-cols-1 gap-3 sm:gap-4"
        role="radiogroup"
      >
        {shippingMethods?.map((method) => (
          <Button
            aria-checked={selected === method.id}
            aria-label={`${method.name} - ${method.calculated_price.calculated_amount}`}
            className="relative flex items-center rounded-lg border-2 border-border-subtle bg-surface p-3 transition-all duration-200 hover:bg-surface-hover hover:shadow-md focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-ring focus-visible:outline-offset-(length:--default-ring-offset) data-[selected=true]:border-primary data-[selected=true]:bg-surface-selected data-[selected=true]:shadow-lg sm:p-4"
            data-selected={selected === method.id}
            key={method.id}
            onClick={() => onSelect(method.id)}
          >
            <ShippingMethodDetail method={method} selected={selected} />
          </Button>
        ))}
      </div>
      <div className="flex w-full justify-between">
        <Button onClick={() => setCurrentStep(currentStep - 1)} size="sm">
          Zpět
        </Button>
        <Button onClick={handleProgress} size="sm">
          Pokračovat
        </Button>
      </div>
    </div>
  )
}

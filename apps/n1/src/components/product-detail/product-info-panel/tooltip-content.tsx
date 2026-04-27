import type { ProductVariantDetail } from "@/types/product"
import { resolveVariantAvailability } from "@/utils/product-availability"
import {
  availabilityStatusClass,
  formatAvailabilityLabel,
} from "./availability-display"

type TooltipContentProps = {
  title: string
  variantLabel: string
  variant: ProductVariantDetail
}

export const TooltipContent = ({
  title,
  variant,
  variantLabel,
}: TooltipContentProps) => {
  const availability = resolveVariantAvailability(variant)

  return (
    <div className="grid">
      <h4 className="font-bold">{title}</h4>
      <p>{variantLabel}</p>
      <p
        className={`place-self-end-safe font-semibold ${availabilityStatusClass[availability.status]}`}
      >
        {formatAvailabilityLabel(availability)}
      </p>
    </div>
  )
}

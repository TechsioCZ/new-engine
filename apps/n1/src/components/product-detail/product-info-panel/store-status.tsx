import { Tooltip } from "@techsio/ui-kit/atoms/tooltip"
import type { ProductVariantDetail } from "@/types/product"
import {
  resolveVariantAvailability,
  type VariantAvailability,
} from "@/utils/product-availability"
import {
  availabilityStatusClass,
  formatAvailabilityLabel,
} from "./availability-display"

const StatusContent = ({ availability }: { availability: VariantAvailability }) => {
  const availabilityLeadText =
    availability.status === "in-stock"
      ? "Sklad N1shop - doba dodání 1-2 dny:"
      : "Sklad N1shop:"

  return (
    <div className="text-xs">
      <h4 className="font-bold">{availabilityLeadText}</h4>
      <p
        className={`font-semibold ${availabilityStatusClass[availability.status]}`}
      >
        {formatAvailabilityLabel(availability)}
      </p>
    </div>
  )
}

export const StoreStatus = ({
  variant,
}: {
  variant: ProductVariantDetail | null
}) => {
  const availability = resolveVariantAvailability(variant)

  return (
    <Tooltip
      className="relative bg-secondary text-fg-reverse [--arrow-background:var(--color-secondary)]"
      content={<StatusContent availability={availability} />}
      offset={{ mainAxis: 4, crossAxis: 4 }}
      placement="bottom-start"
    >
      <span
        className={`cursor-help font-bold text-lg underline decoration-1 decoration-dotted underline-offset-4 ${availabilityStatusClass[availability.status]}`}
      >
        {formatAvailabilityLabel(availability)}
      </span>
    </Tooltip>
  )
}

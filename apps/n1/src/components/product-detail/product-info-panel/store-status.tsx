import { Tooltip } from "@techsio/ui-kit/atoms/tooltip"
import type { ProductVariantDetail } from "@/types/product"
import { resolveVariantAvailability } from "@/utils/product-availability"

const statusColorClass = {
  "in-stock": "text-success",
  "limited-stock": "text-warning",
  "out-of-stock": "text-danger",
} as const

const formatAvailabilityLabel = (
  variant: ProductVariantDetail | null
) => {
  const availability = resolveVariantAvailability(variant)

  if (availability.status === "in-stock" && availability.availableQuantity != null) {
    return `${availability.label} ${availability.availableQuantity} ks`
  }

  return availability.label
}

const StatusContent = ({ variant }: { variant: ProductVariantDetail | null }) => {
  const availability = resolveVariantAvailability(variant)

  return (
    <div className="text-xs">
      <h4 className="font-bold">Sklad N1shop - doba dodání 1-2 dny:</h4>
      <p className={`font-semibold ${statusColorClass[availability.status]}`}>
        {formatAvailabilityLabel(variant)}
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
      content={<StatusContent variant={variant} />}
      offset={{ mainAxis: 4, crossAxis: 4 }}
      placement="bottom-start"
    >
      <span
        className={`cursor-help font-bold text-lg underline decoration-1 decoration-dotted underline-offset-4 ${statusColorClass[availability.status]}`}
      >
        {formatAvailabilityLabel(variant)}
      </span>
    </Tooltip>
  )
}

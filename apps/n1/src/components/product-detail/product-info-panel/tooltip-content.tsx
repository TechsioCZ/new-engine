import type { ProductVariantDetail } from "@/types/product"
import { resolveVariantAvailability } from "@/utils/product-availability"

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
  const statusClass =
    availability.status === "out-of-stock"
      ? "text-danger"
      : availability.status === "limited-stock"
        ? "text-warning"
        : "text-success"

  const availabilityLabel =
    availability.status === "in-stock" && availability.availableQuantity != null
      ? `${availability.label} ${availability.availableQuantity} ks`
      : availability.label

  return (
    <div className="grid">
      <h4 className="font-bold">{title}</h4>
      <p>{variantLabel}</p>
      <p className={`place-self-end-safe font-semibold ${statusClass}`}>
        {availabilityLabel}
      </p>
    </div>
  )
}

import { ProductCard } from "@techsio/ui-kit/molecules/product-card"
import type { ProductPriceState } from "./product-card.types"

type ProductCardPriceBlockProps = {
  className?: string
  price: ProductPriceState
}

export function ProductCardPriceBlock({
  className,
  price,
}: ProductCardPriceBlockProps) {
  return (
    <div
      className={[
        "flex min-h-product-card-label flex-col justify-end font-verdana leading-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {price.originalLabel ? (
        <span className="text-fg-tertiary text-xs line-through">
          {price.originalLabel}
        </span>
      ) : null}
      <ProductCard.Price className="leading-none">
        {price.currentLabel}
      </ProductCard.Price>
    </div>
  )
}

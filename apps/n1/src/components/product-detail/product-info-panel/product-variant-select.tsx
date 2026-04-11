import { buttonVariants } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Tooltip } from "@techsio/ui-kit/atoms/tooltip"
import { tv } from "@techsio/ui-kit/utils"
import Link from "next/link"
import type { ProductDetail, ProductVariantDetail } from "@/types/product"
import { TooltipContent } from "./tooltip-content"

const variantButton = tv({
  extend: buttonVariants,
  base: [
    "bg-lbwt-bg p-lbwt text-lbwt-fg",
    "cursor-pointer",
    "font-normal",
    "hover:bg-lbwt-bg-hover",
  ],
  variants: {
    variant: {
      default: "",
      outline: [
        "border border-border-secondary",
        "data-[selected=true]:border-2 data-[selected=true]:bg-lbwt-bg-selected",
        "hover:border-border-primary",
        "data-[selected=true]:border-lbwt-border-selected",
      ],
    },
    size: {
      current: "",
    },
  },
  defaultVariants: {
    size: "current",
    variant: "outline",
  },
})

type ProductVariantSelectProps = {
  detail: ProductDetail
  selectedVariant: ProductVariantDetail | null
  handle: string
}

export const ProductVariantSelect = ({
  detail,
  selectedVariant,
  handle,
}: ProductVariantSelectProps) => {
  const decorationStyle = {
    backgroundColor: "var(--color-success)",
    clipPath: "polygon(0 0, 100% 100%, 100% 0)",
    height: "0.5rem",
    width: "0.5rem",
  }

  return (
    <div className="flex flex-wrap gap-200">
      {detail.variants?.length > 1 &&
        detail.variants.map((variant) => (
          <Tooltip
            content={
              <TooltipContent
                title={detail.title}
                variant={variant}
                variantLabel={variant.title}
              />
            }
            key={variant.id}
            offset={{ mainAxis: 4, crossAxis: 4 }}
            placement="bottom-start"
            variant="outline"
          >
            <LinkButton
              as={Link}
              className={variantButton({ size: "current", variant: "outline" })}
              data-selected={variant.id === selectedVariant?.id}
              href={`/produkt/${handle}?variant=${variant.title.toLowerCase()}`}
            >
              {variant.title}
              <span
                aria-hidden="true"
                className="absolute top-0 right-0"
                style={decorationStyle}
              />
            </LinkButton>
          </Tooltip>
        ))}
    </div>
  )
}

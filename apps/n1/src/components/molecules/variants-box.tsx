import { ProductCard } from "@techsio/ui-kit/molecules/product-card"
import { slugify } from "@techsio/ui-kit/utils"
import { useState } from "react"

type VariantsBoxProps = {
  variants: string[]
  limit?: number
}

// Variant C: Hover / Expand (Absolute overlay to avoid layout shift)
export const VariantsBox = ({ variants, limit = 3 }: VariantsBoxProps) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const visibleVariants = variants.slice(0, limit)
  const remainingCount = variants.length - limit
  const hasMore = remainingCount > 0
  const handleExpand = () => {
    if (hasMore) {
      setIsExpanded(true)
    }
  }
  const handleCollapse = () => {
    if (hasMore) {
      setIsExpanded(false)
    }
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover/focus handlers are needed for expanded variant display
    // biome-ignore lint/a11y/noStaticElementInteractions: wrapper handles hover/focus without click semantics
    <div
      className="relative flex flex-col items-center justify-center"
      onBlur={hasMore ? handleCollapse : undefined}
      onFocus={hasMore ? handleExpand : undefined}
      onMouseEnter={hasMore ? handleExpand : undefined}
      onMouseLeave={hasMore ? handleCollapse : undefined}
      role={hasMore ? "button" : undefined}
      tabIndex={hasMore ? 0 : undefined}
    >
      {/* Static container - always determines size */}
      <ProductCard.Actions
        className={`flex flex-wrap items-center justify-center gap-50 ${isExpanded ? "invisible" : ""}`}
      >
        {visibleVariants.map((variant) => (
          <ProductCard.Button
            buttonVariant="custom"
            className="h-650 min-w-650 items-center border border-border-secondary bg-surface px-50 py-50"
            key={slugify(variant)}
          >
            <span className="font-normal text-2xs text-fg-primary">
              {variant}
            </span>
          </ProductCard.Button>
        ))}
        {hasMore && (
          <span className="text-2xs text-fg-secondary">+{remainingCount}</span>
        )}
      </ProductCard.Actions>

      {/* Absolute expanded container */}
      {isExpanded && hasMore && (
        <ProductCard.Actions className="absolute bottom-0 z-10 flex w-max max-w-full flex-wrap items-center justify-center gap-50 rounded-md border border-border-secondary bg-surface p-50 shadow-lg">
          {variants.map((variant) => (
            <ProductCard.Button
              buttonVariant="custom"
              className="h-650 min-w-650 items-center border border-border-secondary bg-surface px-50 py-50"
              key={slugify(variant)}
            >
              <span className="font-normal text-2xs text-fg-primary">
                {variant}
              </span>
            </ProductCard.Button>
          ))}
        </ProductCard.Actions>
      )}
    </div>
  )
}

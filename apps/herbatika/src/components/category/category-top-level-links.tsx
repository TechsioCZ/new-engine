import type { HttpTypes } from "@medusajs/types"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StorefrontLink } from "@/components/storefront-link"
import { buildUrl } from "@/lib/url/builder"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

type CategoryTopLevelLinksProps = {
  topLevelCategories: HttpTypes.StoreProductCategory[]
  activeCategoryHandle: string | null
  getCategoryLabel: (category: HttpTypes.StoreProductCategory) => string
  onCategoryBlur: (category: HttpTypes.StoreProductCategory) => void
  onCategoryFocus: (category: HttpTypes.StoreProductCategory) => void
  onCategoryMouseEnter: (category: HttpTypes.StoreProductCategory) => void
  onCategoryMouseLeave: (category: HttpTypes.StoreProductCategory) => void
}

export function CategoryTopLevelLinks({
  topLevelCategories,
  activeCategoryHandle,
  getCategoryLabel,
  onCategoryBlur,
  onCategoryFocus,
  onCategoryMouseEnter,
  onCategoryMouseLeave,
}: CategoryTopLevelLinksProps) {
  const market = useMarketContext().code

  return (
    <div className="flex flex-wrap gap-200">
      {topLevelCategories.map((category) => (
        <LinkButton
          as={StorefrontLink}
          href={buildUrl({ market, kind: "category", slug: category.handle })}
          key={category.id}
          onBlur={() => onCategoryBlur(category)}
          onFocus={() => onCategoryFocus(category)}
          onMouseEnter={() => onCategoryMouseEnter(category)}
          onMouseLeave={() => onCategoryMouseLeave(category)}
          size="sm"
          theme={
            category.handle === activeCategoryHandle ? "solid" : "outlined"
          }
          variant={
            category.handle === activeCategoryHandle ? "primary" : "secondary"
          }
        >
          {getCategoryLabel(category)}
        </LinkButton>
      ))}
    </div>
  )
}

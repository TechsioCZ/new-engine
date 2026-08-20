import type { HttpTypes } from "@medusajs/types"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StorefrontLink } from "@/components/storefront-link"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"

type CategoryTopLevelLinksProps = {
  topLevelCategories: HttpTypes.StoreProductCategory[]
  categoryPublicSlugsById?: Readonly<Record<string, string>>
  activeCategoryHandle: string | null
  getCategoryLabel: (category: HttpTypes.StoreProductCategory) => string
  onCategoryBlur: (category: HttpTypes.StoreProductCategory) => void
  onCategoryFocus: (category: HttpTypes.StoreProductCategory) => void
  onCategoryMouseEnter: (category: HttpTypes.StoreProductCategory) => void
  onCategoryMouseLeave: (category: HttpTypes.StoreProductCategory) => void
}

export function CategoryTopLevelLinks({
  topLevelCategories,
  categoryPublicSlugsById = {},
  activeCategoryHandle,
  getCategoryLabel,
  onCategoryBlur,
  onCategoryFocus,
  onCategoryMouseEnter,
  onCategoryMouseLeave,
}: CategoryTopLevelLinksProps) {
  const { code: market } = useMarketContext()
  const projectedCategories = topLevelCategories.flatMap((category) => {
    const href = buildProjectedEntityPath(
      "category",
      { publicSlug: categoryPublicSlugsById[category.id] },
      market
    )
    return href ? [{ category, href }] : []
  })

  return (
    <div className="flex flex-wrap gap-200">
      {projectedCategories.map(({ category, href }) => (
        <LinkButton
          as={StorefrontLink}
          href={href}
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

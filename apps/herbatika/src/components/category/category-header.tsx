import { Badge } from "@techsio/ui-kit/atoms/badge"
import { useTranslations } from "next-intl"

type CategoryHeaderProps = {
  title: string
  categoryFound: boolean
  categorySubtitle: string
  totalProducts: number
  activeAsideFilterCount: number
  displayedProductsCount: number
}

export function CategoryHeader({
  title,
  categoryFound,
  categorySubtitle,
  totalProducts,
  activeAsideFilterCount,
  displayedProductsCount,
}: CategoryHeaderProps) {
  const tCatalog = useTranslations("catalog")

  return (
    <header className="space-y-200">
      <h1 className="font-semibold text-2xl">{title}</h1>
      <div className="flex flex-wrap gap-200">
        <Badge variant={categoryFound ? "success" : "warning"}>
          {categoryFound
            ? tCatalog("category.status.found")
            : tCatalog("category.status.not_found")}
        </Badge>
        <Badge variant="info">{categorySubtitle}</Badge>
        <Badge variant="info">
          {tCatalog("category.badges.products", { count: totalProducts })}
        </Badge>
        {activeAsideFilterCount > 0 && (
          <Badge variant="warning">
            {tCatalog("category.badges.filtered_products", {
              count: displayedProductsCount,
            })}
          </Badge>
        )}
      </div>
    </header>
  )
}

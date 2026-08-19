import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"
import type { HomepageProductSection } from "@/components/homepage/homepage.types"
import { ProductCollectionSection } from "@/components/product/product-collection-section"
import { TextActionLink } from "@/components/text-action-link"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"

type HomepageProductCollectionSectionProps = {
  section: HomepageProductSection
  shouldShowProductSkeleton: boolean
  onProductHoverStart: (product: HttpTypes.StoreProduct) => void
  onProductHoverEnd: (product: HttpTypes.StoreProduct) => void
}

export function HomepageProductCollectionSection({
  section,
  shouldShowProductSkeleton,
  onProductHoverStart,
  onProductHoverEnd,
}: HomepageProductCollectionSectionProps) {
  const tContent = useTranslations("content")
  const market = useMarketContext().code
  const viewAllHref = buildProjectedEntityPath("category", section, market)

  return (
    <ProductCollectionSection
      display="carousel"
      headerAction={
        viewAllHref ? <TextActionLink href={viewAllHref} /> : undefined
      }
      id={section.id}
      keyPrefix={section.id}
      onProductHoverEnd={onProductHoverEnd}
      onProductHoverStart={onProductHoverStart}
      productPublicSlugsById={section.productPublicSlugsById}
      products={section.products}
      shouldShowSkeleton={shouldShowProductSkeleton}
      slidesLg={4.08}
      title={tContent(section.titleKey)}
    />
  )
}

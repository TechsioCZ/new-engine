import type { HttpTypes } from "@medusajs/types"
import type { HomepageProductSection } from "@/components/homepage/homepage.types"
import { ProductCollectionSection } from "@/components/product/product-collection-section"
import { TextActionLink } from "@/components/text-action-link"

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
  return (
    <ProductCollectionSection
      display="carousel"
      headerAction={<TextActionLink href={section.viewAllHref} />}
      id={section.id}
      keyPrefix={section.id}
      onProductHoverEnd={onProductHoverEnd}
      onProductHoverStart={onProductHoverStart}
      products={section.products}
      shouldShowSkeleton={shouldShowProductSkeleton}
      slidesLg={4.08}
      title={section.title}
    />
  )
}

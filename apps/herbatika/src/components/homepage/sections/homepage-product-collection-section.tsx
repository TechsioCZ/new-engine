import type { MedusaCatalogProduct } from "@techsio/storefront-data/catalog/medusa-service"
import { useTranslations } from "next-intl"

import type { HomepageProductSection } from "@/components/homepage/homepage.types"
import { ProductCollectionSection } from "@/components/product/product-collection-section"
import { TextActionLink } from "@/components/text-action-link"

interface HomepageProductCollectionSectionProps {
  section: HomepageProductSection
  shouldShowProductSkeleton: boolean
  onProductHoverStart: (product: MedusaCatalogProduct) => void
  onProductHoverEnd: (product: MedusaCatalogProduct) => void
}

export const HomepageProductCollectionSection = ({
  section,
  shouldShowProductSkeleton,
  onProductHoverStart,
  onProductHoverEnd,
}: HomepageProductCollectionSectionProps) => {
  const tContent = useTranslations("content")

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
      title={tContent(section.titleKey)}
    />
  )
}

"use client"

import { ProductCollectionSection } from "@/components/product/product-collection-section"
import { useTranslations } from "next-intl"
import type {
  Product,
  RelatedProductsSection,
} from "@/components/product-detail/product-detail.types"
import { SupportingText } from "@/components/text/supporting-text"

type ProductDetailRelatedProps = {
  isProductAdding: (productId: string) => boolean
  onAddToCart: (product: Product) => void
  onProductHoverEnd: (sectionId: string, product: Product) => void
  onProductHoverStart: (sectionId: string, product: Product) => void
  sections: RelatedProductsSection[]
}

export function ProductDetailRelated({
  isProductAdding,
  onAddToCart,
  onProductHoverEnd,
  onProductHoverStart,
  sections,
}: ProductDetailRelatedProps) {
  const tCatalog = useTranslations("catalog")

  if (sections.length === 0) {
    return null
  }

  return (
    <>
      {sections.map((section) => (
        <ProductCollectionSection
          headerAction={
            <SupportingText className="text-fg-tertiary">
              {tCatalog("product_detail.related.found", {
                count: section.products.length,
              })}
            </SupportingText>
          }
          headerClassName="items-center gap-200"
          isProductAdding={(product) => isProductAdding(product.id)}
          key={section.id}
          keyPrefix={section.id}
          layout="collection"
          onAddToCart={(productToAdd) => {
            onAddToCart(productToAdd)
          }}
          onProductHoverEnd={(hoveredProduct) => {
            onProductHoverEnd(section.id, hoveredProduct)
          }}
          onProductHoverStart={(hoveredProduct) => {
            onProductHoverStart(section.id, hoveredProduct)
          }}
          products={section.products}
          sectionClassName="py-500"
          title={section.title}
          titleClassName="text-3xl font-semibold text-fg-primary"
        />
      ))}
    </>
  )
}

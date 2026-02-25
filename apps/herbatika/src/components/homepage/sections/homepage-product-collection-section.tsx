import type { HttpTypes } from "@medusajs/types";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import type { HomepageProductSection } from "@/components/homepage/homepage.types";
import { ProductCollectionSection } from "@/components/product/product-collection-section";

type HomepageProductCollectionSectionProps = {
  section: HomepageProductSection;
  shouldShowProductSkeleton: boolean;
  isProductAdding: (product: HttpTypes.StoreProduct) => boolean;
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void;
  onProductHoverStart: (product: HttpTypes.StoreProduct) => void;
  onProductHoverEnd: (product: HttpTypes.StoreProduct) => void;
};

export function HomepageProductCollectionSection({
  section,
  shouldShowProductSkeleton,
  isProductAdding,
  onAddToCart,
  onProductHoverStart,
  onProductHoverEnd,
}: HomepageProductCollectionSectionProps) {
  return (
    <ProductCollectionSection
      headerAction={
        <LinkButton
          as={NextLink}
          className="hidden rounded-md px-400 py-200 text-sm font-semibold md:inline-flex"
          href="/#"
          icon="icon-[mdi--arrow-right]"
          iconPosition="right"
          size="sm"
          theme="outlined"
          variant="secondary"
        >
          Zobraziť viac
        </LinkButton>
      }
      id={section.id}
      isProductAdding={isProductAdding}
      keyPrefix={section.id}
      layout="home"
      onAddToCart={onAddToCart}
      onProductHoverEnd={onProductHoverEnd}
      onProductHoverStart={onProductHoverStart}
      products={section.products}
      shouldShowSkeleton={shouldShowProductSkeleton}
      subtitle={section.subtitle}
      title={section.title}
    />
  );
}

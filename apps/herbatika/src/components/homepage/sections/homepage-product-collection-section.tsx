import type { HttpTypes } from "@medusajs/types";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { HerbatikaProductGrid } from "@/components/product/herbatika-product-grid";
import { HerbatikaProductGridSkeleton } from "@/components/product/herbatika-product-grid-skeleton";
import type { HomepageProductSection } from "@/components/homepage/homepage.types";
import { HomepageSectionHeader } from "./homepage-section-header";

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
    <section className="space-y-400" id={section.id}>
      <HomepageSectionHeader
        ctaHref="/#"
        ctaLabel="Zobraziť viac"
        title={section.title}
        subtitle={section.subtitle}
      />

      {shouldShowProductSkeleton ? (
        <HerbatikaProductGridSkeleton layout="home" />
      ) : section.products.length > 0 ? (
        <HerbatikaProductGrid
          isProductAdding={isProductAdding}
          keyPrefix={section.id}
          layout="home"
          onAddToCart={onAddToCart}
          onProductHoverEnd={onProductHoverEnd}
          onProductHoverStart={onProductHoverStart}
          products={section.products}
        />
      ) : (
        <ExtraText className="text-sm text-fg-secondary">
          Produkty sa momentálne načítavajú.
        </ExtraText>
      )}
    </section>
  );
}

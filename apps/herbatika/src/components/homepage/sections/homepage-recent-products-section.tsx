"use client";

import type { HttpTypes } from "@medusajs/types";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { useMemo, useState } from "react";
import { HerbatikaProductCard } from "@/components/herbatika-product-card";
import { HerbatikaProductCardSkeleton } from "@/components/herbatika-product-card-skeleton";
import { RECENT_PRODUCT_SKELETON_KEYS } from "@/components/homepage/homepage.data";

type HomepageRecentProductsSectionProps = {
  products: HttpTypes.StoreProduct[];
  shouldShowProductSkeleton: boolean;
};

const RECENT_PRODUCTS_GRID_CLASSNAME = "grid grid-cols-2 gap-300 md:grid-cols-4";
const RECENT_PRODUCTS_VISIBLE_COUNT = 4;

export function HomepageRecentProductsSection({
  products,
  shouldShowProductSkeleton,
}: HomepageRecentProductsSectionProps) {
  const [productsWithImageError, setProductsWithImageError] = useState<string[]>(
    [],
  );

  const visibleProducts = useMemo(() => {
    return products
      .filter((product) => {
        if (!product.id) {
          return true;
        }

        return !productsWithImageError.includes(product.id);
      })
      .slice(0, RECENT_PRODUCTS_VISIBLE_COUNT);
  }, [products, productsWithImageError]);

  const handleCompactImageError = (product: HttpTypes.StoreProduct) => {
    if (!product.id) {
      return;
    }

    setProductsWithImageError((currentProductsWithImageError) => {
      return currentProductsWithImageError.includes(product.id)
        ? currentProductsWithImageError
        : [...currentProductsWithImageError, product.id];
    });
  };

  return (
    <section className="space-y-400" id="naposledy-navstivene">
      <header>
        <h2 className="text-2xl font-bold text-fg-primary">Naposledy navštívené</h2>
      </header>

      {shouldShowProductSkeleton ? (
        <div className={RECENT_PRODUCTS_GRID_CLASSNAME}>
          {RECENT_PRODUCT_SKELETON_KEYS.map((skeletonKey) => (
            <HerbatikaProductCardSkeleton key={skeletonKey} variant="compact" />
          ))}
        </div>
      ) : visibleProducts.length > 0 ? (
        <div className={RECENT_PRODUCTS_GRID_CLASSNAME}>
          {visibleProducts.map((product, index) => (
            <HerbatikaProductCard
              key={`recent-product-${product.id}-${index}`}
              onCompactImageError={handleCompactImageError}
              product={product}
              variant="compact"
            />
          ))}
        </div>
      ) : (
        <ExtraText className="text-sm text-fg-secondary">
          Zatiaľ nemáte žiadne naposledy navštívené produkty.
        </ExtraText>
      )}
    </section>
  );
}

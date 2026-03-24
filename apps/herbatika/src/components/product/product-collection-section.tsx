"use client";

import type { HttpTypes } from "@medusajs/types";
import type { ReactNode } from "react";
import {
  HerbatikaProductGrid,
  type HerbatikaProductGridLayout,
} from "@/components/product/herbatika-product-grid";
import { HerbatikaProductGridSkeleton } from "@/components/product/herbatika-product-grid-skeleton";
import { SupportingText } from "@/components/text/supporting-text";

type ProductCollectionSectionProps = {
  title: string;
  products: HttpTypes.StoreProduct[];
  layout: HerbatikaProductGridLayout;
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void> | void;
  id?: string;
  subtitle?: string;
  shouldShowSkeleton?: boolean;
  skeletonLayout?: HerbatikaProductGridLayout;
  emptyText?: string;
  sectionClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  headerAction?: ReactNode;
  keyPrefix?: string;
  isProductAdding?: (product: HttpTypes.StoreProduct) => boolean;
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void;
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void;
};

const EMPTY_PRODUCTS_TEXT = "Produkty sa momentálne načítavajú.";

export function ProductCollectionSection({
  title,
  products,
  layout,
  onAddToCart,
  id,
  subtitle,
  shouldShowSkeleton = false,
  skeletonLayout,
  emptyText = EMPTY_PRODUCTS_TEXT,
  sectionClassName,
  headerClassName,
  titleClassName,
  subtitleClassName,
  headerAction,
  keyPrefix,
  isProductAdding,
  onProductHoverStart,
  onProductHoverEnd,
}: ProductCollectionSectionProps) {
  const sectionClassNames = ["space-y-400", sectionClassName].filter(Boolean).join(" ");
  const headerClassNames = [
    "flex items-end justify-between gap-400",
    headerClassName,
  ]
    .filter(Boolean)
    .join(" ");
  const titleClassNames = ["text-2xl font-bold text-fg-primary", titleClassName]
    .filter(Boolean)
    .join(" ");
  const subtitleClassNames = ["mt-100 text-sm text-fg-secondary", subtitleClassName]
    .filter(Boolean)
    .join(" ");
  const activeSkeletonLayout = skeletonLayout ?? layout;

  return (
    <section className={sectionClassNames} id={id}>
      <header className={headerClassNames}>
        <div>
          <h2 className={titleClassNames}>{title}</h2>
          {subtitle ? <p className={subtitleClassNames}>{subtitle}</p> : null}
        </div>
        {headerAction}
      </header>

      {shouldShowSkeleton ? (
        <HerbatikaProductGridSkeleton layout={activeSkeletonLayout} />
      ) : products.length > 0 ? (
        <HerbatikaProductGrid
          isProductAdding={isProductAdding}
          keyPrefix={keyPrefix}
          layout={layout}
          onAddToCart={onAddToCart}
          onProductHoverEnd={onProductHoverEnd}
          onProductHoverStart={onProductHoverStart}
          products={products}
        />
      ) : (
        <SupportingText className="text-sm text-fg-secondary">
          {emptyText}
        </SupportingText>
      )}
    </section>
  );
}

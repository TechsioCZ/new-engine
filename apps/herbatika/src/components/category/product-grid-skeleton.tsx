import { HerbatikaProductGridSkeleton } from "@/components/product/herbatika-product-grid-skeleton";
import type { HerbatikaProductGridLayout } from "@/components/product/herbatika-product-grid";

type ProductGridSkeletonProps = {
  layout?: HerbatikaProductGridLayout;
};

export function ProductGridSkeleton({
  layout = "catalog",
}: ProductGridSkeletonProps) {
  return <HerbatikaProductGridSkeleton layout={layout} />;
}

import { HerbatikaProductCardSkeleton } from "@/components/herbatika-product-card-skeleton";

const PRODUCT_SKELETON_KEYS = [
  "skeleton-1",
  "skeleton-2",
  "skeleton-3",
  "skeleton-4",
  "skeleton-5",
  "skeleton-6",
  "skeleton-7",
  "skeleton-8",
] as const;

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-400 lg:grid-cols-3">
      {PRODUCT_SKELETON_KEYS.map((skeletonKey) => (
        <HerbatikaProductCardSkeleton key={skeletonKey} />
      ))}
    </div>
  );
}

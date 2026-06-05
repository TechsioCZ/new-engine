"use client";

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { ProductDetailSkeleton } from "@/components/product-detail/sections/product-detail-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-product-detail-page-gap p-product-detail-page font-rubik 2xl:p-product-detail-page-lg">
      <Skeleton.Rectangle className="h-skeleton-text-line w-full rounded-full" />
      <ProductDetailSkeleton />
    </main>
  );
}

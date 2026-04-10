"use client";

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { ProductDetailSkeleton } from "@/components/product-detail/sections/product-detail-skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-600 px-400 py-600 font-rubik lg:px-550">
      <Skeleton.Rectangle className="h-4 w-full rounded-full" />
      <ProductDetailSkeleton />
    </main>
  );
}

import { HydrationBoundary } from "@tanstack/react-query";
import { connection } from "next/server";
import { Suspense } from "react";
import { StorefrontProductDetail } from "@/components/storefront-product-detail";
import { prefetchProductDetailPageStorefrontData } from "@/lib/storefront/ssr";

type ProductDetailPageProps = {
  params: Promise<{
    handle: string;
  }>;
};

function ProductDetailPageFallback() {
  return <main className="mx-auto min-h-dvh w-full max-w-max-w" />;
}

async function ProductDetailPageContent({ params }: ProductDetailPageProps) {
  await connection();
  const { handle } = await params;
  const { dehydratedState } = await prefetchProductDetailPageStorefrontData(handle);

  return (
    <HydrationBoundary state={dehydratedState}>
      <StorefrontProductDetail handle={handle} />
    </HydrationBoundary>
  );
}

export default function ProductDetailPage(props: ProductDetailPageProps) {
  return (
    <Suspense fallback={<ProductDetailPageFallback />}>
      <ProductDetailPageContent {...props} />
    </Suspense>
  );
}

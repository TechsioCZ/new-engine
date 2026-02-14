import { RegionProvider } from "@techsio/storefront-data/shared";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientOnly } from "@/components/client-only";
import { StorefrontProductDetail } from "@/components/storefront-product-detail";
import { StorefrontHydrationBoundary } from "@/components/storefront-hydration-boundary";
import { prefetchProductDetailPageStorefrontData } from "@/lib/storefront/ssr";

type ProductDetailPageProps = {
  params: Promise<{
    handle: string;
  }>;
};

function ProductDetailPageFallback() {
  return <main className="mx-auto min-h-[40dvh] w-full max-w-(--breakpoint-2xl)" />;
}

async function ProductDetailPageContent({ params }: ProductDetailPageProps) {
  await connection();
  const { handle } = await params;
  const { dehydratedState, region } = await prefetchProductDetailPageStorefrontData(
    handle,
  );

  return (
    <StorefrontHydrationBoundary state={dehydratedState}>
      <RegionProvider region={region}>
        <ClientOnly fallback={<ProductDetailPageFallback />}>
          <StorefrontProductDetail handle={handle} />
        </ClientOnly>
      </RegionProvider>
    </StorefrontHydrationBoundary>
  );
}

export default function ProductDetailPage(props: ProductDetailPageProps) {
  return (
    <Suspense fallback={<ProductDetailPageFallback />}>
      <ProductDetailPageContent {...props} />
    </Suspense>
  );
}

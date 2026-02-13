import { Suspense } from "react";
import { StorefrontProductDetail } from "@/components/storefront-product-detail";

type ProductDetailPageProps = {
  params: Promise<{
    handle: string;
  }>;
};

async function ProductDetailPageContent({ params }: ProductDetailPageProps) {
  const { handle } = await params;
  return <StorefrontProductDetail handle={handle} />;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl p-6">
          <div className="h-96 animate-pulse rounded-xl border border-black/10 bg-white" />
        </main>
      }
    >
      <ProductDetailPageContent params={params} />
    </Suspense>
  );
}

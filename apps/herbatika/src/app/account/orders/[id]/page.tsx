import { Suspense } from "react";
import { StorefrontAccountOrderDetail } from "@/components/storefront-account-order-detail";

type AccountOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function AccountOrderDetailPageContent({
  params,
}: AccountOrderDetailPageProps) {
  const { id } = await params;

  return <StorefrontAccountOrderDetail orderId={id} />;
}

export default function AccountOrderDetailPage({
  params,
}: AccountOrderDetailPageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl p-6">
          <div className="h-96 animate-pulse rounded-xl border border-black/10 bg-white" />
        </main>
      }
    >
      <AccountOrderDetailPageContent params={params} />
    </Suspense>
  );
}

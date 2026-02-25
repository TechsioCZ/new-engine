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
        <main className="mx-auto w-full max-w-max-w px-400 py-550 lg:px-550">
          <div className="h-950 animate-pulse rounded-lg border border-border-secondary bg-surface" />
        </main>
      }
    >
      <AccountOrderDetailPageContent params={params} />
    </Suspense>
  );
}

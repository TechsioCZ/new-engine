import { StorefrontAccountOrderDetail } from "@/components/storefront-account-order-detail";

type AccountOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AccountOrderDetailPage({
  params,
}: AccountOrderDetailPageProps) {
  const { id } = await params;

  return <StorefrontAccountOrderDetail orderId={id} />;
}

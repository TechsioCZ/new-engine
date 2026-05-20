import { StorefrontAccountOrderDetail } from "@/components/storefront-account-order-detail";

type AccountOrderDetailPageProps = PageProps<"/ucet/objednavky/[id]">;

export default async function AccountOrderDetailPage({
  params,
}: AccountOrderDetailPageProps) {
  const { id } = await params;

  return <StorefrontAccountOrderDetail orderId={id} />;
}

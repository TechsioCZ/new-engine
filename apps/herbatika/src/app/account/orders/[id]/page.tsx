import { AccountOrderDetail } from "@/components/account-order-detail"

interface AccountOrderDetailPageProps {
  params: Promise<{
    id: string
  }>
}

const AccountOrderDetailPage = async ({
  params,
}: AccountOrderDetailPageProps) => {
  const { id } = await params

  return <AccountOrderDetail orderId={id} />
}

export default AccountOrderDetailPage

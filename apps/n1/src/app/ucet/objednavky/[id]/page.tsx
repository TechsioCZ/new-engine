import { headers } from "next/headers"

import { OrderDetailClient } from "./_components/order-detail-client"

const OrderDetailPage = async () => {
  await headers()
  return <OrderDetailClient />
}

export default OrderDetailPage

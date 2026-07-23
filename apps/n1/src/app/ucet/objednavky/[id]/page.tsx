import { headers } from "next/headers"

import { OrderDetailClient } from "./_components/order-detail-client"

export default async function OrderDetailPage() {
  await headers()
  return <OrderDetailClient />
}

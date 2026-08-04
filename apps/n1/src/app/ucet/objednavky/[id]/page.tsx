import { headers } from "next/headers"

import { OrderDetailClient } from "./_components/order-detail-client"

export default function OrderDetailPage() {
  headers()
  return <OrderDetailClient />
}

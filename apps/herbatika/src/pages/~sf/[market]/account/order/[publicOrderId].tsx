import type { GetServerSideProps } from "next"
import { AccountOrderDetail } from "@/components/account-order-detail"
import { type FlowPageProps, resolveFlowPage } from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"

type Props = FlowPageProps<{ id: string }>
export const getServerSideProps: GetServerSideProps<Props> = (context) => {
  const id = context.params?.publicOrderId
  return typeof id === "string"
    ? resolveFlowPage(context, async () => ({ type: "found", value: { id } }))
    : Promise.resolve({ notFound: true })
}
export default function OrderPage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  return source ? <AccountOrderDetail orderId={source.id} /> : null
}

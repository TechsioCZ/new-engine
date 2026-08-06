import type { GetServerSideProps } from "next"
import { CheckoutPaymentReturnPanel } from "@/components/checkout/checkout-payment-return-panel"
import { type FlowPageProps, resolveFlowPage } from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"

type Props = FlowPageProps
export const getServerSideProps: GetServerSideProps<Props> = resolveFlowPage
export default function CheckoutResult({ status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  return (
    <main>
      <CheckoutPaymentReturnPanel />
    </main>
  )
}

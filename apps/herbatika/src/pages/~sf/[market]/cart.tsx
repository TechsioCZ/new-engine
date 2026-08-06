import type { GetServerSideProps } from "next"
import { type FlowPageProps, resolveFlowPage } from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"

type Props = FlowPageProps
export const getServerSideProps: GetServerSideProps<Props> = resolveFlowPage
export default function CartPage({ status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  return (
    <main>
      <h1>Cart</h1>
    </main>
  )
}

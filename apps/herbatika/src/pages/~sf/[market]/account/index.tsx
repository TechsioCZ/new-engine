import type { GetServerSideProps } from "next"
import { AccountOverview } from "@/components/account-overview"
import { type FlowPageProps, resolveFlowPage } from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"

type Props = FlowPageProps
export const getServerSideProps: GetServerSideProps<Props> = resolveFlowPage
export default function AccountPage({ status }: Props) {
  return status ? <StatusSurface status={status} /> : <AccountOverview />
}

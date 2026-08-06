import type { GetServerSideProps } from "next"
import { AccountOrdersList } from "@/components/account-orders-list"
import { AccountProductLists } from "@/components/account-product-lists"
import { AccountSettings } from "@/components/account-settings"
import {
  type FlowPageProps,
  resolveFlowPage,
  resolveMarketParam,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import { getSegment } from "@/lib/url/segments"

type Section = "orders" | "lists" | "settings"
type Props = FlowPageProps<{ section: Section }>
export const getServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  const market = resolveMarketParam(context)
  const value = context.params?.section
  if (!(market && typeof value === "string")) {
    return { notFound: true }
  }
  const sections = [
    ["account.orders", "orders"],
    ["account.lists", "lists"],
    ["account.settings", "settings"],
  ] as const
  const section = sections.find(
    ([key]) => getSegment(market, key) === value.toLowerCase()
  )?.[1]
  return section
    ? await resolveFlowPage(context, async () => ({
        type: "found",
        value: { section },
      }))
    : { notFound: true }
}
export default function AccountSection({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  if (source?.section === "orders") {
    return <AccountOrdersList />
  }
  if (source?.section === "lists") {
    return <AccountProductLists />
  }
  if (source?.section === "settings") {
    return <AccountSettings />
  }
  return null
}

import type { GetServerSideProps } from "next"
import { AccountOverview } from "@/components/account-overview"
import { AccountShell } from "@/components/account-shell"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
import { resolveAccountPrivatePage } from "@/lib/routing/private-flows/account-page.server"
import type { PublicPageProps } from "@/lib/routing/public-page"

type Props = PublicPageProps<null>

export const getServerSideProps = (async (context) =>
  resolveAccountPrivatePage(context, {
    expectedRouteKey: "account",
    loadSource: async () => ({ kind: "found", value: null }),
  })) satisfies GetServerSideProps<Props>

export default function AccountPage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="account" />
  }
  return (
    <AccountShell>
      <AccountOverview />
    </AccountShell>
  )
}

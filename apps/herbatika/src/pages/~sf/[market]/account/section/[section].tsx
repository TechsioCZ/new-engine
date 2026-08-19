import type { GetServerSideProps } from "next"
import { AccountDeactivationSection } from "@/components/account/account-deactivation-section"
import { AccountOrdersList } from "@/components/account-orders-list"
import { AccountProductLists } from "@/components/account-product-lists"
import { AccountSettings } from "@/components/account-settings"
import { AccountShell } from "@/components/account-shell"
import { resolveAccountPrivatePage } from "@/lib/routing/private-flows/account-page.server"
import { notFoundResult, type PublicPageProps } from "@/lib/routing/public-page"
import type { AccountChildKey } from "@/lib/url/types"

type AccountSection = Extract<AccountChildKey, "orders" | "lists" | "settings">
type Props = PublicPageProps<Readonly<{ section: AccountSection }>>

const isAccountSection = (value: unknown): value is AccountSection =>
  value === "orders" || value === "lists" || value === "settings"

export const getServerSideProps = (async (context) => {
  const section = context.params?.section
  if (!isAccountSection(section)) {
    return notFoundResult(context)
  }
  const result = await resolveAccountPrivatePage(context, {
    expectedRouteKey: `account.${section}`,
    loadSource: async () => ({ kind: "found", value: { section } }),
    ...(section === "orders"
      ? {
          query: {
            kind: "account-orders" as const,
            path: { kind: "account" as const, section: "orders" as const },
          },
        }
      : {}),
  })
  return result
}) satisfies GetServerSideProps<Props>

export default function AccountSectionPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Account unavailable.</main>
  }
  return (
    <AccountShell>
      {page.value.section === "orders" ? <AccountOrdersList /> : null}
      {page.value.section === "lists" ? <AccountProductLists /> : null}
      {page.value.section === "settings" ? (
        <div className="space-y-400">
          <AccountSettings />
          <AccountDeactivationSection />
        </div>
      ) : null}
    </AccountShell>
  )
}

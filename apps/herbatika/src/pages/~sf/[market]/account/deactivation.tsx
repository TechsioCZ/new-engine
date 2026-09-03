import type { GetServerSideProps } from "next"
import { useTranslations } from "next-intl"
import { AccountDeactivationConfirmation } from "@/components/account/account-deactivation-confirmation"
import { exactOpaqueSegment } from "@/lib/routing/private-flows/opaque-values"
import {
  readExactPrivateQuery,
  resolvePrivateFlowPublicPage,
} from "@/lib/routing/private-flows/private-query"
import { transactionalFlowReader } from "@/lib/routing/private-flows/transactional-page.server"
import { notFoundResult, type PublicPageProps } from "@/lib/routing/public-page"

type Props = PublicPageProps<Readonly<{ token: string }>>

export const getServerSideProps = (async (context) => {
  const privateQuery = readExactPrivateQuery(context.req.url, ["token"])
  const token = exactOpaqueSegment(privateQuery?.get("token"))
  if (!(privateQuery && token)) {
    return notFoundResult(context)
  }
  const result = await resolvePrivateFlowPublicPage(context, {
    expectedRouteKey: "account.deactivation",
    loadSource: async (market) => {
      const validation = await transactionalFlowReader.readDeactivationToken(
        market,
        token
      )
      return validation.kind === "found"
        ? { kind: "found", value: { token } }
        : validation
    },
    suppressCanonicalization: true,
  })
  return result
}) satisfies GetServerSideProps<Props>

export default function AccountDeactivationPage({ page }: Props) {
  const t = useTranslations("auth")
  if (page.kind === "error") {
    return (
      <main data-status={page.status}>
        {t("deactivation.page.confirmation_unavailable")}
      </main>
    )
  }
  return <AccountDeactivationConfirmation token={page.value.token} />
}

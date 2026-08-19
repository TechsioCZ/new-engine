import type { GetServerSideProps } from "next"
import { resolveAfterAuthHref } from "@/components/auth/auth-helpers"
import { ForgotPasswordPanel } from "@/components/auth/forgot-password-panel"
import { ResetPasswordPanel } from "@/components/auth/reset-password-panel"
import { AuthControls } from "@/components/auth-controls"
import { exactOpaqueSegment } from "@/lib/routing/private-flows/opaque-values"
import {
  readExactPrivateQuery,
  resolvePrivateFlowPublicPage,
} from "@/lib/routing/private-flows/private-query"
import { transactionalFlowReader } from "@/lib/routing/private-flows/transactional-page.server"
import {
  foundSource,
  notFoundResult,
  type PublicPageProps,
} from "@/lib/routing/public-page"
import { buildPath } from "@/lib/url/public-url"
import type { AccountChildKey } from "@/lib/url/types"

type AuthAction = Extract<
  AccountChildKey,
  "login" | "register" | "forgotPassword" | "resetPassword"
>

type AuthValue = Readonly<{
  action: AuthAction
  afterAuthHref: string
  email: string | null
  flow: "account-setup" | "reset-password"
  token: string | null
}>

type Props = PublicPageProps<AuthValue>

const isAuthAction = (value: unknown): value is AuthAction =>
  value === "login" ||
  value === "register" ||
  value === "forgotPassword" ||
  value === "resetPassword"

const allowedAuthQueryKeys = (action: AuthAction): readonly string[] => {
  if (action === "resetPassword") {
    return ["email", "flow", "next"]
  }
  if (action === "login" || action === "register") {
    return ["next"]
  }
  return []
}

export const getServerSideProps = (async (context) => {
  const action = context.params?.action
  const pathValue = context.params?.value
  if (!isAuthAction(action)) {
    return notFoundResult(context)
  }
  const tokenFromPath =
    Array.isArray(pathValue) && pathValue.length === 1
      ? exactOpaqueSegment(pathValue[0])
      : null
  const privateQuery = readExactPrivateQuery(
    context.req.url,
    allowedAuthQueryKeys(action)
  )
  const flow = privateQuery?.get("flow")
  if (
    !privateQuery ||
    (action === "resetPassword" && !tokenFromPath) ||
    (action !== "resetPassword" && pathValue !== undefined) ||
    (flow !== undefined &&
      flow !== "account-setup" &&
      flow !== "reset-password")
  ) {
    return notFoundResult(context)
  }
  const result = await resolvePrivateFlowPublicPage(context, {
    expectedRouteKey: `account.${action}`,
    loadSource: async (market) => {
      if (action === "resetPassword" && tokenFromPath) {
        const validation = await transactionalFlowReader.readResetToken(
          market,
          tokenFromPath
        )
        if (validation.kind !== "found") {
          return validation
        }
      }
      return foundSource<AuthValue>({
        action,
        afterAuthHref: resolveAfterAuthHref(
          privateQuery.get("next"),
          buildPath({ kind: "account" }, market)
        ),
        email: privateQuery.get("email") ?? null,
        flow: flow === "account-setup" ? "account-setup" : "reset-password",
        token: tokenFromPath,
      })
    },
    suppressCanonicalization:
      action === "resetPassword" || privateQuery.size > 0,
  })
  return result
}) satisfies GetServerSideProps<Props>

export default function AccountAuthPage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Authentication unavailable.</main>
  }
  const value = page.value
  return (
    <main className="mx-auto w-full max-w-auth-content p-auth-page 2xl:p-auth-page-lg">
      {value.action === "login" || value.action === "register" ? (
        <AuthControls afterAuthHref={value.afterAuthHref} mode={value.action} />
      ) : null}
      {value.action === "forgotPassword" ? <ForgotPasswordPanel /> : null}
      {value.action === "resetPassword" ? (
        <ResetPasswordPanel
          email={value.email}
          flow={value.flow}
          token={value.token}
        />
      ) : null}
    </main>
  )
}

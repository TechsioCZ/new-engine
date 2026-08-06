import type { GetServerSideProps } from "next"
import { ForgotPasswordPanel } from "@/app/auth/forgot-password/forgot-password-panel"
import { ResetPasswordPanel } from "@/app/auth/reset-password/reset-password-panel"
import { resolveAfterAuthHref } from "@/components/auth/auth-helpers"
import { AuthControls } from "@/components/auth-controls"
import {
  type FlowPageProps,
  resolveFlowPage,
  resolveMarketParam,
} from "@/lib/routing/public-page"
import { StatusSurface } from "@/lib/routing/status-surface"
import { getSegment } from "@/lib/url/segments"

type Action = "login" | "register" | "forgot" | "reset"
type Props = FlowPageProps<{
  action: Action
  next: string
  token: string | null
  email: string | null
  flow: "account-setup" | "reset-password"
}>
const scalar = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value
export const getServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  const market = resolveMarketParam(context)
  const value = context.params?.action
  if (!(market && typeof value === "string")) {
    return { notFound: true }
  }
  const actions = [
    ["account.login", "login"],
    ["account.register", "register"],
    ["account.forgotPassword", "forgot"],
    ["account.resetPassword", "reset"],
  ] as const
  const action = actions.find(
    ([key]) => getSegment(market, key) === value.toLowerCase()
  )?.[1]
  if (!action) {
    return { notFound: true }
  }
  return await resolveFlowPage(context, async () => ({
    type: "found",
    value: {
      action,
      next: resolveAfterAuthHref(market, scalar(context.query.next)),
      token: scalar(context.query.token) ?? null,
      email: scalar(context.query.email) ?? null,
      flow:
        scalar(context.query.flow) === "account-setup"
          ? "account-setup"
          : "reset-password",
    },
  }))
}
export default function AuthPage({ source, status }: Props) {
  if (status) {
    return <StatusSurface status={status} />
  }
  if (!source) {
    return null
  }
  if (source.action === "login" || source.action === "register") {
    return (
      <main>
        <AuthControls afterAuthHref={source.next} mode={source.action} />
      </main>
    )
  }
  if (source.action === "forgot") {
    return (
      <main>
        <ForgotPasswordPanel />
      </main>
    )
  }
  return (
    <main>
      <ResetPasswordPanel
        email={source.email}
        flow={source.flow}
        token={source.token}
      />
    </main>
  )
}

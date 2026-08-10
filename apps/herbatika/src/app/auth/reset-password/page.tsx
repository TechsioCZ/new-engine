import { ResetPasswordPanel } from "@/app/auth/reset-password/reset-password-panel"

interface ResetPasswordPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const resolveStringParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

const ResetPasswordPage = async ({ searchParams }: ResetPasswordPageProps) => {
  const {
    email: emailParam,
    flow: flowParam,
    token: tokenParam,
  } = await searchParams
  const token = resolveStringParam(tokenParam)
  const email = resolveStringParam(emailParam)
  const flow =
    resolveStringParam(flowParam) === "account-setup"
      ? "account-setup"
      : "reset-password"

  return (
    <main className="mx-auto w-full max-w-auth-content p-auth-page 2xl:p-auth-page-lg">
      <ResetPasswordPanel email={email} flow={flow} token={token} />
    </main>
  )
}

export default ResetPasswordPage

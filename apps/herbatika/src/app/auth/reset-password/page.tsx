import { ResetPasswordPanel } from "@/app/auth/reset-password/reset-password-panel"

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const resolveStringParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams
  const token = resolveStringParam(resolvedSearchParams.token)
  const email = resolveStringParam(resolvedSearchParams.email)

  return (
    <main className="mx-auto w-full max-w-auth-content p-auth-page 2xl:p-auth-page-lg">
      <ResetPasswordPanel email={email} token={token} />
    </main>
  )
}

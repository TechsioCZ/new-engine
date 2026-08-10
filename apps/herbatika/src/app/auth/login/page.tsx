import { AuthControls } from "@/components/auth-controls"
import { resolveAfterAuthHref } from "@/components/auth/auth-helpers"

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const { next } = await searchParams
  const afterAuthHref = resolveAfterAuthHref(next)

  return (
    <main className="mx-auto w-full max-w-auth-content p-auth-page 2xl:p-auth-page-lg">
      <AuthControls afterAuthHref={afterAuthHref} mode="login" />
    </main>
  )
}

export default LoginPage

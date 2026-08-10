import { AuthControls } from "@/components/auth-controls"
import { resolveAfterAuthHref } from "@/components/auth/auth-helpers"

interface RegisterPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const RegisterPage = async ({ searchParams }: RegisterPageProps) => {
  const { next } = await searchParams
  const afterAuthHref = resolveAfterAuthHref(next)

  return (
    <main className="mx-auto w-full max-w-auth-content p-auth-page 2xl:p-auth-page-lg">
      <AuthControls afterAuthHref={afterAuthHref} mode="register" />
    </main>
  )
}

export default RegisterPage

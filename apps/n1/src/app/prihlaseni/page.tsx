"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/forms/login-form"
import { resolveLoginRedirectPath } from "@/lib/auth-redirect"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = resolveLoginRedirectPath(searchParams.get("redirect"))

  return (
    <div className="mx-auto w-md max-w-full py-600">
      <LoginForm
        onSuccess={() => router.replace(redirectPath)}
        showForgotPasswordLink
        showRegisterLink
      />
    </div>
  )
}

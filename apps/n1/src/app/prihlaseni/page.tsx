"use client"

import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/forms/login-form"

export default function LoginPage() {
  const router = useRouter()

  return (
    <div className="mx-auto w-md max-w-full py-600">
      <LoginForm
        onSuccess={() => router.push("/ucet/profil")}
        showForgotPasswordLink
        showRegisterLink
      />
    </div>
  )
}

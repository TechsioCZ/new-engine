"use client"
import { useRouter } from "next/navigation"

import { RegisterForm } from "@/components/forms/register-form"

export default function RegisterPage() {
  const router = useRouter()

  return (
    <div className="mx-auto w-md max-w-full py-600">
      <RegisterForm onSuccess={() => router.push("/ucet/profil")} />
    </div>
  )
}

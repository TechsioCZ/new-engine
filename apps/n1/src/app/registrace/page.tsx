"use client"
import { useRouter } from "next/navigation"

import { RegisterForm } from "@/components/forms/register-form"

const RegisterPage = () => {
  const router = useRouter()

  return (
    <div className="mx-auto w-md max-w-full py-600">
      <RegisterForm
        onSuccess={() => {
          router.push("/ucet/profil")
        }}
      />
    </div>
  )
}

export default RegisterPage

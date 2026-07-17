"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { requestPasswordResetProxy } from "@/lib/storefront/auth/proxy"

const LOGIN_HREF = "/auth/login"

export const ForgotPasswordPanel = () => {
  const tAuth = useTranslations("auth")
  const [isBusy, setIsBusy] = useState(false)

  const handleSubmit = async (values: { email: string }) => {
    setIsBusy(true)
    try {
      await requestPasswordResetProxy(values.email)
      return null
    } catch {
      return tAuth("forgot.failed")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-max-w space-y-400 p-400">
      <header className="space-y-200">
        <h1 className="font-semibold text-lg">{tAuth("forgot.title")}</h1>
        <p className="text-fg-secondary text-sm">
          {tAuth("forgot.description")}
        </p>
      </header>

      <ForgotPasswordForm
        defaultValues={{ email: "" }}
        isBusy={isBusy}
        loginHref={LOGIN_HREF}
        onSubmit={handleSubmit}
      />
    </section>
  )
}

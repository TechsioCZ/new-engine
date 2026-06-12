"use client"

import { useState } from "react"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { requestPasswordResetProxy } from "@/lib/storefront/auth/proxy"

const LOGIN_HREF = "/auth/login"

export const ForgotPasswordPanel = () => {
  const [isBusy, setIsBusy] = useState(false)

  const handleSubmit = async (values: { email: string }) => {
    setIsBusy(true)
    try {
      await requestPasswordResetProxy(values.email)
      return null
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Nepodarilo sa odoslať odkaz na obnovu hesla."
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-max-w space-y-400 p-400">
      <header className="space-y-200">
        <h1 className="font-semibold text-lg">Zabudnuté heslo</h1>
        <p className="text-fg-secondary text-sm">
          Zadajte e-mailovú adresu, na ktorú máte vytvorený účet. Pošleme vám
          odkaz na obnovu hesla.
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

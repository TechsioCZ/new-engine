"use client"

import { useState } from "react"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { requestPasswordUpdateProxy } from "@/lib/storefront/auth/proxy"

const LOGIN_HREF = "/auth/login"

type ResetPasswordFlow = "account-setup" | "reset-password"

type ResetPasswordPanelProps = {
  token: string | null
  email: string | null
  flow: ResetPasswordFlow
}

const getResetPasswordCopy = ({
  email,
  flow,
}: {
  email: string | null
  flow: ResetPasswordFlow
}) => {
  if (flow === "account-setup") {
    return {
      description: email
        ? `Dokončite registráciu účtu ${email} nastavením hesla.`
        : "Dokončite registráciu účtu nastavením hesla.",
      expiredHelp:
        "Na prihlasovacej stránke si môžete vyžiadať nový odkaz na nastavenie hesla.",
      expiredMessage:
        "Tento odkaz na dokončenie registrácie je neplatný alebo už vypršal.",
      submitError: "Nepodarilo sa nastaviť heslo.",
      submitLabel: "Nastaviť heslo",
      successMessage:
        "Heslo bolo úspešne nastavené. Môžete sa prihlásiť.",
      title: "Nastavenie hesla",
    }
  }

  return {
    description: email
      ? `Nastavte nové heslo pre účet ${email}.`
      : "Zadajte nové heslo pre váš účet.",
    expiredHelp: "Skúste si vyžiadať nový odkaz na obnovu hesla.",
    expiredMessage: "Tento odkaz je neplatný alebo už vypršal.",
    submitError: "Nepodarilo sa obnoviť heslo.",
    submitLabel: "Obnoviť heslo",
    successMessage:
      "Heslo bolo úspešne zmenené. Môžete sa prihlásiť pomocou nového hesla.",
    title: "Obnova hesla",
  }
}

export const ResetPasswordPanel = ({
  token,
  email,
  flow,
}: ResetPasswordPanelProps) => {
  const [isBusy, setIsBusy] = useState(false)
  const hasToken = Boolean(token)
  const copy = getResetPasswordCopy({ email, flow })

  const handleSubmit = async (values: {
    password: string
    confirm_password: string
  }) => {
    if (!token) {
      return copy.expiredMessage
    }

    setIsBusy(true)
    try {
      await requestPasswordUpdateProxy({
        password: values.password,
        token,
      })
      return null
    } catch (error) {
      return error instanceof Error ? error.message : copy.submitError
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-max-w space-y-400 p-400">
      <header className="space-y-200">
        <h1 className="font-semibold text-lg">{copy.title}</h1>
        <p className="text-fg-secondary text-sm">{copy.description}</p>
      </header>

      <ResetPasswordForm
        defaultValues={{ password: "", confirm_password: "" }}
        hasToken={hasToken}
        isBusy={isBusy}
        loginHref={LOGIN_HREF}
        onSubmit={handleSubmit}
        text={{
          expiredHelp: copy.expiredHelp,
          expiredMessage: copy.expiredMessage,
          submitLabel: copy.submitLabel,
          successMessage: copy.successMessage,
        }}
      />
    </section>
  )
}

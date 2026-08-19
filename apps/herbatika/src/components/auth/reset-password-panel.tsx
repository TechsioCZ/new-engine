"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { requestPasswordUpdateProxy } from "@/lib/storefront/auth/proxy"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath } from "@/lib/url/public-url"

type ResetPasswordFlow = "account-setup" | "reset-password"

type ResetPasswordPanelProps = {
  token: string | null
  email: string | null
  flow: ResetPasswordFlow
}

export const ResetPasswordPanel = ({
  token,
  email,
  flow,
}: ResetPasswordPanelProps) => {
  const tAuth = useTranslations("auth")
  const { code: market } = useMarketContext()
  const loginHref = buildPath({ kind: "account", section: "login" }, market)
  const forgotPasswordHref = buildPath(
    { kind: "account", section: "forgotPassword" },
    market
  )
  const [isBusy, setIsBusy] = useState(false)
  const hasToken = Boolean(token)
  const copy =
    flow === "account-setup"
      ? {
          description: email
            ? tAuth("account_setup.description_with_email", { email })
            : tAuth("account_setup.description"),
          expiredHelp: tAuth("account_setup.expired_help"),
          expiredLinkLabel: tAuth("account_setup.expired_link"),
          expiredMessage: tAuth("account_setup.expired_message"),
          submitError: tAuth("account_setup.failed"),
          submitLabel: tAuth("account_setup.submit"),
          successMessage: tAuth("account_setup.success"),
          title: tAuth("account_setup.title"),
        }
      : {
          description: email
            ? tAuth("reset.description_with_email", { email })
            : tAuth("reset.description"),
          expiredHelp: tAuth("reset.expired_help"),
          expiredLinkLabel: tAuth("reset.expired_link"),
          expiredMessage: tAuth("reset.expired_message"),
          submitError: tAuth("reset.failed"),
          submitLabel: tAuth("reset.submit"),
          successMessage: tAuth("reset.success"),
          title: tAuth("reset.title"),
        }

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
    } catch {
      return copy.submitError
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
        loginHref={loginHref}
        onSubmit={handleSubmit}
        text={{
          expiredHref: forgotPasswordHref,
          expiredHelp: copy.expiredHelp,
          expiredLinkLabel: copy.expiredLinkLabel,
          expiredMessage: copy.expiredMessage,
          submitLabel: copy.submitLabel,
          successMessage: copy.successMessage,
        }}
      />
    </section>
  )
}

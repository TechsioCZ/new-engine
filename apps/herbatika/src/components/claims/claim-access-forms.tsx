"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { useTranslations } from "next-intl"
import type { FormEventHandler } from "react"
import { TurnstileWidget } from "./turnstile-widget"

const NON_DIGIT_PATTERN = /\D/g

type ClaimLookupFormProps = {
  busy: boolean
  email: string
  onEmailChange: (value: string) => void
  onManualEntry: () => void
  onOrderNumberChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onTurnstileTokenChange: (value: string | null) => void
  orderNumber: string
  turnstileReset: number
}

export function ClaimLookupForm(props: ClaimLookupFormProps) {
  const t = useTranslations("claims")

  return (
    <form className="flex flex-col gap-300" onSubmit={props.onSubmit}>
      <FormInput
        autoComplete="email"
        id="claim-email"
        label={t("email_label")}
        onChange={(event) => props.onEmailChange(event.target.value)}
        required
        type="email"
        value={props.email}
      />
      <FormInput
        id="claim-order-number"
        label={t("order_number_label")}
        onChange={(event) => props.onOrderNumberChange(event.target.value)}
        required
        value={props.orderNumber}
      />
      <TurnstileWidget
        key={props.turnstileReset}
        onTokenChange={props.onTurnstileTokenChange}
      />
      <Button isLoading={props.busy} type="submit">
        {t("send_code")}
      </Button>
      <Button
        onClick={props.onManualEntry}
        theme="outlined"
        type="button"
        variant="secondary"
      >
        {t("manual_entry")}
      </Button>
    </form>
  )
}

type ClaimVerifyFormProps = {
  busy: boolean
  code: string
  email: string
  onBack: () => void
  onCodeChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
}

export function ClaimVerifyForm(props: ClaimVerifyFormProps) {
  const t = useTranslations("claims")

  return (
    <form className="flex flex-col gap-300" onSubmit={props.onSubmit}>
      <p className="text-fg-secondary">
        {t("code_sent", { email: props.email })}
      </p>
      <FormInput
        autoComplete="one-time-code"
        id="claim-code"
        inputMode="numeric"
        label={t("code_label")}
        maxLength={6}
        onChange={(event) =>
          props.onCodeChange(event.target.value.replace(NON_DIGIT_PATTERN, ""))
        }
        required
        value={props.code}
      />
      <Button isLoading={props.busy} type="submit">
        {t("verify_order")}
      </Button>
      <Button
        onClick={props.onBack}
        theme="outlined"
        type="button"
        variant="secondary"
      >
        {t("back")}
      </Button>
    </form>
  )
}

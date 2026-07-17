"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import { PasswordRequirements } from "@/components/auth/password-requirements"
import {
  createResetPasswordValidators,
  type ResetPasswordFormValues,
} from "@/lib/auth/auth-form-validators"
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"

type ResetPasswordFormText = {
  expiredHref: string
  expiredHelp: string
  expiredLinkLabel: string
  expiredMessage: string
  submitLabel: string
  successMessage: string
}

type ResetPasswordFormProps = {
  isBusy: boolean
  defaultValues: ResetPasswordFormValues
  loginHref: string
  hasToken: boolean
  onSubmit: (values: ResetPasswordFormValues) => Promise<string | null>
  text: ResetPasswordFormText
}

export const ResetPasswordForm = ({
  isBusy,
  defaultValues,
  loginHref,
  hasToken,
  onSubmit,
  text,
}: ResetPasswordFormProps) => {
  const tAuth = useTranslations("auth")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const resetPasswordValidators = useMemo(
    () =>
      createResetPasswordValidators({
        confirmPasswordRequired: tAuth(
          "validation.confirm_password_required"
        ),
        passwordMinLength: tAuth("validation.password_min_length"),
        passwordMismatch: tAuth("validation.password_mismatch"),
        passwordNumber: tAuth("validation.password_number"),
        passwordRequired: tAuth("validation.password_required"),
      }),
    [tAuth]
  )

  const form = useHerbatikaForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      const error = await onSubmit(value)
      if (error) {
        setSubmitError(error)
        return
      }
      setIsSuccess(true)
    },
  })

  if (!hasToken) {
    return (
      <div className="flex flex-col gap-300">
        <StatusText showIcon status="error">
          {text.expiredMessage}
        </StatusText>
        <p className="text-fg-secondary text-sm">{text.expiredHelp}</p>
        <div className="flex flex-wrap gap-200">
          <LinkButton href={text.expiredHref} size="sm" variant="primary">
            {text.expiredLinkLabel}
          </LinkButton>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-300">
        <StatusText showIcon status="success">
          {text.successMessage}
        </StatusText>
        <div className="flex flex-wrap gap-200">
          <LinkButton href={loginHref} size="sm" variant="primary">
            {tAuth("go_to_login")}
          </LinkButton>
        </div>
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-300"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        runDetachedPromise(form.handleSubmit())
      }}
    >
      {submitError && (
        <StatusText showIcon status="error">
          {submitError}
        </StatusText>
      )}

      <form.AppField
        name="password"
        validators={resetPasswordValidators.password}
      >
        {(field) => (
          <div className="space-y-200">
            <field.TextField
              autoComplete="new-password"
              id="auth-reset-password"
              label={tAuth("new_password")}
              onValueChange={() => setSubmitError(null)}
              required
              type="password"
              validationMode="blur"
            />
            <PasswordRequirements password={String(field.state.value ?? "")} />
          </div>
        )}
      </form.AppField>

      <form.AppField
        name="confirm_password"
        validators={resetPasswordValidators.confirm_password}
      >
        {(field) => (
          <field.TextField
            autoComplete="new-password"
            id="auth-reset-confirm-password"
            label={tAuth("password_confirmation")}
            onValueChange={() => setSubmitError(null)}
            required
            type="password"
            validationMode="blur"
          />
        )}
      </form.AppField>

      <div className="flex flex-wrap gap-200">
        <Button isLoading={isBusy} size="sm" type="submit">
          {text.submitLabel}
        </Button>
      </div>
    </form>
  )
}

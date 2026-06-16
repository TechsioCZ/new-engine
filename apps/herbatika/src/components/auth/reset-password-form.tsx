"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useState } from "react"
import { PasswordRequirements } from "@/components/auth/password-requirements"
import {
  type ResetPasswordFormValues,
  resetPasswordValidators,
} from "@/lib/auth/auth-form-validators"
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"

type ResetPasswordFormText = {
  expiredHelp: string
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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

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
          <LinkButton
            href="/auth/forgot-password"
            size="sm"
            variant="primary"
          >
            Vyžiadať nový odkaz
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
          <LinkButton
            href={loginHref}
            size="sm"
            variant="primary"
          >
            Prejsť na prihlásenie
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
              label="Nové heslo"
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
            label="Potvrdenie hesla"
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

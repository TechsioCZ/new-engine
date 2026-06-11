"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import NextLink from "next/link"
import { useState } from "react"
import {
  type ForgotPasswordFormValues,
  forgotPasswordValidators,
} from "@/lib/auth/auth-form-validators"
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"
import { AuthFooter } from "./auth-footer"

type ForgotPasswordFormProps = {
  isBusy: boolean
  defaultValues: ForgotPasswordFormValues
  loginHref: string
  onSubmit: (values: ForgotPasswordFormValues) => Promise<string | null>
}

export const ForgotPasswordForm = ({
  isBusy,
  defaultValues,
  loginHref,
  onSubmit,
}: ForgotPasswordFormProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const form = useHerbatikaForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      const error = await onSubmit(value)
      if (error) {
        setSubmitError(error)
        return
      }
      setSubmittedEmail(value.email)
    },
  })

  if (submittedEmail) {
    return (
      <div className="flex flex-col gap-300">
        <StatusText showIcon={false} status="success">
          {`Odkaz na obnovu hesla sme odoslali na ${submittedEmail}. Skontrolujte si schránku.`}
        </StatusText>
        <p className="text-fg-secondary text-sm">
          E-mail vám nedorazil? Skontrolujte priečinok spam alebo to skúste
          znovu o pár minút.
        </p>
        <div className="flex flex-wrap gap-200">
          <LinkButton
            as={NextLink}
            block
            href={loginHref}
            size="sm"
            variant="primary"
          >
            Späť na prihlásenie
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
        void form.handleSubmit()
      }}
    >
      {submitError && (
        <StatusText showIcon status="error">
          {submitError}
        </StatusText>
      )}

      <form.AppField name="email" validators={forgotPasswordValidators.email}>
        {(field) => (
          <field.TextField
            autoComplete="email"
            id="auth-forgot-password-email"
            label="E-mail"
            onValueChange={() => setSubmitError(null)}
            required
            type="email"
            validationMode="blur"
          />
        )}
      </form.AppField>

      <div className="flex flex-wrap gap-200">
        <Button block isLoading={isBusy} size="sm" type="submit">
          Zaslať odkaz
        </Button>
      </div>
      <AuthFooter href="/auth/login" linkText="Späť na prihlásenie" text="" />
    </form>
  )
}

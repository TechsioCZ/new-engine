"use client"

import { useForm } from "@tanstack/react-form"
import { Button } from "@techsio/ui-kit/atoms/button"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"
import Link from "next/link"
import { useEffect, useRef } from "react"

import { TextField } from "@/components/forms/fields/text-field"
import { useRegister } from "@/hooks/use-register"
import { useAuthToast } from "@/hooks/use-toast"
import { AUTH_MESSAGES } from "@/lib/auth-messages"
import { registerValidators } from "@/lib/form-validators"
import { VALIDATION_MESSAGES } from "@/lib/validation-messages"
import { useAnalytics } from "@/providers/analytics-provider"

import { ErrorBanner } from "../atoms/error-banner"
import { PasswordValidator } from "./password-validator"

interface RegisterFormProps {
  onSuccess?: () => void
  toggle?: () => void
  showLoginLink?: boolean
  className?: string
}

interface RegisterFormData {
  first_name: string
  last_name: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

const defaultValues: RegisterFormData = {
  acceptTerms: false,
  confirmPassword: "",
  email: "",
  first_name: "",
  last_name: "",
  password: "",
}

export const RegisterForm = ({
  onSuccess,
  toggle,
  showLoginLink = true,
  className,
}: RegisterFormProps) => {
  const toast = useAuthToast()
  const analytics = useAnalytics()
  const formRef = useRef<typeof form | null>(null)

  const register = useRegister({
    onError: (error) => {
      console.error("Registration failed:", error.message)
    },
    onSuccess: () => {
      // Track customer identification in Leadhub
      const currentForm = formRef.current
      if (currentForm === null) {
        return
      }
      const { values } = currentForm.state
      analytics.trackIdentify({
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        subscribe: [],
      })

      toast.registerSuccess()
      currentForm.reset()
      onSuccess?.()
    },
  })

  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => {
      register.mutate({
        email: value.email,
        first_name: value.first_name,
        last_name: value.last_name,
        password: value.password,
      })
    },
  })

  useEffect(() => {
    formRef.current = form
    return () => {
      formRef.current = null
    }
  }, [form])

  return (
    <form
      className={`mt-100 flex flex-col gap-200 ${className}`}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      {register.error && (
        <ErrorBanner
          message={register.error.message}
          title={AUTH_MESSAGES.REGISTER_FAILED}
        />
      )}

      <div className="grid grid-cols-2 gap-100">
        <form.Field
          name="first_name"
          validators={registerValidators.first_name}
        >
          {(field) => (
            <TextField
              autoComplete="given-name"
              disabled={register.isPending}
              field={field}
              label="Jméno"
              placeholder="Jan"
              required
            />
          )}
        </form.Field>

        <form.Field name="last_name" validators={registerValidators.last_name}>
          {(field) => (
            <TextField
              autoComplete="family-name"
              disabled={register.isPending}
              field={field}
              label="Příjmení"
              placeholder="Novák"
              required
            />
          )}
        </form.Field>
      </div>

      <form.Field name="email" validators={registerValidators.email}>
        {(field) => (
          <TextField
            autoComplete="email"
            disabled={register.isPending}
            field={field}
            label="E-mailová adresa"
            placeholder="vas@email.cz"
            required
            type="email"
          />
        )}
      </form.Field>

      <form.Field name="password" validators={registerValidators.password}>
        {(field) => (
          <div className="flex flex-col gap-50">
            <TextField
              autoComplete="new-password"
              disabled={register.isPending}
              field={field}
              label="Heslo"
              placeholder="••••••••"
              required
              type="password"
            />
            <PasswordValidator password={field.state.value} showRequirements />
          </div>
        )}
      </form.Field>

      <form.Field
        name="confirmPassword"
        validators={registerValidators.confirmPassword}
      >
        {(field) => (
          <div className="flex flex-col gap-50">
            <TextField
              autoComplete="new-password"
              disabled={register.isPending}
              field={field}
              label="Potvrzení hesla"
              placeholder="••••••••"
              required
              type="password"
            />
            <form.Subscribe
              selector={(state) => ({
                confirmPassword: state.values.confirmPassword,
                password: state.values.password,
              })}
            >
              {({ confirmPassword, password }) => (
                <>
                  {confirmPassword.length > 0 &&
                    password === confirmPassword && (
                      <span className="font-medium text-success text-xs">
                        {VALIDATION_MESSAGES.password.match}
                      </span>
                    )}
                  {confirmPassword.length > 0 &&
                    password !== confirmPassword && (
                      <span className="font-medium text-danger text-xs">
                        {VALIDATION_MESSAGES.password.mismatch}
                      </span>
                    )}
                </>
              )}
            </form.Subscribe>
          </div>
        )}
      </form.Field>

      <form.Field
        name="acceptTerms"
        validators={registerValidators.acceptTerms}
      >
        {(field) => (
          <FormCheckbox
            checked={field.state.value}
            id="accept-terms"
            label="Souhlasím s podmínkami"
            name="accept-terms"
            onCheckedChange={(checked) => {
              field.handleChange(checked)
            }}
            size="sm"
          />
        )}
      </form.Field>

      <Button
        block
        disabled={register.isPending || !form.state.canSubmit}
        size="sm"
        type="submit"
      >
        {register.isPending ? "Registruji..." : "Zaregistrovat se"}
      </Button>

      {showLoginLink && (
        <div className="text-center text-fg-primary text-sm">
          <span className="text-fg-secondary">Již máte účet? </span>
          <Link
            className="font-medium hover:underline"
            href="/prihlaseni"
            {...(toggle ? { onClick: toggle } : {})}
          >
            Přihlaste se
          </Link>
        </div>
      )}
    </form>
  )
}

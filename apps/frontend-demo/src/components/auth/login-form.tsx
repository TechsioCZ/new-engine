"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import Link from "next/link"
import { type FormEvent, useState } from "react"
import { ErrorText } from "@/components/atoms/error-text"
import { useAuth } from "@/hooks/use-auth"
import {
  AUTH_ERRORS,
  authFormFields,
  validateEmail,
  withLoading,
} from "@/lib/auth"
import { AuthFormWrapper } from "./auth-form-wrapper"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  const {
    login,
    loginMutation,
    error,
    getFieldError,
    setFieldError,
    clearErrors,
  } = useAuth()

  const isFormLoading = loginMutation.isPending

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearErrors()

    // Client-side validation
    if (!validateEmail(email)) {
      setFieldError("email", AUTH_ERRORS.INVALID_EMAIL)
      return
    }
    if (password.length < 1) {
      setFieldError("password", AUTH_ERRORS.PASSWORD_REQUIRED)
      return
    }

    // The mutation handles loading state and success/error toasts
    login(email, password)
  }

  return (
    <AuthFormWrapper
      footerLinkHref="/auth/register"
      footerLinkText="Zaregistrovat se"
      footerText="Nemáte účet?"
      subtitle="Přihlaste se ke svému účtu a pokračujte"
      title="Vítejte zpět"
    >
      <form className="space-y-auth-form-gap" onSubmit={handleSubmit}>
        <FormInput
          {...withLoading(
            authFormFields.email({
              value: email,
              onChange: (e) => {
                setEmail(e.target.value)
                clearErrors()
              },
            }),
            isFormLoading
          )}
          helpText={
            getFieldError("email") && (
              <ErrorText showIcon>{getFieldError("email")}</ErrorText>
            )
          }
          validateStatus={getFieldError("email") ? "error" : "default"}
        />

        <FormInput
          {...withLoading(
            authFormFields.password({
              value: password,
              onChange: (e) => {
                setPassword(e.target.value)
                clearErrors()
              },
            }),
            isFormLoading
          )}
          helpText={
            getFieldError("password") && (
              <ErrorText>{getFieldError("password")}</ErrorText>
            )
          }
          validateStatus={getFieldError("password") ? "error" : "default"}
        />

        <div className="flex items-center justify-between">
          <FormCheckbox
            checked={rememberMe}
            disabled={isFormLoading}
            id="rememberMe"
            label="Zapamatovat si mě"
            onCheckedChange={setRememberMe}
          />

          <Link
            className="text-auth-link hover:text-auth-link-hover"
            href="/auth/forgot-password"
          >
            Zapoměli jste heslo?
          </Link>
        </div>

        {error && !getFieldError("email") && !getFieldError("password") && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <Button
          className="w-full"
          disabled={isFormLoading}
          size="lg"
          type="submit"
        >
          {isFormLoading ? "Přihlašování..." : "Přihlásit se"}
        </Button>
      </form>
    </AuthFormWrapper>
  )
}

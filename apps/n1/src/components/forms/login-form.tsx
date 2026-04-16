"use client"

import { useForm } from "@tanstack/react-form"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"
import Link from "next/link"
import { useRef, useState } from "react"
import { TextField } from "@/components/forms/fields/text-field"
import { useLogin } from "@/hooks/use-login"
import { useAuthToast } from "@/hooks/use-toast"
import { AUTH_MESSAGES } from "@/lib/auth-messages"
import { loginValidators } from "@/lib/form-validators"
import { useAnalytics } from "@/providers/analytics-provider"

type LoginFormProps = {
  onSuccess?: () => void
  toggle?: () => void
  showRegisterLink?: boolean
  showForgotPasswordLink?: boolean
  className?: string
}

type LoginFormData = {
  email: string
  password: string
}

export function LoginForm({
  onSuccess,
  toggle,
  showRegisterLink,
  showForgotPasswordLink,
}: LoginFormProps) {
  const toast = useAuthToast()
  const analytics = useAnalytics()
  const formRef = useRef<typeof form | null>(null)
  const [backendError, setBackendError] = useState<string>()
  const rememberId = "login-remember"

  const defaultValues: LoginFormData = {
    email: "",
    password: "",
  }

  const login = useLogin({
    onSuccess: () => {
      if (!formRef.current) {
        return
      }

      const email = formRef.current.state.values.email
      if (email) {
        analytics.trackIdentify({
          email,
          subscribe: [],
        })
      }

      toast.loginSuccess()
      formRef.current.reset()
      setBackendError(undefined)
      onSuccess?.()
    },
    onError: (error) => {
      console.error("Login failed:", error.message)
      setBackendError(AUTH_MESSAGES.INVALID_CREDENTIALS)
    },
  })

  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => {
      login.mutate({
        email: value.email,
        password: value.password,
      })
    },
  })

  formRef.current = form

  return (
    <form
      className="mt-100 flex flex-col gap-100"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="email" validators={loginValidators.email}>
        {(field) => (
          <TextField
            autoComplete="email"
            disabled={login.isPending}
            field={field}
            label="E-mailová adresa"
            placeholder="vas@email.cz"
            required
            type="email"
          />
        )}
      </form.Field>

      <form.Field name="password" validators={loginValidators.password}>
        {(field) => (
          <TextField
            autoComplete="current-password"
            disabled={login.isPending}
            externalError={backendError}
            field={field}
            label="Heslo"
            onExternalErrorClear={() => setBackendError(undefined)}
            placeholder="••••••••"
            required
            type="password"
          />
        )}
      </form.Field>

      {showForgotPasswordLink && (
        <label className="enter flex items-center gap-150" htmlFor={rememberId}>
          <Checkbox
            disabled={login.isPending}
            id={rememberId}
            name="remember"
          />
          <span className="text-sm">Zapamatovat</span>
        </label>
      )}

      <Button
        block
        disabled={login.isPending}
        size="sm"
        theme="solid"
        type="submit"
        variant="primary"
      >
        {login.isPending ? "Přihlašování..." : "Přihlásit se"}
      </Button>

      {(showRegisterLink || showForgotPasswordLink) && (
        <div className="flex items-center justify-between text-center text-fg-primary text-sm">
          {showForgotPasswordLink && (
            <Link
              className="font-medium hover:underline"
              href="/zapomenute-heslo"
              onClick={toggle}
            >
              Zapomenuté heslo
            </Link>
          )}
          {showRegisterLink && (
            <Link
              className="font-medium hover:underline"
              href="/registrace"
              onClick={toggle}
            >
              Zaregistrovat se
            </Link>
          )}
        </div>
      )}
    </form>
  )
}

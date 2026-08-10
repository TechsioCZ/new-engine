"use client"

import { useForm } from "@tanstack/react-form"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { TextField } from "@/components/forms/fields/text-field"
import { useLogin } from "@/hooks/use-login"
import { useAuthToast } from "@/hooks/use-toast"
import { AUTH_MESSAGES } from "@/lib/auth-messages"
import { loginValidators } from "@/lib/form-validators"
import { useAnalytics } from "@/providers/analytics-provider"

interface LoginFormProps {
  onSuccess?: () => void
  toggle?: () => void
  showRegisterLink?: boolean
  showForgotPasswordLink?: boolean
  className?: string
}

interface LoginFormData {
  email: string
  password: string
}

const defaultValues: LoginFormData = {
  email: "",
  password: "",
}

export const LoginForm = ({
  onSuccess,
  toggle,
  showRegisterLink,
  showForgotPasswordLink,
}: LoginFormProps) => {
  const toast = useAuthToast()
  const analytics = useAnalytics()
  const formRef = useRef<typeof form | null>(null)
  const [backendError, setBackendError] = useState<string>()
  const rememberId = "login-remember"

  const login = useLogin({
    onError: (error) => {
      console.error("Login failed:", error.message)
      setBackendError(AUTH_MESSAGES.INVALID_CREDENTIALS)
    },
    onSuccess: () => {
      if (!formRef.current) {
        return
      }

      const { email } = formRef.current.state.values
      if (email.length > 0) {
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

  useEffect(() => {
    formRef.current = form
    return () => {
      formRef.current = null
    }
  }, [form])

  return (
    <form
      className="mt-100 flex flex-col gap-100"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
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
            onExternalErrorClear={() => {
              setBackendError(undefined)
            }}
            placeholder="••••••••"
            required
            type="password"
          />
        )}
      </form.Field>

      {showForgotPasswordLink === true && (
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

      {(showRegisterLink === true || showForgotPasswordLink === true) && (
        <div className="flex items-center justify-between text-center text-fg-primary text-sm">
          {showForgotPasswordLink === true && (
            <Link
              className="font-medium hover:underline"
              href="/zapomenute-heslo"
              {...(toggle ? { onClick: toggle } : {})}
            >
              Zapomenuté heslo
            </Link>
          )}
          {showRegisterLink === true && (
            <Link
              className="font-medium hover:underline"
              href="/registrace"
              {...(toggle ? { onClick: toggle } : {})}
            >
              Zaregistrovat se
            </Link>
          )}
        </div>
      )}
    </form>
  )
}

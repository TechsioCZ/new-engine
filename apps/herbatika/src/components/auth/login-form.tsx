"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Label } from "@techsio/ui-kit/atoms/label"
import NextLink from "next/link"
import { useAppToast } from "@/hooks/use-app-toast"
import {
  type LoginFormValues,
  loginValidators,
} from "@/lib/auth/auth-form-validators"
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { AuthFooter } from "./auth-footer"

type LoginFormProps = {
  isBusy: boolean
  defaultValues: LoginFormValues
  registerHref: string
  forgotPasswordHref: string
  onSubmit: (values: LoginFormValues) => Promise<string | null>
}

export const LoginForm = ({
  isBusy,
  defaultValues,
  registerHref,
  forgotPasswordHref,
  onSubmit,
}: LoginFormProps) => {
  const toast = useAppToast()

  const form = useHerbatikaForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const error = await onSubmit(value)
      if (error) {
        toast.error({ title: error })
      }
    },
  })

  return (
    <div>
      <form
        className="flex flex-col gap-300"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          runDetachedPromise(form.handleSubmit())
        }}
      >
        <form.AppField name="email" validators={loginValidators.email}>
          {(field) => (
            <field.TextField
              autoComplete="email"
              id="login-email"
              label="E-mail"
              type="email"
              validationMode="blur"
            />
          )}
        </form.AppField>

        <div className="flex flex-col gap-form-field-gap">
          <div className="flex items-center justify-between gap-200">
            <Label htmlFor="login-password">Heslo</Label>
            <NextLink
              className="font-normal text-fg-secondary text-sm underline-offset-4 transition-colors hover:text-primary hover:underline"
              href={forgotPasswordHref}
              onMouseDown={(e) => e.preventDefault()}
            >
              Zabudnuté heslo?
            </NextLink>
          </div>
          <form.AppField name="password" validators={loginValidators.password}>
            {(field) => (
              <field.TextField
                autoComplete="current-password"
                id="login-password"
                label={<span className="sr-only">Heslo</span>}
                type="password"
                validationMode="blur"
              />
            )}
          </form.AppField>
        </div>

        <Button block isLoading={isBusy} size="md" type="submit">
          Prihlásiť sa
        </Button>
      </form>
      <AuthFooter
        href={registerHref}
        linkText="Zaregistrujte sa"
        text="Nemáte ešte účet?"
      />
    </div>
  )
}

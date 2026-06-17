"use client"

import { AuthShell } from "@/components/auth/auth-shell"
import { RegisterForm } from "@/components/auth/register-form"
import { useAuthController } from "@/components/auth/use-auth-controller"
import { LoginForm } from "./auth/login-form"

type AuthControlsMode = "login" | "register"

type AuthControlsProps = {
  mode: AuthControlsMode
  afterAuthHref?: string
}

export function AuthControls({ mode, afterAuthHref }: AuthControlsProps) {
  const controller = useAuthController({
    mode,
    afterAuthHref,
  })

  return (
    <AuthShell
      description={controller.description}
      error={controller.authError}
      message={controller.authMessage}
      notice={controller.authNotice}
      title={controller.title}
    >
      {mode === "login" && (
        <LoginForm
          defaultValues={controller.loginDefaultValues}
          forgotPasswordHref={controller.forgotPasswordHref}
          isBusy={controller.isBusy}
          onSubmit={controller.handleLoginSubmit}
          registerHref={controller.registerHref}
        />
      )}

      {mode === "register" && (
        <RegisterForm
          countryItems={controller.registerCountryItems}
          defaultValues={controller.registerDefaultValues}
          isBusy={controller.isBusy}
          loginHref={controller.loginHref}
          onSubmit={controller.handleRegisterSubmit}
        />
      )}
    </AuthShell>
  )
}

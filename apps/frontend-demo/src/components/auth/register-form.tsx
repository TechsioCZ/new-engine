"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { type FormEvent, useState } from "react"
import { ErrorText } from "@/components/atoms/error-text"
import { useAuth } from "@/hooks/use-auth"
import {
  AUTH_ERRORS,
  authFormFields,
  type ValidationError,
  validateEmail,
  validatePassword,
  withLoading,
} from "@/lib/auth"
import { AuthFormWrapper } from "./auth-form-wrapper"
import { PasswordRequirements } from "./password-requirements"

export function RegisterForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)

  const {
    register,
    registerMutation,
    setValidationErrors,
    getFieldError,
    clearErrors,
  } = useAuth()

  const isFormLoading = registerMutation.isPending

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    clearErrors()

    // Client-side validation
    const errors: ValidationError[] = []

    // Email validation
    if (!validateEmail(email)) {
      errors.push({
        field: "email",
        message: AUTH_ERRORS.INVALID_EMAIL,
      })
    }

    // Password validation
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      errors.push({
        field: "password",
        message: passwordValidation.errors[0], // Show first error
      })
    }

    // Password match validation
    if (password !== confirmPassword) {
      errors.push({
        field: "confirmPassword",
        message: AUTH_ERRORS.PASSWORD_MISMATCH,
      })
    }

    // Terms validation
    if (!acceptTerms) {
      errors.push({
        field: "terms",
        message: AUTH_ERRORS.TERMS_REQUIRED,
      })
    }

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    // The mutation handles loading state and success/error toasts
    register(email, password, firstName, lastName)
  }

  return (
    <AuthFormWrapper
      footerLinkHref="/auth/login"
      footerLinkText="Přihlásit se"
      footerText="Již máte účet?"
      subtitle="Zaregistrujte se a začněte"
      title="Vytvořit účet"
    >
      <form className="space-y-auth-form-gap" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            {...withLoading(
              authFormFields.firstName({
                value: firstName,
                onChange: (e) => setFirstName(e.target.value),
              }),
              isFormLoading
            )}
          />

          <FormInput
            {...withLoading(
              authFormFields.lastName({
                value: lastName,
                onChange: (e) => setLastName(e.target.value),
              }),
              isFormLoading
            )}
          />
        </div>

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

        <div>
          <FormInput
            {...withLoading(
              authFormFields.newPassword({
                value: password,
                onChange: (e) => {
                  setPassword(e.target.value)
                  clearErrors()
                },
                placeholder: "Zadejte heslo",
              }),
              isFormLoading
            )}
            helpText={
              getFieldError("password") && (
                <ErrorText showIcon>{getFieldError("password")}</ErrorText>
              )
            }
            validateStatus={getFieldError("password") ? "error" : "default"}
          />
          <PasswordRequirements password={password} />
        </div>

        <FormInput
          {...withLoading(
            authFormFields.confirmPassword({
              value: confirmPassword,
              onChange: (e) => {
                setConfirmPassword(e.target.value)
                clearErrors()
              },
              placeholder: "Znovu zadejte heslo",
            }),
            isFormLoading
          )}
          helpText={
            getFieldError("confirmPassword") ? (
              <ErrorText showIcon>{getFieldError("confirmPassword")}</ErrorText>
            ) : undefined
          }
          validateStatus={
            getFieldError("confirmPassword") ? "error" : "default"
          }
        />

        <FormCheckbox
          checked={acceptTerms}
          disabled={isFormLoading}
          helpText={getFieldError("terms")}
          id="acceptTerms"
          label="Souhlasím s obchodními podmínkami"
          onCheckedChange={setAcceptTerms}
          validateStatus={getFieldError("terms") ? "error" : "default"}
        />

        <Button
          className="w-full"
          disabled={isFormLoading || !acceptTerms}
          size="lg"
          type="submit"
        >
          {isFormLoading ? "Vytváření účtu..." : "Vytvořit účet"}
        </Button>
      </form>
    </AuthFormWrapper>
  )
}

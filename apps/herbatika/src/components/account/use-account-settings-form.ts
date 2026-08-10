"use client"

import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
} from "@tanstack/react-form"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"
import {
  createAccountSettingsValidators,
  toAccountSettingsValues,
} from "@/lib/storefront/account-settings-validators"
import type { AccountSettingsValues } from "@/lib/storefront/account-settings-validators"
import { useAuth } from "@/lib/storefront/auth"
import { useUpdateCustomer } from "@/lib/storefront/customers"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"

type AccountSettingsForm = ReturnType<
  typeof useHerbatikaForm<
    AccountSettingsValues,
    FormValidateOrFn<AccountSettingsValues> | undefined,
    FormValidateOrFn<AccountSettingsValues> | undefined,
    FormAsyncValidateOrFn<AccountSettingsValues> | undefined,
    FormValidateOrFn<AccountSettingsValues> | undefined,
    FormAsyncValidateOrFn<AccountSettingsValues> | undefined,
    FormValidateOrFn<AccountSettingsValues> | undefined,
    FormAsyncValidateOrFn<AccountSettingsValues> | undefined,
    FormValidateOrFn<AccountSettingsValues> | undefined,
    FormAsyncValidateOrFn<AccountSettingsValues> | undefined,
    FormAsyncValidateOrFn<AccountSettingsValues> | undefined,
    unknown
  >
>

interface AccountSettingsFormController {
  accountSettingsValidators: ReturnType<typeof createAccountSettingsValidators>
  authQuery: ReturnType<typeof useAuth>
  clearSubmitStatus: () => void
  form: AccountSettingsForm
  submitError: string | null
  submitSuccess: string | null
  updateCustomerMutation: ReturnType<typeof useUpdateCustomer>
}

export const useAccountSettingsForm = (): AccountSettingsFormController => {
  const tAuth = useTranslations("auth")
  const tForm = useTranslations("form")
  const authQuery = useAuth()
  const updateCustomerMutation = useUpdateCustomer()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const hydratedCustomerIdRef = useRef<string | null>(null)
  const accountSettingsValidators = createAccountSettingsValidators({
    firstNameMinLength: tForm("validation.first_name_min_length"),
    lastNameMinLength: tForm("validation.last_name_min_length"),
    phoneInvalid: tForm("validation.phone_invalid"),
    phoneMinDigits: tForm("validation.phone_min_digits"),
  })

  const form = useHerbatikaForm({
    defaultValues: toAccountSettingsValues(authQuery.customer),
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      setSubmitSuccess(null)

      try {
        const phone = value.phone.trim()
        const companyName = value.company_name.trim()
        const payload = {
          first_name: value.first_name.trim(),
          last_name: value.last_name.trim(),
          ...(phone ? { phone } : {}),
          ...(companyName ? { company_name: companyName } : {}),
        }

        await updateCustomerMutation.mutateAsync(payload)

        form.setFieldValue("first_name", payload.first_name)
        form.setFieldValue("last_name", payload.last_name)
        form.setFieldValue("phone", payload.phone ?? "")
        form.setFieldValue("company_name", payload.company_name ?? "")
        setSubmitSuccess(tAuth("account.settings.saved"))
      } catch (error) {
        setSubmitError(
          resolveErrorMessage(error, tAuth("account.settings.update_failed")),
        )
      }
    },
  })

  useEffect(() => {
    const { customer } = authQuery

    if (!customer) {
      hydratedCustomerIdRef.current = null
      return
    }

    if (hydratedCustomerIdRef.current === customer.id) {
      return
    }

    const defaults = toAccountSettingsValues(customer)
    form.setFieldValue("first_name", defaults.first_name)
    form.setFieldValue("last_name", defaults.last_name)
    form.setFieldValue("phone", defaults.phone)
    form.setFieldValue("company_name", defaults.company_name)
    hydratedCustomerIdRef.current = customer.id
    setSubmitError(null)
    setSubmitSuccess(null)
  }, [authQuery.customer, form])

  return {
    accountSettingsValidators,
    authQuery,
    clearSubmitStatus: () => {
      setSubmitError(null)
      setSubmitSuccess(null)
    },
    form,
    submitError,
    submitSuccess,
    updateCustomerMutation,
  }
}

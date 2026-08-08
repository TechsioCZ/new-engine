"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { useTranslations } from "next-intl"

import {
  AccountSkeletonSurface,
  AccountSurface,
} from "@/components/account/account-surface"
import { useAccountSettingsForm } from "@/components/account/use-account-settings-form"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"

export const AccountSettings = () => {
  const tAuth = useTranslations("auth")
  const tForm = useTranslations("form")
  const {
    accountSettingsValidators,
    authQuery,
    clearSubmitStatus,
    form,
    submitError,
    submitSuccess,
    updateCustomerMutation,
  } = useAccountSettingsForm()

  if (authQuery.isLoading) {
    return <AccountSkeletonSurface lines={6} />
  }

  if (!authQuery.customer) {
    return (
      <AccountSurface className="space-y-300">
        <h2 className="font-semibold text-lg">
          {tAuth("account.settings.title")}
        </h2>
        <p className="text-fg-secondary text-sm">
          {tAuth("account.settings.unavailable")}
        </p>
      </AccountSurface>
    )
  }

  return (
    <AccountSurface className="space-y-500">
      <header className="space-y-200">
        <h2 className="font-semibold text-xl">
          {tAuth("account.settings.title")}
        </h2>
        <p className="text-fg-secondary text-sm">
          {tAuth("account.settings.description")}
        </p>
      </header>

      <form
        className="grid gap-300 md:grid-cols-2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          runDetachedPromise(form.handleSubmit())
        }}
      >
        {submitError !== null && (
          <div className="md:col-span-2">
            <StatusText showIcon status="error">
              {submitError}
            </StatusText>
          </div>
        )}

        {submitSuccess !== null && (
          <div className="md:col-span-2">
            <StatusText showIcon status="success">
              {submitSuccess}
            </StatusText>
          </div>
        )}

        <form.AppField
          name="first_name"
          validators={accountSettingsValidators.first_name}
        >
          {(field) => (
            <field.TextField
              id="account-settings-first-name"
              label={tForm("first_name")}
              onValueChange={clearSubmitStatus}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>

        <form.AppField
          name="last_name"
          validators={accountSettingsValidators.last_name}
        >
          {(field) => (
            <field.TextField
              id="account-settings-last-name"
              label={tForm("last_name")}
              onValueChange={clearSubmitStatus}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>

        <div className="md:col-span-2">
          <FormInput
            disabled
            id="account-settings-email"
            label={tAuth("account.settings.email_read_only", {
              label: tForm("email"),
            })}
            value={authQuery.customer.email ?? ""}
          />
        </div>

        <form.AppField
          name="phone"
          validators={accountSettingsValidators.phone}
        >
          {(field) => (
            <field.TextField
              id="account-settings-phone"
              label={tForm("phone")}
              onValueChange={clearSubmitStatus}
              type="tel"
              validationMode="blur"
            />
          )}
        </form.AppField>

        <form.AppField name="company_name">
          {(field) => (
            <field.TextField
              id="account-settings-company"
              label={tAuth("account.settings.company_optional", {
                label: tForm("company_name"),
              })}
              onValueChange={clearSubmitStatus}
              validationMode="none"
            />
          )}
        </form.AppField>

        <div className="flex justify-end md:col-span-2">
          <Button isLoading={updateCustomerMutation.isPending} type="submit">
            {tAuth("account.settings.save")}
          </Button>
        </div>
      </form>
    </AccountSurface>
  )
}

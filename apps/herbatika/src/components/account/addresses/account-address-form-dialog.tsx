"use client"

import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useTranslations } from "next-intl"
import { useMemo, useState } from "react"
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"
import {
  normalizeHerbatikaPhoneCountryCode,
  normalizePhoneNumberToE164,
} from "@/lib/forms/phone-number"
import { createAddressFieldValidators } from "@/lib/forms/validators/address"
import { translateAddressValidationMessages } from "@/lib/forms/validators/address-validation-messages"
import { createChangeBlurSubmitFieldValidators } from "@/lib/forms/validators/field-validator-factories"
import {
  useCreateCustomerAddress,
  useUpdateCustomerAddress,
} from "@/lib/storefront/customers"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import type { HerbatikaCountryCode } from "@/lib/storefront/market-context"
import { AccountAddressCountryField } from "./account-address-country-field"
import { AccountAddressDialogActions } from "./account-address-dialog-actions"
import {
  type CustomerAddress,
  toAccountAddressFormValues,
  toCustomerAddressCreateInput,
  toCustomerAddressUpdateInput,
} from "./account-address-model"

type AccountAddressFormDialogProps = {
  address: CustomerAddress | null
  countryCode: HerbatikaCountryCode
  onClose: () => void
  onSaved: (message: string) => void
}

const FORM_ID = "account-address-form"

export function AccountAddressFormDialog({
  address,
  countryCode,
  onClose,
  onSaved,
}: AccountAddressFormDialogProps) {
  const tAuth = useTranslations("auth")
  const tForm = useTranslations("form")
  const createAddressMutation = useCreateCustomerAddress()
  const updateAddressMutation = useUpdateCustomerAddress()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const defaultValues = toAccountAddressFormValues(address, countryCode)
  const formCountryCode = defaultValues.country_code
  const isPending =
    createAddressMutation.isPending || updateAddressMutation.isPending
  const validators = useMemo(() => {
    const addressValidators = createAddressFieldValidators(
      translateAddressValidationMessages(tForm),
      formCountryCode
    )

    return {
      address1: createChangeBlurSubmitFieldValidators(
        addressValidators.address1
      ),
      city: createChangeBlurSubmitFieldValidators(addressValidators.city),
      firstName: createChangeBlurSubmitFieldValidators(
        addressValidators.firstName
      ),
      lastName: createChangeBlurSubmitFieldValidators(
        addressValidators.lastName
      ),
      phone: createChangeBlurSubmitFieldValidators(addressValidators.phone),
      postalCode: createChangeBlurSubmitFieldValidators(
        addressValidators.postalCode
      ),
    }
  }, [formCountryCode, tForm])
  const form = useHerbatikaForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      const phone = normalizePhoneNumberToE164(value.phone, formCountryCode)

      try {
        if (address) {
          await updateAddressMutation.mutateAsync(
            toCustomerAddressUpdateInput(address.id, value, phone)
          )
          onSaved(tAuth("account.addresses.updated"))
        } else {
          await createAddressMutation.mutateAsync(
            toCustomerAddressCreateInput(value, phone)
          )
          onSaved(tAuth("account.addresses.created"))
        }
        onClose()
      } catch {
        setSubmitError(
          tAuth(
            address
              ? "account.addresses.update_failed"
              : "account.addresses.create_failed"
          )
        )
      }
    },
  })
  const clearSubmitError = () => setSubmitError(null)

  const closeDialog = () => {
    if (!isPending) {
      setSubmitError(null)
      onClose()
    }
  }

  return (
    <Dialog
      actions={
        <AccountAddressDialogActions
          formId={FORM_ID}
          isPending={isPending}
          onCancel={closeDialog}
        />
      }
      className="shadow-md"
      closeOnEscape={!isPending}
      closeOnInteractOutside={!isPending}
      customTrigger
      hideCloseButton
      onOpenChange={({ open }) => {
        if (!open) {
          closeDialog()
        }
      }}
      open
      size="md"
      title={tAuth(
        address ? "account.addresses.edit_title" : "account.addresses.new_title"
      )}
    >
      <form
        className="grid gap-300 md:grid-cols-2"
        id={FORM_ID}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          runDetachedPromise(form.handleSubmit())
        }}
      >
        {submitError ? (
          <div className="md:col-span-2">
            <StatusText align="start" showIcon status="error">
              {submitError}
            </StatusText>
          </div>
        ) : null}

        <form.AppField name="first_name" validators={validators.firstName}>
          {(field) => (
            <field.TextField
              id="account-address-first-name"
              label={tForm("first_name")}
              onValueChange={clearSubmitError}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>
        <form.AppField name="last_name" validators={validators.lastName}>
          {(field) => (
            <field.TextField
              id="account-address-last-name"
              label={tForm("last_name")}
              onValueChange={clearSubmitError}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>

        <div className="md:col-span-2">
          <form.AppField name="company">
            {(field) => (
              <field.TextField
                id="account-address-company"
                label={tAuth("account.addresses.optional_label", {
                  label: tForm("company_name"),
                })}
                onValueChange={clearSubmitError}
                validationMode="none"
              />
            )}
          </form.AppField>
        </div>

        <div className="md:col-span-2">
          <form.AppField name="address_1" validators={validators.address1}>
            {(field) => (
              <field.TextField
                id="account-address-address-1"
                label={tForm("address")}
                onValueChange={clearSubmitError}
                required
                validationMode="blur"
              />
            )}
          </form.AppField>
        </div>

        <form.AppField name="city" validators={validators.city}>
          {(field) => (
            <field.TextField
              id="account-address-city"
              label={tForm("city")}
              onValueChange={clearSubmitError}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>
        <form.AppField name="postal_code" validators={validators.postalCode}>
          {(field) => (
            <field.TextField
              id="account-address-postal-code"
              label={tForm("postal_code")}
              onValueChange={clearSubmitError}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>

        <AccountAddressCountryField countryCode={formCountryCode} />
        <form.AppField name="phone" validators={validators.phone}>
          {(field) => (
            <field.PhoneField
              defaultCountry={normalizeHerbatikaPhoneCountryCode(
                formCountryCode
              )}
              id="account-address-phone"
              label={tForm("phone")}
              onValueChange={clearSubmitError}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>

        <div className="space-y-200 md:col-span-2">
          <form.AppField name="is_default_shipping">
            {(field) => (
              <field.CheckboxField
                id="account-address-default-shipping"
                label={tAuth("account.addresses.default_shipping")}
                onValueChange={clearSubmitError}
                size="sm"
                validationMode="none"
              />
            )}
          </form.AppField>
          <form.AppField name="is_default_billing">
            {(field) => (
              <field.CheckboxField
                id="account-address-default-billing"
                label={tAuth("account.addresses.default_billing")}
                onValueChange={clearSubmitError}
                size="sm"
                validationMode="none"
              />
            )}
          </form.AppField>
        </div>
      </form>
    </Dialog>
  )
}

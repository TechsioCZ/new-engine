"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Link } from "@techsio/ui-kit/atoms/link"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"
import { FormInputRaw as FormInput } from "@techsio/ui-kit/molecules/form-input"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"
import type { Dispatch, SetStateAction, SubmitEvent } from "react"
import { useState } from "react"

import { useAuth } from "@/hooks/use-auth"
import { useCustomer } from "@/hooks/use-customer"
import {
  ADDRESS_ERRORS,
  COUNTRIES,
  formatPhoneNumber,
  formatPostalCode,
  validateAddress,
  validateEmail,
} from "@/lib/address"
import type {
  AddressData,
  AddressFormProps,
  FormAddressData,
} from "@/types/checkout"

const DEFAULT_COUNTRY = "cz"

const renderAddressError = (error: string | undefined) => {
  if (error === undefined || error.length === 0) {
    return error
  }

  return (
    <StatusText showIcon size="sm" status="error">
      {error}
    </StatusText>
  )
}

const getValidationStatus = (error: string | undefined) =>
  error !== undefined && error.length > 0 ? "error" : "default"

/**
 * Keeps the original truthiness fallback: a missing *and* an empty country both
 * fall back to the default, which `??` alone would not do.
 */
const resolveCountry = (country: string | undefined): string =>
  country === undefined || country.length === 0 ? DEFAULT_COUNTRY : country

const createInitialAddress = (
  user: ReturnType<typeof useAuth>["user"],
  address: FormAddressData | null,
): AddressData => ({
  city: address?.city ?? "",
  company: user?.company_name ?? "",
  country: resolveCountry(address?.country),
  email: user?.email ?? "",
  firstName: user?.first_name ?? "",
  lastName: user?.last_name ?? "",
  phone: user?.phone ?? "",
  postalCode: address?.postalCode ?? "",
  street: address?.street ?? "",
})

/**
 * Mirrors the previous effect dependency array: only these four stored fields
 * ever triggered a re-sync, and the hook rebuilds the address object on every
 * render, so the comparison has to be by value rather than by identity.
 */
const isSameStoredAddress = (
  a: FormAddressData | null,
  b: FormAddressData | null,
): boolean => {
  if (a === null || b === null) {
    return a === b
  }

  return (
    a.city === b.city &&
    a.country === b.country &&
    a.postalCode === b.postalCode &&
    a.street === b.street
  )
}

/**
 * Keeps the original truthiness merge: an empty stored value leaves whatever
 * the customer already typed in place.
 */
const mergeStoredAddress = (
  previous: AddressData,
  address: FormAddressData,
): AddressData => ({
  ...previous,
  city: address.city || previous.city,
  country: address.country || previous.country,
  postalCode: address.postalCode || previous.postalCode,
  street: address.street || previous.street,
})

interface ShippingAddressFieldsProps {
  errors: Record<string, string>
  setErrors: Dispatch<SetStateAction<Record<string, string>>>
  setShippingAddress: Dispatch<SetStateAction<AddressData>>
  shippingAddress: AddressData
}

const ShippingAddressFields = ({
  errors,
  setErrors,
  setShippingAddress,
  shippingAddress,
}: ShippingAddressFieldsProps) => (
  <div className="flex flex-col gap-4 sm:gap-5">
    <div>
      <h3 className="mb-1 font-semibold text-fg-primary sm:mb-2 sm:text-lg">
        Doručovací adresa
      </h3>
      <p className="mb-3 text-fg-secondary text-xs sm:mb-4 sm:text-sm">
        Pole označená <span className="text-red-500">*</span> jsou povinná
      </p>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <FormInput
        helpText={renderAddressError(errors["shippingFirstName"])}
        id="shipping-first-name"
        label="Jméno"
        onChange={(e) => {
          setShippingAddress({
            ...shippingAddress,
            firstName: e.target.value,
          })
        }}
        required
        validateStatus={getValidationStatus(errors["shippingFirstName"])}
        value={shippingAddress.firstName}
      />

      <FormInput
        helpText={renderAddressError(errors["shippingLastName"])}
        id="shipping-last-name"
        label="Příjmení"
        onChange={(e) => {
          setShippingAddress({
            ...shippingAddress,
            lastName: e.target.value,
          })
        }}
        required
        validateStatus={getValidationStatus(errors["shippingLastName"])}
        value={shippingAddress.lastName}
      />
    </div>

    <FormInput
      id="shipping-company"
      label={
        <span>
          Firma <span className="text-fg-secondary text-sm">(nepovinné)</span>
        </span>
      }
      onChange={(e) => {
        setShippingAddress({ ...shippingAddress, company: e.target.value })
      }}
      value={shippingAddress.company}
    />
    <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
      <FormInput
        helpText={renderAddressError(errors["shippingEmail"])}
        id="shipping-email"
        label="Email"
        onBlur={(e) => {
          const email = e.target.value
          if (email && !validateEmail(email)) {
            setErrors({
              ...errors,
              shippingEmail: ADDRESS_ERRORS.emailInvalid,
            })
          } else {
            setErrors({ ...errors, shippingEmail: "" })
          }
        }}
        onChange={(e) => {
          setShippingAddress({ ...shippingAddress, email: e.target.value })
        }}
        required
        type="email"
        validateStatus={getValidationStatus(errors["shippingEmail"])}
        value={shippingAddress.email}
      />

      <FormInput
        helpText={renderAddressError(errors["shippingPhone"])}
        id="shipping-phone"
        label="Telefon"
        onChange={(e) => {
          const formatted = formatPhoneNumber(e.target.value)
          setShippingAddress({ ...shippingAddress, phone: formatted })
        }}
        placeholder="123 456 789"
        required
        type="tel"
        validateStatus={getValidationStatus(errors["shippingPhone"])}
        value={shippingAddress.phone}
      />
    </div>

    <FormInput
      helpText={renderAddressError(errors["shippingStreet"])}
      id="shipping-street"
      label="Ulice a číslo popisné"
      onChange={(e) => {
        setShippingAddress({ ...shippingAddress, street: e.target.value })
      }}
      required
      validateStatus={getValidationStatus(errors["shippingStreet"])}
      value={shippingAddress.street}
    />

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <FormInput
        helpText={renderAddressError(errors["shippingCity"])}
        id="shipping-city"
        label="Město"
        onChange={(e) => {
          setShippingAddress({ ...shippingAddress, city: e.target.value })
        }}
        required
        validateStatus={getValidationStatus(errors["shippingCity"])}
        value={shippingAddress.city}
      />

      <FormInput
        helpText={renderAddressError(errors["shippingPostalCode"])}
        id="shipping-postal-code"
        label="PSČ"
        onChange={(e) => {
          const formatted = formatPostalCode(e.target.value)
          setShippingAddress({ ...shippingAddress, postalCode: formatted })
        }}
        placeholder="123 45"
        required
        validateStatus={getValidationStatus(errors["shippingPostalCode"])}
        value={shippingAddress.postalCode}
      />
    </div>

    <div className="mb-4 max-w-[20rem] sm:mb-6">
      <SelectTemplate
        items={COUNTRIES}
        label="Země"
        onValueChange={(details) => {
          const [value] = details.value
          if (value !== undefined && value.length > 0) {
            setShippingAddress({
              ...shippingAddress,
              country: value,
            })
          }
        }}
        required
        value={[shippingAddress.country]}
      />
    </div>
  </div>
)

interface BillingAddressFieldsProps {
  billingAddress: AddressData
  errors: Record<string, string>
  setBillingAddress: Dispatch<SetStateAction<AddressData>>
}

const BillingAddressFields = ({
  billingAddress,
  errors,
  setBillingAddress,
}: BillingAddressFieldsProps) => (
  <div className="flex flex-col gap-4 sm:gap-5">
    <h3 className="mb-1 font-semibold text-fg-primary sm:mb-2 sm:text-lg">
      Fakturační adresa
    </h3>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <FormInput
        helpText={renderAddressError(errors["billingFirstName"])}
        id="billing-first-name"
        label="Jméno"
        onChange={(e) => {
          setBillingAddress({
            ...billingAddress,
            firstName: e.target.value,
          })
        }}
        required
        validateStatus={getValidationStatus(errors["billingFirstName"])}
        value={billingAddress.firstName}
      />

      <FormInput
        helpText={renderAddressError(errors["billingLastName"])}
        id="billing-last-name"
        label="Příjmení"
        onChange={(e) => {
          setBillingAddress({
            ...billingAddress,
            lastName: e.target.value,
          })
        }}
        required
        validateStatus={getValidationStatus(errors["billingLastName"])}
        value={billingAddress.lastName}
      />
    </div>

    <FormInput
      id="billing-company"
      label="Firma (nepovinné)"
      onChange={(e) => {
        setBillingAddress({ ...billingAddress, company: e.target.value })
      }}
      value={billingAddress.company}
    />

    <FormInput
      helpText={renderAddressError(errors["billingStreet"])}
      id="billing-street"
      label="Ulice a číslo popisné"
      onChange={(e) => {
        setBillingAddress({ ...billingAddress, street: e.target.value })
      }}
      required
      validateStatus={getValidationStatus(errors["billingStreet"])}
      value={billingAddress.street}
    />

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <FormInput
        helpText={renderAddressError(errors["billingCity"])}
        id="billing-city"
        label="Město"
        onChange={(e) => {
          setBillingAddress({ ...billingAddress, city: e.target.value })
        }}
        required
        validateStatus={getValidationStatus(errors["billingCity"])}
        value={billingAddress.city}
      />

      <FormInput
        helpText={renderAddressError(errors["billingPostalCode"])}
        id="billing-postal-code"
        label="PSČ"
        onChange={(e) => {
          setBillingAddress({
            ...billingAddress,
            postalCode: e.target.value,
          })
        }}
        required
        validateStatus={getValidationStatus(errors["billingPostalCode"])}
        value={billingAddress.postalCode}
      />
    </div>

    <div className="mb-4 max-w-[20rem] sm:mb-6">
      <SelectTemplate
        items={COUNTRIES}
        label="Země"
        onValueChange={(details) => {
          const [value] = details.value
          if (value !== undefined && value.length > 0) {
            setBillingAddress({
              ...billingAddress,
              country: value,
            })
          }
        }}
        required
        value={[billingAddress.country]}
      />
    </div>
  </div>
)

export const AddressForm = ({
  onComplete,
  isLoading = false,
}: AddressFormProps) => {
  const { user } = useAuth()
  const { address } = useCustomer()

  const [shippingAddress, setShippingAddress] = useState<AddressData>(() =>
    createInitialAddress(user, address),
  )
  const [billingAddress, setBillingAddress] = useState<AddressData>(() =>
    createInitialAddress(user, address),
  )
  const [syncedAddress, setSyncedAddress] = useState<FormAddressData | null>(
    address,
  )

  const [useSameAddress, setUseSameAddress] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Replaces the previous effect: React supports adjusting state while
  // rendering when a value changes, and it avoids the cascading render an
  // effect-based sync produces.
  if (!isSameStoredAddress(syncedAddress, address)) {
    setSyncedAddress(address)

    if (address) {
      setShippingAddress((previous) => mergeStoredAddress(previous, address))
    }
  }

  const validateForm = () => {
    let newErrors: Record<string, string> = {}

    // Validate shipping address (with email and phone required)
    const shippingErrors = validateAddress(shippingAddress, {
      prefix: "shipping",
      requireEmail: true,
      requirePhone: true,
    })
    newErrors = { ...newErrors, ...shippingErrors }

    // Validate billing address if different (without email and phone)
    if (!useSameAddress) {
      const billingErrors = validateAddress(billingAddress, {
        prefix: "billing",
        requireEmail: false,
        requirePhone: false,
      })
      newErrors = { ...newErrors, ...billingErrors }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (validateForm()) {
      void onComplete({
        billing: useSameAddress ? shippingAddress : billingAddress,
        shipping: shippingAddress,
        useSameAddress,
      })
    }
  }

  return (
    <form className="relative flex flex-col" onSubmit={handleSubmit}>
      <ShippingAddressFields
        errors={errors}
        setErrors={setErrors}
        setShippingAddress={setShippingAddress}
        shippingAddress={shippingAddress}
      />

      <div className="mb-4 sm:mb-6">
        <FormCheckbox
          checked={useSameAddress}
          id="same-address"
          label="Fakturační adresa je stejná jako doručovací"
          onCheckedChange={setUseSameAddress}
        />
      </div>

      {!useSameAddress && (
        <BillingAddressFields
          billingAddress={billingAddress}
          errors={errors}
          setBillingAddress={setBillingAddress}
        />
      )}
      <div className="flex w-full justify-between">
        <LinkButton as={Link} href="/cart" size="sm" variant="primary">
          Zpět do košíku
        </LinkButton>
        <Button
          disabled={isLoading}
          isLoading={isLoading}
          size="sm"
          type="submit"
        >
          Pokračovat
        </Button>
      </div>
    </form>
  )
}

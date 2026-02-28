"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Link } from "@techsio/ui-kit/atoms/link"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"
import { FormInputRaw as FormInput } from "@techsio/ui-kit/molecules/form-input"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"
import { useEffect, useState } from "react"
import { ErrorText } from "@/components/atoms/error-text"
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
import type { AddressData, AddressFormProps } from "@/types/checkout"

export function AddressForm({
  onComplete,
  isLoading = false,
}: AddressFormProps) {
  const { user } = useAuth()
  const { address } = useCustomer()

  const [shippingAddress, setShippingAddress] = useState<AddressData>({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    street: address?.street || "",
    city: address?.city || "",
    postalCode: address?.postalCode || "",
    country: address?.country || "cz",
    company: user?.company_name || "",
  })

  const [billingAddress, setBillingAddress] = useState<AddressData>({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    street: address?.street || "",
    city: address?.city || "",
    postalCode: address?.postalCode || "",
    country: address?.country || "cz",
    company: user?.company_name || "",
  })

  useEffect(() => {
    if (address) {
      setShippingAddress((prev) => ({
        ...prev,
        street: address.street || prev.street,
        city: address.city || prev.city,
        postalCode: address.postalCode || prev.postalCode,
        country: address.country || prev.country,
      }))
    }
  }, [address?.street, address?.city, address?.postalCode, address?.country])

  const [useSameAddress, setUseSameAddress] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    let newErrors: Record<string, string> = {}

    // Validate shipping address (with email and phone required)
    const shippingErrors = validateAddress(shippingAddress, {
      requireEmail: true,
      requirePhone: true,
      prefix: "shipping",
    })
    newErrors = { ...newErrors, ...shippingErrors }

    // Validate billing address if different (without email and phone)
    if (!useSameAddress) {
      const billingErrors = validateAddress(billingAddress, {
        requireEmail: false,
        requirePhone: false,
        prefix: "billing",
      })
      newErrors = { ...newErrors, ...billingErrors }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (validateForm()) {
      onComplete({
        shipping: shippingAddress,
        billing: useSameAddress ? shippingAddress : billingAddress,
        useSameAddress,
      })
    }
  }

  return (
    <form className="relative flex flex-col" onSubmit={handleSubmit}>
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
            helpText={
              errors.shippingFirstName && (
                <ErrorText>{errors.shippingFirstName}</ErrorText>
              )
            }
            id="shipping-first-name"
            label="Jméno"
            onChange={(e) =>
              setShippingAddress({
                ...shippingAddress,
                firstName: e.target.value,
              })
            }
            required
            validateStatus={errors.shippingFirstName ? "error" : "default"}
            value={shippingAddress.firstName}
          />

          <FormInput
            helpText={
              errors.shippingLastName && (
                <ErrorText>{errors.shippingLastName}</ErrorText>
              )
            }
            id="shipping-last-name"
            label="Příjmení"
            onChange={(e) =>
              setShippingAddress({
                ...shippingAddress,
                lastName: e.target.value,
              })
            }
            required
            validateStatus={errors.shippingLastName ? "error" : "default"}
            value={shippingAddress.lastName}
          />
        </div>

        <FormInput
          id="shipping-company"
          label={
            <span>
              Firma{" "}
              <span className="text-fg-secondary text-sm">(nepovinné)</span>
            </span>
          }
          onChange={(e) =>
            setShippingAddress({ ...shippingAddress, company: e.target.value })
          }
          value={shippingAddress.company}
        />
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <FormInput
            helpText={
              errors.shippingEmail && (
                <ErrorText>{errors.shippingEmail}</ErrorText>
              )
            }
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
            onChange={(e) =>
              setShippingAddress({ ...shippingAddress, email: e.target.value })
            }
            required
            type="email"
            validateStatus={errors.shippingEmail ? "error" : "default"}
            value={shippingAddress.email}
          />

          <FormInput
            helpText={
              errors.shippingPhone && (
                <ErrorText>{errors.shippingPhone}</ErrorText>
              )
            }
            id="shipping-phone"
            label="Telefon"
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value)
              setShippingAddress({ ...shippingAddress, phone: formatted })
            }}
            placeholder="123 456 789"
            required
            type="tel"
            validateStatus={errors.shippingPhone ? "error" : "default"}
            value={shippingAddress.phone}
          />
        </div>

        <FormInput
          helpText={
            errors.shippingStreet && (
              <ErrorText>{errors.shippingStreet}</ErrorText>
            )
          }
          id="shipping-street"
          label="Ulice a číslo popisné"
          onChange={(e) =>
            setShippingAddress({ ...shippingAddress, street: e.target.value })
          }
          required
          validateStatus={errors.shippingStreet ? "error" : "default"}
          value={shippingAddress.street}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <FormInput
            helpText={
              errors.shippingCity && (
                <ErrorText>{errors.shippingCity}</ErrorText>
              )
            }
            id="shipping-city"
            label="Město"
            onChange={(e) =>
              setShippingAddress({ ...shippingAddress, city: e.target.value })
            }
            required
            validateStatus={errors.shippingCity ? "error" : "default"}
            value={shippingAddress.city}
          />

          <FormInput
            helpText={
              errors.shippingPostalCode && (
                <ErrorText>{errors.shippingPostalCode}</ErrorText>
              )
            }
            id="shipping-postal-code"
            label="PSČ"
            onChange={(e) => {
              const formatted = formatPostalCode(e.target.value)
              setShippingAddress({ ...shippingAddress, postalCode: formatted })
            }}
            placeholder="123 45"
            required
            validateStatus={errors.shippingPostalCode ? "error" : "default"}
            value={shippingAddress.postalCode}
          />
        </div>

        <div className="mb-4 max-w-[20rem] sm:mb-6">
          <SelectTemplate
            items={COUNTRIES}
            label="Země"
            onValueChange={(details) => {
              const value = details.value[0]
              if (value) {
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

      <div className="mb-4 sm:mb-6">
        <FormCheckbox
          checked={useSameAddress}
          id="same-address"
          label="Fakturační adresa je stejná jako doručovací"
          onCheckedChange={setUseSameAddress}
        />
      </div>

      {!useSameAddress && (
        <div className="flex flex-col gap-4 sm:gap-5">
          <h3 className="mb-1 font-semibold text-fg-primary sm:mb-2 sm:text-lg">
            Fakturační adresa
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <FormInput
              helpText={
                errors.billingFirstName && (
                  <ErrorText>{errors.billingFirstName}</ErrorText>
                )
              }
              id="billing-first-name"
              label="Jméno"
              onChange={(e) =>
                setBillingAddress({
                  ...billingAddress,
                  firstName: e.target.value,
                })
              }
              required
              validateStatus={errors.billingFirstName ? "error" : "default"}
              value={billingAddress.firstName}
            />

            <FormInput
              helpText={
                errors.billingLastName && (
                  <ErrorText>{errors.billingLastName}</ErrorText>
                )
              }
              id="billing-last-name"
              label="Příjmení"
              onChange={(e) =>
                setBillingAddress({
                  ...billingAddress,
                  lastName: e.target.value,
                })
              }
              required
              validateStatus={errors.billingLastName ? "error" : "default"}
              value={billingAddress.lastName}
            />
          </div>

          <FormInput
            id="billing-company"
            label="Firma (nepovinné)"
            onChange={(e) =>
              setBillingAddress({ ...billingAddress, company: e.target.value })
            }
            value={billingAddress.company}
          />

          <FormInput
            helpText={
              errors.billingStreet && (
                <ErrorText>{errors.billingStreet}</ErrorText>
              )
            }
            id="billing-street"
            label="Ulice a číslo popisné"
            onChange={(e) =>
              setBillingAddress({ ...billingAddress, street: e.target.value })
            }
            required
            validateStatus={errors.billingStreet ? "error" : "default"}
            value={billingAddress.street}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <FormInput
              helpText={
                errors.billingCity && (
                  <ErrorText>{errors.billingCity}</ErrorText>
                )
              }
              id="billing-city"
              label="Město"
              onChange={(e) =>
                setBillingAddress({ ...billingAddress, city: e.target.value })
              }
              required
              validateStatus={errors.billingCity ? "error" : "default"}
              value={billingAddress.city}
            />

            <FormInput
              helpText={
                errors.billingPostalCode && (
                  <ErrorText>{errors.billingPostalCode}</ErrorText>
                )
              }
              id="billing-postal-code"
              label="PSČ"
              onChange={(e) =>
                setBillingAddress({
                  ...billingAddress,
                  postalCode: e.target.value,
                })
              }
              required
              validateStatus={errors.billingPostalCode ? "error" : "default"}
              value={billingAddress.postalCode}
            />
          </div>

          <div className="mb-4 max-w-[20rem] sm:mb-6">
            <SelectTemplate
              items={COUNTRIES}
              label="Země"
              onValueChange={(details) => {
                const value = details.value[0]
                if (value) {
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

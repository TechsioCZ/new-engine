"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import {
  PhoneInput,
  type PhoneInputCountry,
} from "@techsio/ui-kit/molecules/phone-input"
import { type ReactNode, useState } from "react"
import {
  resolveVisibleFieldFeedback,
  shouldTrackLiveFieldFeedback,
} from "@/lib/forms/core/field-errors"
import { useFieldContext } from "@/lib/forms/core/herbatika-form-context"

type FormPhoneFieldProps = {
  id: string
  label: ReactNode
  countries?: PhoneInputCountry[]
  defaultCountry?: PhoneInputCountry["value"]
  placeholder?: string
  required?: boolean
  validationMode?: "none" | "blur"
  onValueChange?: (value: string) => void
}

const CHECKOUT_PHONE_COUNTRIES: PhoneInputCountry[] = [
  {
    value: "SK",
    label: "Slovensko",
    name: "Slovensko",
    flag: (
      <Icon
        className="brightness-95"
        icon="icon-[emojione--flag-for-slovakia]"
        size="md"
      />
    ),
  },
  {
    value: "CZ",
    label: "Česko",
    name: "Česko",
    flag: (
      <Icon
        className="brightness-95"
        icon="icon-[emojione--flag-for-czechia]"
        size="md"
      />
    ),
  },
  {
    value: "AT",
    label: "Rakúsko",
    name: "Rakúsko",
    flag: (
      <Icon
        className="brightness-95"
        icon="icon-[emojione--flag-for-austria]"
        size="md"
      />
    ),
  },
  {
    value: "HU",
    label: "Maďarsko",
    name: "Maďarsko",
    flag: (
      <Icon
        className="brightness-95"
        icon="icon-[emojione--flag-for-hungary]"
        size="md"
      />
    ),
  },
]

export function FormPhoneField({
  countries = CHECKOUT_PHONE_COUNTRIES,
  defaultCountry = "SK",
  id,
  label,
  onValueChange,
  placeholder = "900 123 456",
  required = false,
  validationMode = "blur",
}: FormPhoneFieldProps) {
  const field = useFieldContext<string>()
  const [hasChangedSinceBlur, setHasChangedSinceBlur] = useState(false)
  const value = typeof field.state.value === "string" ? field.state.value : ""
  const fieldFeedback = resolveVisibleFieldFeedback({
    hasChangedSinceBlur,
    meta: field.state.meta,
    submissionAttempts: field.form.state.submissionAttempts,
    validationMode,
  })

  return (
    <PhoneInput
      countries={countries}
      defaultCountry={defaultCountry}
      id={id}
      name={field.name}
      onValueChange={(details) => {
        if (
          shouldTrackLiveFieldFeedback({
            meta: field.state.meta,
            submissionAttempts: field.form.state.submissionAttempts,
          })
        ) {
          setHasChangedSinceBlur(true)
        }

        field.handleChange(details.value)
        onValueChange?.(details.value)
      }}
      required={required}
      validateStatus={fieldFeedback.validateStatus}
      value={value}
    >
      <PhoneInput.Label>{label}</PhoneInput.Label>
      <PhoneInput.Control className="min-h-phone-input-md rounded-r-xs rounded-l-xs">
        <PhoneInput.CountryPicker
          triggerProps={{ className: "px-400 gap-x-200" }}
        />
        <PhoneInput.Input
          autoComplete="tel"
          onBlur={() => {
            field.handleBlur()
            setHasChangedSinceBlur(false)
          }}
          placeholder={placeholder}
        />
      </PhoneInput.Control>
      {fieldFeedback.errorText ? (
        <PhoneInput.StatusText showIcon>
          {fieldFeedback.errorText}
        </PhoneInput.StatusText>
      ) : null}
    </PhoneInput>
  )
}

"use client"

import { useStore } from "@tanstack/react-form"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
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
import {
  HERBATIKA_PHONE_COUNTRY_CODES,
  type HerbatikaPhoneCountryCode,
  normalizeHerbatikaPhoneCountryCode,
  toPhoneFormValue,
} from "@/lib/forms/phone-number"

type FormPhoneFieldProps = {
  id: string
  label: ReactNode
  defaultCountry?: HerbatikaPhoneCountryCode
  placeholder?: string
  required?: boolean
  validationMode?: "none" | "blur"
  onValueChange?: (value: string) => void
}

const PHONE_COUNTRY_PRESENTATION = {
  CZ: {
    label: "Česko",
    flagIcon: "icon-[emojione--flag-for-czechia]",
  },
  HU: {
    label: "Maďarsko",
    flagIcon: "icon-[emojione--flag-for-hungary]",
  },
  RO: {
    label: "Rumunsko",
    flagIcon: "icon-[emojione--flag-for-romania]",
  },
  SK: {
    label: "Slovensko",
    flagIcon: "icon-[emojione--flag-for-slovakia]",
  },
} as const satisfies Record<
  HerbatikaPhoneCountryCode,
  { flagIcon: string; label: string }
>

const HERBATIKA_PHONE_COUNTRIES: PhoneInputCountry[] =
  HERBATIKA_PHONE_COUNTRY_CODES.map((value) => {
    const { flagIcon, label } = PHONE_COUNTRY_PRESENTATION[value]

    return {
      value,
      label,
      name: label,
      flag: <Icon className="brightness-95" icon={flagIcon} size="md" />,
    }
  })

export function FormPhoneField({
  defaultCountry,
  id,
  label,
  onValueChange,
  placeholder = "900 123 456",
  required = false,
  validationMode = "blur",
}: FormPhoneFieldProps) {
  const field = useFieldContext<string>()
  const submissionAttempts = useStore(
    field.form.store,
    (state) => state.submissionAttempts
  )
  const region = useRegionContext()
  const [hasChangedSinceBlur, setHasChangedSinceBlur] = useState(false)
  const value = typeof field.state.value === "string" ? field.state.value : ""
  const resolvedDefaultCountry =
    defaultCountry ??
    normalizeHerbatikaPhoneCountryCode(region?.country_code) ??
    HERBATIKA_PHONE_COUNTRY_CODES[0]
  const fieldFeedback = resolveVisibleFieldFeedback({
    hasChangedSinceBlur,
    meta: field.state.meta,
    submissionAttempts,
    validationMode,
  })

  return (
    <PhoneInput
      countries={HERBATIKA_PHONE_COUNTRIES}
      defaultCountry={resolvedDefaultCountry}
      id={id}
      name={field.name}
      onValueChange={(details) => {
        if (
          shouldTrackLiveFieldFeedback({
            meta: field.state.meta,
            submissionAttempts,
          })
        ) {
          setHasChangedSinceBlur(true)
        }

        const nextValue = toPhoneFormValue(details)

        field.handleChange(nextValue)
        onValueChange?.(nextValue)
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

"use client"

import { useStore } from "@tanstack/react-form"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import {
  PhoneInput,
  type PhoneInputCountry,
} from "@techsio/ui-kit/molecules/phone-input"
import { type ReactNode, useMemo, useState } from "react"
import {
  resolveVisibleFieldFeedback,
  shouldTrackLiveFieldFeedback,
} from "@/lib/forms/core/field-errors"
import { useFieldContext } from "@/lib/forms/core/herbatika-form-context"
import { resolveCountryDisplayName } from "@/lib/forms/country-options"
import {
  HERBATIKA_PHONE_COUNTRY_CODES,
  type HerbatikaPhoneCountryCode,
  normalizeHerbatikaPhoneCountryCode,
  toPhoneFormValue,
} from "@/lib/forms/phone-number"
import type { HerbatikaLocale } from "@/lib/storefront/market-context"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

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
    flagIcon: "icon-[emojione--flag-for-czechia]",
  },
  HU: {
    flagIcon: "icon-[emojione--flag-for-hungary]",
  },
  RO: {
    flagIcon: "icon-[emojione--flag-for-romania]",
  },
  SK: {
    flagIcon: "icon-[emojione--flag-for-slovakia]",
  },
} as const satisfies Record<HerbatikaPhoneCountryCode, { flagIcon: string }>

const PHONE_PLACEHOLDER_BY_COUNTRY = {
  CZ: "601 123 456",
  HU: "30 123 4567",
  RO: "712 345 678",
  SK: "900 123 456",
} as const satisfies Record<HerbatikaPhoneCountryCode, string>

export const resolvePhoneFieldCountries = (
  locale: HerbatikaLocale
): PhoneInputCountry[] =>
  HERBATIKA_PHONE_COUNTRY_CODES.map((value) => {
    const { flagIcon } = PHONE_COUNTRY_PRESENTATION[value]
    const label = resolveCountryDisplayName(value, locale)

    return {
      value,
      label,
      name: label,
      flag: <Icon className="brightness-95" icon={flagIcon} size="md" />,
    }
  })

export const resolvePhoneFieldPlaceholder = (
  countryCode: string | null | undefined
) =>
  PHONE_PLACEHOLDER_BY_COUNTRY[
    normalizeHerbatikaPhoneCountryCode(countryCode) ?? "SK"
  ]

export function FormPhoneField({
  defaultCountry,
  id,
  label,
  onValueChange,
  placeholder,
  required = false,
  validationMode = "blur",
}: FormPhoneFieldProps) {
  const field = useFieldContext<string>()
  const submissionAttempts = useStore(
    field.form.store,
    (state) => state.submissionAttempts
  )
  const region = useRegionContext()
  const marketContext = useMarketContext()
  const [hasChangedSinceBlur, setHasChangedSinceBlur] = useState(false)
  const value = typeof field.state.value === "string" ? field.state.value : ""
  const resolvedDefaultCountry =
    defaultCountry ??
    normalizeHerbatikaPhoneCountryCode(region?.country_code) ??
    normalizeHerbatikaPhoneCountryCode(marketContext.countryCode) ??
    HERBATIKA_PHONE_COUNTRY_CODES[0]
  const countries = useMemo(
    () => resolvePhoneFieldCountries(marketContext.locale),
    [marketContext.locale]
  )
  const resolvedPlaceholder =
    placeholder ?? resolvePhoneFieldPlaceholder(resolvedDefaultCountry)
  const fieldFeedback = resolveVisibleFieldFeedback({
    hasChangedSinceBlur,
    meta: field.state.meta,
    submissionAttempts,
    validationMode,
  })

  return (
    <PhoneInput
      countries={countries}
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
          placeholder={resolvedPlaceholder}
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

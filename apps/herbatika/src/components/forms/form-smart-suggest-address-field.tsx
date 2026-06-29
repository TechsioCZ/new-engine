"use client"

import type { AddressParts } from "@techsio/smart-suggest-core"
import { AddressSuggestField } from "@techsio/smart-suggest-ui/address-suggest-field"
import { type ReactNode, useState } from "react"
import {
  resolveVisibleFieldFeedback,
  shouldTrackLiveFieldFeedback,
} from "@/lib/forms/core/field-errors"
import { useFieldContext } from "@/lib/forms/core/herbatika-form-context"
import { herbatikaSmartSuggestClient } from "@/lib/smart-suggest/client"

type FormSmartSuggestAddressFieldProps = {
  id: string
  label?: ReactNode
  countryCode?: string
  required?: boolean
  validationMode?: "none" | "blur"
  onAddressSelect?: (address: AddressParts) => void
}

const toCountryCode = (countryCode: string | undefined) => {
  const normalizedCountryCode = countryCode?.trim().toUpperCase()
  return normalizedCountryCode
    ? (normalizedCountryCode as Uppercase<string>)
    : undefined
}

const formatAddressLine = (address: AddressParts, fallback: string) => {
  if (address.line1?.trim()) {
    return address.line1.trim()
  }

  const streetLine = [
    address.street?.trim(),
    [address.houseNumber?.trim(), address.orientationNumber?.trim()]
      .filter(Boolean)
      .join("/"),
  ]
    .filter(Boolean)
    .join(" ")
    .trim()

  return streetLine || fallback
}

export function FormSmartSuggestAddressField({
  countryCode,
  id,
  label,
  onAddressSelect,
  required = false,
  validationMode = "blur",
}: FormSmartSuggestAddressFieldProps) {
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
    <div
      onBlurCapture={() => {
        field.handleBlur()
        setHasChangedSinceBlur(false)
      }}
    >
      <AddressSuggestField
        autoComplete="address-line1"
        client={herbatikaSmartSuggestClient}
        countryCode={toCountryCode(countryCode)}
        helpText={fieldFeedback.errorText}
        id={id}
        inputValue={value}
        label={label ? String(label) : undefined}
        minQueryLength={2}
        name={field.name}
        onAddressSelect={(address) => {
          field.handleChange(formatAddressLine(address, value))
          field.handleBlur()
          setHasChangedSinceBlur(false)
          onAddressSelect?.(address)
        }}
        onInputValueChange={(nextValue) => {
          if (
            shouldTrackLiveFieldFeedback({
              meta: field.state.meta,
              submissionAttempts: field.form.state.submissionAttempts,
            })
          ) {
            setHasChangedSinceBlur(true)
          }
          field.handleChange(nextValue)
        }}
        placeholder="Začnite písať ulicu"
        required={required}
        validateStatus={fieldFeedback.validateStatus}
      />
    </div>
  )
}

"use client"

import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { useLocale, useTranslations } from "next-intl"
import { resolveCountryDisplayName } from "@/lib/forms/country-options"
import type { HerbatikaCountryCode } from "@/lib/storefront/market-context"

type AccountAddressCountryFieldProps = {
  countryCode: HerbatikaCountryCode
}

export function AccountAddressCountryField({
  countryCode,
}: AccountAddressCountryFieldProps) {
  const locale = useLocale()
  const tForm = useTranslations("form")

  return (
    <FormInput
      disabled
      id="account-address-country"
      label={tForm("country")}
      value={resolveCountryDisplayName(countryCode, locale)}
    />
  )
}

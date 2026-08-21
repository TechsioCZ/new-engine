"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useLocale, useTranslations } from "next-intl"
import { resolveCountryDisplayName } from "@/lib/forms/country-options"
import type { CustomerAddress } from "./account-address-model"

type AccountAddressCardProps = {
  address: CustomerAddress
  onDelete: (address: CustomerAddress) => void
  onEdit: (address: CustomerAddress) => void
}

export function AccountAddressCard({
  address,
  onDelete,
  onEdit,
}: AccountAddressCardProps) {
  const tAuth = useTranslations("auth")
  const locale = useLocale()
  const recipient = [address.first_name, address.last_name]
    .filter(Boolean)
    .join(" ")
  const locality = [address.postal_code, address.city].filter(Boolean).join(" ")
  const country = address.country_code
    ? resolveCountryDisplayName(address.country_code, locale)
    : ""

  return (
    <article className="flex h-full flex-col justify-between gap-400 rounded-md border border-border-secondary bg-surface-subtle p-400">
      <div className="space-y-250">
        <div className="flex flex-wrap gap-150">
          {address.is_default_shipping ? (
            <span className="rounded-full bg-surface-primary px-250 py-100 font-medium text-fg-primary text-xs">
              {tAuth("account.addresses.default_shipping")}
            </span>
          ) : null}
          {address.is_default_billing ? (
            <span className="rounded-full bg-surface-primary px-250 py-100 font-medium text-fg-primary text-xs">
              {tAuth("account.addresses.default_billing")}
            </span>
          ) : null}
        </div>

        <address className="space-y-50 text-fg-secondary text-sm not-italic">
          {recipient ? (
            <p className="font-semibold text-fg-primary">{recipient}</p>
          ) : null}
          {address.company ? <p>{address.company}</p> : null}
          {address.address_1 ? <p>{address.address_1}</p> : null}
          {locality ? <p>{locality}</p> : null}
          {country ? <p>{country}</p> : null}
          {address.phone ? <p>{address.phone}</p> : null}
        </address>
      </div>

      <div className="flex flex-wrap gap-200">
        <Button
          icon="token-icon-pen"
          onClick={() => onEdit(address)}
          size="sm"
          theme="outlined"
          type="button"
          variant="secondary"
        >
          {tAuth("account.addresses.edit")}
        </Button>
        <Button
          icon="token-icon-trash"
          onClick={() => onDelete(address)}
          size="sm"
          theme="outlined"
          type="button"
          variant="danger"
        >
          {tAuth("account.addresses.delete")}
        </Button>
      </div>
    </article>
  )
}

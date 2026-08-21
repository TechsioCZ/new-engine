"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { useState } from "react"
import {
  AccountSkeletonSurface,
  AccountSurface,
} from "@/components/account/account-surface"
import { useCustomerAddresses } from "@/lib/storefront/customers"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { AccountAddressCard } from "./account-address-card"
import { AccountAddressDeleteDialog } from "./account-address-delete-dialog"
import { AccountAddressFormDialog } from "./account-address-form-dialog"
import type { CustomerAddress } from "./account-address-model"

export function AccountAddresses() {
  const tAuth = useTranslations("auth")
  const { countryCode } = useMarketContext()
  const addressesQuery = useCustomerAddresses({})
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(
    null
  )
  const [deletingAddress, setDeletingAddress] =
    useState<CustomerAddress | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (addressesQuery.isLoading) {
    return <AccountSkeletonSurface lines={7} />
  }

  const closeEditor = () => {
    setIsCreating(false)
    setEditingAddress(null)
  }

  return (
    <AccountSurface className="space-y-500">
      <header className="flex flex-wrap items-start justify-between gap-300">
        <div className="space-y-200">
          <h2 className="font-semibold text-xl">
            {tAuth("account.addresses.title")}
          </h2>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.addresses.description")}
          </p>
        </div>
        <Button
          icon="token-icon-plus"
          onClick={() => {
            setSuccessMessage(null)
            setIsCreating(true)
          }}
          size="sm"
          type="button"
        >
          {tAuth("account.addresses.add")}
        </Button>
      </header>

      {successMessage ? (
        <StatusText align="start" showIcon status="success">
          {successMessage}
        </StatusText>
      ) : null}

      {addressesQuery.error ? (
        <div className="space-y-300">
          <StatusText align="start" showIcon status="error">
            {tAuth("account.addresses.load_failed")}
          </StatusText>
          <Button
            onClick={() => runDetachedPromise(addressesQuery.query.refetch())}
            size="sm"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            {tAuth("account.addresses.retry")}
          </Button>
        </div>
      ) : null}

      {!addressesQuery.error && addressesQuery.addresses.length === 0 ? (
        <div className="space-y-150 rounded-md border border-border-secondary bg-surface-subtle p-500 text-center">
          <h3 className="font-semibold text-lg">
            {tAuth("account.addresses.empty_title")}
          </h3>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.addresses.empty_description")}
          </p>
        </div>
      ) : null}

      {!addressesQuery.error && addressesQuery.addresses.length > 0 ? (
        <div className="grid gap-300 md:grid-cols-2">
          {addressesQuery.addresses.map((address) => (
            <AccountAddressCard
              address={address}
              key={address.id}
              onDelete={(selectedAddress) => {
                setSuccessMessage(null)
                setDeletingAddress(selectedAddress)
              }}
              onEdit={(selectedAddress) => {
                setSuccessMessage(null)
                setEditingAddress(selectedAddress)
              }}
            />
          ))}
        </div>
      ) : null}

      {isCreating || editingAddress ? (
        <AccountAddressFormDialog
          address={editingAddress}
          countryCode={countryCode}
          onClose={closeEditor}
          onSaved={setSuccessMessage}
        />
      ) : null}

      {deletingAddress ? (
        <AccountAddressDeleteDialog
          address={deletingAddress}
          onClose={() => setDeletingAddress(null)}
          onDeleted={setSuccessMessage}
        />
      ) : null}
    </AccountSurface>
  )
}

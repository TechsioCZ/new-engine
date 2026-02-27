"use client"

import type { HttpTypes } from "@medusajs/types"
import { Button } from "@techsio/ui-kit/atoms/button"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useState } from "react"
import { AddressForm } from "@/components/address/address-form"
import { ConfirmDialog } from "@/components/molecules/confirm-dialog"
import { useDeleteAddress } from "@/hooks/use-addresses"
import { formatPhoneNumber } from "@/utils/format/format-phone-number"
import { formatPostalCode } from "@/utils/format/format-postal-code"
import { useAccountContext } from "../../context/account-context"

export function AddressList() {
  const { customer } = useAccountContext()
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  if (!customer?.addresses) {
    return <div className="text-fg-secondary">Načítám adresy...</div>
  }

  const addresses = customer.addresses

  return (
    <div className="space-y-250">
      {!(isAdding || editingId) && addresses.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            variant="secondary"
          >
            Přidat adresu
          </Button>
        </div>
      )}

      {isAdding && (
        <div className="rounded border border-border-secondary bg-surface p-200">
          <AddressForm
            onCancel={() => setIsAdding(false)}
            onSuccess={() => setIsAdding(false)}
          />
        </div>
      )}

      {addresses.length > 0 && (
        <div className="grid auto-rows-min gap-200 md:grid-cols-2">
          {addresses.map((address) => (
            <div
              className={`h-fit rounded border border-border-secondary bg-surface p-200 ${
                editingId === null
                  ? "row-span-3 grid grid-rows-subgrid gap-0"
                  : "flex flex-col gap-100"
              }`}
              key={address.id}
            >
              {editingId === address.id ? (
                <AddressForm
                  address={address}
                  onCancel={() => setEditingId(null)}
                  onSuccess={() => setEditingId(null)}
                />
              ) : (
                <AddressCard
                  address={address}
                  onEdit={() => setEditingId(address.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {!isAdding && addresses.length === 0 && (
        <div className="py-400 text-center">
          <p className="mb-200 text-fg-secondary">
            Zatím nemáte uložené žádné adresy.
          </p>
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            variant="secondary"
          >
            Přidat první adresu
          </Button>
        </div>
      )}
    </div>
  )
}

function AddressCard({
  address,
  onEdit,
}: {
  address: HttpTypes.StoreCustomerAddress
  onEdit: () => void
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const deleteAddress = useDeleteAddress()
  const toaster = useToast()

  const handleDelete = () => {
    deleteAddress.mutate(address.id, {
      onSuccess: () => {
        toaster.create({ title: "Adresa smazána", type: "success" })
        setIsDeleteDialogOpen(false)
      },
      onError: () => {
        toaster.create({ title: "Chyba při mazání", type: "error" })
      },
    })
  }

  return (
    <div className="contents">
      <div className="font-medium">
        {address.first_name} {address.last_name}
      </div>
      <div className="text-fg-secondary text-sm">
        {address.company && <div>{address.company}</div>}
        <div>{address.address_1}</div>
        {address.address_2 && <div>{address.address_2}</div>}
        <div>
          {formatPostalCode(address.postal_code || "")} {address.city}
        </div>
        {address.country_code &&
          address.country_code.toLowerCase() !== "cz" && (
            <div>{address.country_code.toUpperCase()}</div>
          )}
        {address.phone && <div>{formatPhoneNumber(address.phone)}</div>}
      </div>
      <div className="flex items-end gap-100 pt-100">
        <Button onClick={onEdit} size="sm" variant="secondary">
          Upravit
        </Button>
        <Button
          onClick={() => setIsDeleteDialogOpen(true)}
          size="sm"
          variant="danger"
        >
          Smazat
        </Button>
      </div>

      <ConfirmDialog
        confirmText="Smazat"
        confirmVariant="danger"
        description={`Opravdu chcete smazat adresu "${address.address_1}, ${address.city}"? Tato akce je nevratná.`}
        isLoading={deleteAddress.isPending}
        loadingText="Mažu..."
        onConfirm={handleDelete}
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
        title="Smazat adresu?"
      />
    </div>
  )
}

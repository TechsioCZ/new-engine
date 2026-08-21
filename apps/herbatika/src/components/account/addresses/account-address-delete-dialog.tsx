"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useDeleteCustomerAddress } from "@/lib/storefront/customers"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import type { CustomerAddress } from "./account-address-model"

type AccountAddressDeleteDialogProps = {
  address: CustomerAddress
  onClose: () => void
  onDeleted: (message: string) => void
}

export function AccountAddressDeleteDialog({
  address,
  onClose,
  onDeleted,
}: AccountAddressDeleteDialogProps) {
  const tAuth = useTranslations("auth")
  const deleteAddressMutation = useDeleteCustomerAddress()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const closeDialog = () => {
    if (!deleteAddressMutation.isPending) {
      setDeleteError(null)
      onClose()
    }
  }

  const handleDelete = async () => {
    setDeleteError(null)
    try {
      await deleteAddressMutation.mutateAsync({ addressId: address.id })
      onDeleted(tAuth("account.addresses.deleted"))
      onClose()
    } catch {
      setDeleteError(tAuth("account.addresses.delete_failed"))
    }
  }

  return (
    <Dialog
      actions={
        <>
          <Button
            disabled={deleteAddressMutation.isPending}
            onClick={closeDialog}
            size="sm"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            {tAuth("account.addresses.cancel")}
          </Button>
          <Button
            disabled={deleteAddressMutation.isPending}
            icon="token-icon-trash"
            isLoading={deleteAddressMutation.isPending}
            onClick={() => runDetachedPromise(handleDelete())}
            size="sm"
            type="button"
            variant="danger"
          >
            {tAuth("account.addresses.delete")}
          </Button>
        </>
      }
      className="shadow-md"
      closeOnEscape={!deleteAddressMutation.isPending}
      closeOnInteractOutside={!deleteAddressMutation.isPending}
      customTrigger
      description={tAuth("account.addresses.delete_description")}
      hideCloseButton
      onOpenChange={({ open }) => {
        if (!open) {
          closeDialog()
        }
      }}
      open
      role="alertdialog"
      size="sm"
      title={tAuth("account.addresses.delete_title")}
    >
      {deleteError ? (
        <StatusText align="start" showIcon status="error">
          {deleteError}
        </StatusText>
      ) : null}
    </Dialog>
  )
}

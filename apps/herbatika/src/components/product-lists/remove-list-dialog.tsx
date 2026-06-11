"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { getProductListTitle } from "@/lib/storefront/product-lists"
import type { AccountProductListsController } from "./use-account-product-lists"

type RemoveListDialogProps = {
  accountLists: AccountProductListsController
}

export function RemoveListDialog({ accountLists }: RemoveListDialogProps) {
  return (
    <Dialog
      actions={
        <>
          <Button
            disabled={accountLists.deleteListMutation.isPending}
            onClick={accountLists.closeDeleteListDialog}
            size="sm"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            Zrušiť
          </Button>
          <Button
            disabled={accountLists.deleteListMutation.isPending}
            icon="token-icon-trash"
            isLoading={accountLists.deleteListMutation.isPending}
            onClick={() => {
              runDetachedPromise(accountLists.handleDeleteList())
            }}
            size="sm"
            type="button"
            variant="danger"
          >
            Zmazať zoznam
          </Button>
        </>
      }
      className="shadow-md"
      customTrigger
      description="Zoznam bude odstránený vrátane uložených položiek."
      hideCloseButton
      onOpenChange={({ open }) => {
        if (!open) {
          accountLists.closeDeleteListDialog()
        }
      }}
      open={Boolean(accountLists.deleteList)}
      role="alertdialog"
      size="sm"
      title={`Zmazať zoznam ${
        accountLists.deleteList
          ? getProductListTitle(accountLists.deleteList)
          : ""
      }?`}
    />
  )
}

"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useTranslations } from "next-intl"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { getProductListTitle } from "@/lib/storefront/product-lists"
import type { AccountProductListsController } from "./use-account-product-lists"

type RemoveListDialogProps = {
  accountLists: AccountProductListsController
}

export function RemoveListDialog({ accountLists }: RemoveListDialogProps) {
  const tAuth = useTranslations("auth")
  const deleteListTitle = accountLists.deleteList
    ? getProductListTitle(accountLists.deleteList, {
        favorite: tAuth("product_lists.favorite_title"),
        untitled: tAuth("product_lists.untitled_list"),
      })
    : ""

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
            {tAuth("product_lists.actions.cancel")}
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
            {tAuth("product_lists.actions.delete_list")}
          </Button>
        </>
      }
      className="shadow-md"
      customTrigger
      description={tAuth("product_lists.delete_description")}
      hideCloseButton
      onOpenChange={({ open }) => {
        if (!open) {
          accountLists.closeDeleteListDialog()
        }
      }}
      open={Boolean(accountLists.deleteList)}
      role="alertdialog"
      size="sm"
      title={
        deleteListTitle
          ? tAuth("product_lists.delete_title", {
              listTitle: deleteListTitle,
            })
          : ""
      }
    />
  )
}

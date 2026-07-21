"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Input } from "@techsio/ui-kit/atoms/input"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useTranslations } from "next-intl"
import type { AccountProductListsController } from "./use-account-product-lists"

type AddListDialogProps = {
  accountLists: AccountProductListsController
}

export function AddListDialog({ accountLists }: AddListDialogProps) {
  const tAuth = useTranslations("auth")

  return (
    <Dialog
      actions={
        <>
          <Button
            disabled={accountLists.createListMutation.isPending}
            onClick={accountLists.closeCreateListDialog}
            size="sm"
            theme="outlined"
            variant="secondary"
          >
            {tAuth("product_lists.actions.cancel")}
          </Button>
          <Button
            disabled={accountLists.createListMutation.isPending}
            form="account-product-lists-create-list-form"
            isLoading={accountLists.createListMutation.isPending}
            size="sm"
            type="submit"
            variant="primary"
          >
            {tAuth("product_lists.actions.save")}
          </Button>
        </>
      }
      className="w-sm max-w-full shadow-md"
      customTrigger
      hideCloseButton
      onOpenChange={({ open }) => {
        if (open) {
          accountLists.openCreateListDialog()
          return
        }

        accountLists.closeCreateListDialog()
      }}
      open={accountLists.showCreateListDialog}
      size="sm"
      title={tAuth("product_lists.create_dialog_title")}
    >
      <form
        className="space-y-300"
        id="account-product-lists-create-list-form"
        onSubmit={accountLists.handleCreateList}
      >
        <div>
          <label
            className="sr-only"
            htmlFor="account-product-lists-new-list-title"
          >
            {tAuth("product_lists.new_list_name")}
          </label>
          <Input
            aria-label={tAuth("product_lists.new_list_name")}
            autoFocus
            disabled={accountLists.createListMutation.isPending}
            id="account-product-lists-new-list-title"
            name="product-list-title"
            onChange={(event) => {
              accountLists.setNewListTitle(event.target.value)
            }}
            placeholder={tAuth("product_lists.new_list_placeholder")}
            size="sm"
            value={accountLists.newListTitle}
          />
        </div>
      </form>
    </Dialog>
  )
}

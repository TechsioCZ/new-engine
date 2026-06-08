"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Input } from "@techsio/ui-kit/atoms/input";
import { Dialog } from "@techsio/ui-kit/molecules/dialog";
import type { AccountProductListsController } from "./use-account-product-lists";

type AddListDialogProps = {
  accountLists: AccountProductListsController;
};

export function AddListDialog({ accountLists }: AddListDialogProps) {
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
            Zrušiť
          </Button>
          <Button
            disabled={accountLists.createListMutation.isPending}
            form="account-product-lists-create-list-form"
            isLoading={accountLists.createListMutation.isPending}
            size="sm"
            type="submit"
            variant="primary"
          >
            Uložiť
          </Button>
        </>
      }
      className="shadow-md max-w-full w-sm"
      customTrigger
      hideCloseButton
      onOpenChange={({ open }) => {
        if (open) {
          accountLists.openCreateListDialog();
          return;
        }

        accountLists.closeCreateListDialog();
      }}
      open={accountLists.showCreateListDialog}
      size="sm"
      title="Ako sa má zoznam volať?"
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
            Názov nového zoznamu
          </label>
          <Input
            aria-label="Názov nového zoznamu"
            autoFocus
            disabled={accountLists.createListMutation.isPending}
            id="account-product-lists-new-list-title"
            name="product-list-title"
            onChange={(event) => {
              accountLists.setNewListTitle(event.target.value);
            }}
            placeholder="Názov zoznamu"
            size="sm"
            value={accountLists.newListTitle}
          />
        </div>
      </form>
    </Dialog>
  );
}

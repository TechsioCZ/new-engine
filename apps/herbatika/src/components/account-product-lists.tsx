"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Input } from "@techsio/ui-kit/atoms/input";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { Dialog } from "@techsio/ui-kit/molecules/dialog";
import { Tabs } from "@techsio/ui-kit/molecules/tabs";
import NextLink from "next/link";
import { Fragment } from "react";
import { AccountSurface } from "@/components/account/account-surface";
import { AccountProductListItemRow } from "@/components/product-lists/account-product-list-item-row";
import { useAccountProductLists } from "@/components/product-lists/use-account-product-lists";
import {
  findProductListItem,
  getProductListItemCount,
  getProductListTitle,
  isFavoriteProductList,
} from "@/lib/storefront/product-lists";

export function AccountProductLists() {
  const accountLists = useAccountProductLists();

  if (accountLists.listsQuery.isLoading) {
    return (
      <AccountSurface>
        <Skeleton>
          <Skeleton.Text noOfLines={6} />
        </Skeleton>
      </AccountSurface>
    );
  }

  if (accountLists.listsQuery.error) {
    return (
      <AccountSurface className="space-y-400">
        <Button
          onClick={() => void accountLists.listsQuery.query.refetch()}
          variant="secondary"
        >
          Skúsiť znova
        </Button>
      </AccountSurface>
    );
  }

  return (
    <AccountSurface className="space-y-500">
      <header className="flex flex-col gap-300 md:flex-row md:items-end md:justify-between">
        <div className="space-y-150">
          <h2 className="text-xl font-semibold">Zoznamy produktov</h2>
          <p className="text-fg-secondary text-sm">
            Uložené produkty a vlastné nákupné zoznamy.
          </p>
        </div>
      </header>

      <Dialog
        actions={
          <>
            <Button
              disabled={accountLists.createListMutation.isPending}
              onClick={accountLists.closeCreateListDialog}
              size="sm"
              theme="outlined"
              type="button"
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
        customTrigger
        onOpenChange={({ open }) => {
          if (open) {
            accountLists.openCreateListDialog();
            return;
          }

          accountLists.closeCreateListDialog();
        }}
        open={accountLists.showCreateListDialog}
        size="sm"
        hideCloseButton
        title="Ako sa má zoznam volať?"
        className="shadow-md"
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
                accountLists.setStatusError(null);
              }}
              placeholder="Názov zoznamu"
              size="sm"
              value={accountLists.newListTitle}
            />
          </div>
        </form>
      </Dialog>

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
              onClick={() => void accountLists.handleDeleteList()}
              size="sm"
              type="button"
              variant="danger"
            >
              Zmazať zoznam
            </Button>
          </>
        }
        customTrigger
        description="Zoznam bude odstránený vrátane uložených položiek."
        onOpenChange={({ open }) => {
          if (!open) {
            accountLists.closeDeleteListDialog();
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
        hideCloseButton
        className="shadow-md"
      />

      {accountLists.sortedLists.length === 0 ? (
        <div className="space-y-300 rounded-md border border-border-secondary bg-base p-400">
          <p className="text-fg-secondary text-sm">
            Zatiaľ nemáte žiadny zoznam produktov.
          </p>
          <div className="flex flex-wrap items-center gap-200">
            <Button
              icon="token-icon-plus"
              onClick={accountLists.openCreateListDialog}
              size="sm"
              type="button"
              variant="secondary"
            >
              Nový zoznam
            </Button>
            <LinkButton as={NextLink} href="/" size="sm" variant="secondary">
              Prejsť na produkty
            </LinkButton>
          </div>
        </div>
      ) : (
        <Tabs
          onValueChange={accountLists.selectList}
          size="sm"
          value={accountLists.activeListId ?? accountLists.sortedLists[0]?.id}
          variant="line"
        >
          <div className="flex items-center gap-100 overflow-x-auto">
            <Tabs.List className="min-w-max">
              {accountLists.sortedLists.map((list) => {
                const listTitle = getProductListTitle(list);
                const canDeleteList = !isFavoriteProductList(list);

                return (
                  <Fragment key={list.id}>
                    <Tabs.Trigger value={list.id}>
                      {`${listTitle} (${getProductListItemCount(list)})`}
                    </Tabs.Trigger>
                    {canDeleteList ? (
                      <Button
                        aria-label={`Zmazať zoznam ${listTitle}`}
                        disabled={accountLists.deleteListMutation.isPending}
                        icon="token-icon-close"
                        onClick={() =>
                          accountLists.openDeleteListDialog(list.id)
                        }
                        size="sm"
                        theme="borderless"
                        type="button"
                        variant="danger"
                      />
                    ) : null}
                  </Fragment>
                );
              })}
              <Tabs.Indicator />
            </Tabs.List>
            <Button
              aria-label="Vytvoriť nový zoznam"
              disabled={accountLists.createListMutation.isPending}
              icon="token-icon-plus"
              onClick={accountLists.openCreateListDialog}
              size="sm"
              theme="borderless"
              type="button"
              variant="secondary"
            />
          </div>

          {accountLists.sortedLists.map((list) => (
            <Tabs.Content key={list.id} value={list.id}>
              {list.id === accountLists.activeListId ? (
                <div className="space-y-400">
                  {accountLists.activeListQuery.isLoading ? (
                    <Skeleton>
                      <Skeleton.Text noOfLines={5} />
                    </Skeleton>
                  ) : accountLists.activeListQuery.error ? null : accountLists
                      .activeItems.length === 0 ? (
                    <div className="rounded-md border border-border-secondary bg-base p-400">
                      <p className="text-fg-secondary text-sm">
                        Tento zoznam je zatiaľ prázdny.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-250">
                      {accountLists.activeItems.map((item) => {
                        const productId = item.product_id ?? item.product?.id;
                        const variantId = item.variant_id ?? item.variant?.id;
                        const product = productId
                          ? (accountLists.productsById.get(productId) ?? null)
                          : (item.product ?? null);
                        const existingItem =
                          productId && accountLists.activeList
                            ? findProductListItem(
                                accountLists.activeList,
                                productId,
                                variantId,
                              )
                            : item;

                        return (
                          <AccountProductListItemRow
                            canChangeQuantity={
                              accountLists.activeListSupportsQuantity
                            }
                            isAddingToCart={
                              accountLists.activeProductId === product?.id
                            }
                            isDeleting={
                              accountLists.activeDeleteItemId ===
                              existingItem?.id
                            }
                            isSettingQuantity={
                              accountLists.activeQuantitySetItemId ===
                              existingItem?.id
                            }
                            item={existingItem ?? item}
                            key={item.id}
                            onAddToCart={accountLists.handleAddToCart}
                            onDelete={accountLists.handleDeleteItem}
                            onQuantitySet={accountLists.handleQuantitySet}
                            product={product}
                          />
                        );
                      })}
                      <div className="border-border-secondary border-t pt-300">
                        <div className="ml-auto w-full space-y-200 sm:max-w-sm">
                          <div className="space-y-100 text-sm">
                            <div className="flex items-center justify-between gap-300">
                              <span className="text-fg-secondary">
                                Celkom bez DPH
                              </span>
                              <span className="font-medium">
                                {
                                  accountLists.activeListPriceSummary
                                    .totalWithoutTaxLabel
                                }
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-300">
                              <span className="font-semibold">
                                Celkom s DPH
                              </span>
                              <span className="font-bold text-lg text-primary">
                                {
                                  accountLists.activeListPriceSummary
                                    .totalWithTaxLabel
                                }
                              </span>
                            </div>
                          </div>
                          <Button
                            block
                            disabled={
                              !accountLists.activeListCanCreateCart ||
                              accountLists.createListCartMutation.isPending
                            }
                            icon="token-icon-cart"
                            isLoading={
                              accountLists.createListCartMutation.isPending
                            }
                            loadingText="Pridávam"
                            onClick={() =>
                              void accountLists.handleAddListToCart()
                            }
                            size="sm"
                            type="button"
                            variant="primary"
                          >
                            Pridať všetko do košíka
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </Tabs.Content>
          ))}
        </Tabs>
      )}
    </AccountSurface>
  );
}

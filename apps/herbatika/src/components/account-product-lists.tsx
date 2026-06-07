"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Input } from "@techsio/ui-kit/atoms/input";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { Tabs } from "@techsio/ui-kit/molecules/tabs";
import NextLink from "next/link";
import { AccountSurface } from "@/components/account/account-surface";
import { AccountProductListItemRow } from "@/components/product-lists/account-product-list-item-row";
import { useAccountProductLists } from "@/components/product-lists/use-account-product-lists";
import {
  findProductListItem,
  getProductListItemCount,
  getProductListTitle,
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
        <StatusText showIcon status="error">
          {accountLists.listsQuery.error}
        </StatusText>
        <Button
          onClick={() => void accountLists.listsQuery.query.refetch()}
          variant="secondary"
        >
          Skúsit znova
        </Button>
      </AccountSurface>
    );
  }

  return (
    <AccountSurface className="space-y-500">
      <header className="flex flex-col gap-300 md:flex-row md:items-end md:justify-between">
        <div className="space-y-150">
          <h2 className="text-xl font-semibold">Seznamy produktů</h2>
          <p className="text-fg-secondary text-sm">
            Uložené produkty a vlastní nákupní seznamy.
          </p>
        </div>

        {accountLists.showCreateForm ? (
          <form
            className="flex w-full items-center gap-200 md:w-950"
            onSubmit={accountLists.handleCreateList}
          >
            <label
              className="sr-only"
              htmlFor="account-product-lists-new-list-title"
            >
              Název nového seznamu
            </label>
            <Input
              aria-label="Název nového seznamu"
              autoFocus
              disabled={accountLists.createListMutation.isPending}
              id="account-product-lists-new-list-title"
              name="product-list-title"
              onChange={(event) => {
                accountLists.setNewListTitle(event.target.value);
                accountLists.setStatusError(null);
              }}
              placeholder="Název seznamu"
              size="sm"
              value={accountLists.newListTitle}
            />
            <Button
              disabled={accountLists.createListMutation.isPending}
              isLoading={accountLists.createListMutation.isPending}
              size="sm"
              type="submit"
              variant="primary"
            >
              OK
            </Button>
          </form>
        ) : (
          <Button
            icon="token-icon-plus"
            onClick={() => {
              accountLists.setShowCreateForm(true);
              accountLists.setStatusError(null);
              accountLists.setStatusMessage(null);
            }}
            size="sm"
            variant="secondary"
          >
            Nový seznam
          </Button>
        )}
      </header>

      {accountLists.statusError ? (
        <StatusText showIcon status="error">
          {accountLists.statusError}
        </StatusText>
      ) : null}

      {accountLists.statusMessage ? (
        <StatusText aria-live="polite" showIcon status="success">
          {accountLists.statusMessage}
        </StatusText>
      ) : null}

      {accountLists.sortedLists.length === 0 ? (
        <div className="space-y-300 rounded-md border border-border-secondary bg-base p-400">
          <p className="text-fg-secondary text-sm">
            Zatím nemáte žádný seznam produktů.
          </p>
          <LinkButton as={NextLink} href="/" size="sm" variant="secondary">
            Přejít na produkty
          </LinkButton>
        </div>
      ) : (
        <Tabs
          onValueChange={accountLists.selectList}
          size="sm"
          value={accountLists.activeListId ?? accountLists.sortedLists[0]?.id}
          variant="line"
        >
          <div className="overflow-x-auto">
            <Tabs.List className="min-w-max">
              {accountLists.sortedLists.map((list) => (
                <Tabs.Trigger key={list.id} value={list.id}>
                  {`${getProductListTitle(list)} (${getProductListItemCount(
                    list,
                  )})`}
                </Tabs.Trigger>
              ))}
              <Tabs.Indicator />
            </Tabs.List>
          </div>

          {accountLists.sortedLists.map((list) => (
            <Tabs.Content key={list.id} value={list.id}>
              {list.id === accountLists.activeListId ? (
                <div className="space-y-400">
                  {accountLists.activeListQuery.isLoading ? (
                    <Skeleton>
                      <Skeleton.Text noOfLines={5} />
                    </Skeleton>
                  ) : accountLists.activeListQuery.error ? (
                    <StatusText showIcon status="error">
                      {accountLists.activeListQuery.error}
                    </StatusText>
                  ) : accountLists.activeItems.length === 0 ? (
                    <div className="rounded-md border border-border-secondary bg-base p-400">
                      <p className="text-fg-secondary text-sm">
                        Tento seznam je zatím prázdný.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-250">
                      {accountLists.activeItems.map((item) => {
                        const productId = item.product_id ?? item.product?.id;
                        const variantId = item.variant_id ?? item.variant?.id;
                        const product = productId
                          ? accountLists.productsById.get(productId) ?? null
                          : item.product ?? null;
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
                            canIncrement={accountLists.activeListSupportsQuantity}
                            isAddingToCart={
                              accountLists.activeProductId === product?.id
                            }
                            isIncrementing={
                              accountLists.activeIncrementItemId ===
                              existingItem?.id
                            }
                            item={existingItem ?? item}
                            key={item.id}
                            onAddToCart={accountLists.handleAddToCart}
                            onIncrement={accountLists.handleIncrement}
                            product={product}
                          />
                        );
                      })}
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

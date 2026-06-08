"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { Tabs } from "@techsio/ui-kit/molecules/tabs";
import { Fragment } from "react";
import { AccountProductListItemRow } from "@/components/product-lists/account-product-list-item-row";
import {
  findProductListItem,
  getProductListItemCount,
  getProductListTitle,
  isFavoriteProductList,
} from "@/lib/storefront/product-lists";
import type { AccountProductListsController } from "./use-account-product-lists";

type ProductListTabsProps = {
  accountLists: AccountProductListsController;
};

function ProductListEmptyPanel() {
  return (
    <div className="rounded-md border border-border-secondary bg-base p-400">
      <p className="text-fg-secondary text-sm">
        Tento zoznam je zatiaľ prázdny.
      </p>
    </div>
  );
}

function ProductListSummary({
  accountLists,
}: {
  accountLists: AccountProductListsController;
}) {
  return (
    <div className="pt-300">
      <div className="ml-auto w-full space-y-200 sm:max-w-sm">
        <div className="space-y-100 text-sm">
          <div className="flex items-center justify-between gap-300">
            <span className="text-fg-secondary">Celkom bez DPH</span>
            <span className="font-medium">
              {accountLists.activeListPriceSummary.totalWithoutTaxLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-300">
            <span className="font-semibold">Celkom s DPH</span>
            <span className="font-bold text-lg">
              {accountLists.activeListPriceSummary.totalWithTaxLabel}
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
          isLoading={accountLists.createListCartMutation.isPending}
          loadingText="Pridávam"
          onClick={() => void accountLists.handleAddListToCart()}
          size="sm"
          type="button"
          variant="primary"
        >
          Pridať všetko do košíka
        </Button>
      </div>
    </div>
  );
}

function ProductListActiveContent({
  accountLists,
}: {
  accountLists: AccountProductListsController;
}) {
  if (accountLists.activeListQuery.isLoading) {
    return (
      <Skeleton>
        <Skeleton.Text noOfLines={5} />
      </Skeleton>
    );
  }

  if (accountLists.activeListQuery.error) {
    return null;
  }

  if (accountLists.activeItems.length === 0) {
    return <ProductListEmptyPanel />;
  }

  return (
    <div className="space-y-250">
      {accountLists.activeItems.map((item) => {
        const productId = item.product_id ?? item.product?.id;
        const variantId = item.variant_id ?? item.variant?.id;
        const product = productId
          ? (accountLists.productsById.get(productId) ?? null)
          : (item.product ?? null);
        const existingItem =
          productId && accountLists.activeList
            ? findProductListItem(accountLists.activeList, productId, variantId)
            : item;

        return (
          <AccountProductListItemRow
            canChangeQuantity={accountLists.activeListSupportsQuantity}
            isAddingToCart={accountLists.activeProductId === product?.id}
            isDeleting={accountLists.activeDeleteItemId === existingItem?.id}
            isSettingQuantity={
              accountLists.activeQuantitySetItemId === existingItem?.id
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
      <ProductListSummary accountLists={accountLists} />
    </div>
  );
}

export function ProductListTabs({ accountLists }: ProductListTabsProps) {
  return (
    <Tabs
      onValueChange={accountLists.selectList}
      size="sm"
      value={accountLists.activeListId ?? accountLists.sortedLists[0]?.id}
      variant="line"
      className="p-200"
    >
      <div className="flex items-center gap-100 overflow-x-auto">
        <Tabs.List className="min-w-max bg-base border-product-list-tabs-border">
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
                    onClick={() => accountLists.openDeleteListDialog(list.id)}
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
              <ProductListActiveContent accountLists={accountLists} />
            </div>
          ) : null}
        </Tabs.Content>
      ))}
    </Tabs>
  );
}

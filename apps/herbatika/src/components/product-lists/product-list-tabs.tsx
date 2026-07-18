"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { Tabs } from "@techsio/ui-kit/molecules/tabs"
import { useTranslations } from "next-intl"
import { Fragment } from "react"
import { AccountProductListItemRow } from "@/components/product-lists/account-product-list-item-row"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import {
  findProductListItem,
  getProductListItemCount,
  getProductListTitle,
  isFavoriteProductList,
} from "@/lib/storefront/product-lists"
import type { AccountProductListsController } from "./use-account-product-lists"

type ProductListTabsProps = {
  accountLists: AccountProductListsController
}

function ProductListEmptyPanel() {
  const tAuth = useTranslations("auth")

  return (
    <div className="rounded-md border border-border-secondary bg-base p-400">
      <p className="text-fg-secondary text-sm">
        {tAuth("product_lists.list_empty")}
      </p>
    </div>
  )
}

function ProductListItemsSkeleton() {
  const tAuth = useTranslations("auth")
  const rows = [0, 1, 2] as const

  return (
    <Skeleton aria-label={tAuth("product_lists.loading_items_aria")}>
      <div className="space-y-250">
        {rows.map((row) => (
          <article
            className="flex flex-col gap-300 border-border-secondary border-b bg-base p-300 md:flex-row md:items-center"
            key={row}
          >
            <Skeleton.Rectangle className="h-850 w-850 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-150">
              <Skeleton.Text
                containerClassName="max-w-md"
                lastLineWidth="55%"
                noOfLines={2}
                size="sm"
              />
              <Skeleton.Rectangle className="h-500 w-32 rounded-md" />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-300">
              <Skeleton.Rectangle className="h-600 w-20 rounded-md" />
              <Skeleton.Rectangle className="h-600 w-28 rounded-md" />
              <Skeleton.Rectangle className="h-600 w-600 rounded-md" />
            </div>
          </article>
        ))}
        <div className="pt-300">
          <div className="ml-auto w-full space-y-200 sm:max-w-sm">
            <Skeleton.Text noOfLines={2} size="sm" />
            <Skeleton.Rectangle className="h-600 rounded-md" />
          </div>
        </div>
      </div>
    </Skeleton>
  )
}

function ProductListSummary({
  accountLists,
}: {
  accountLists: AccountProductListsController
}) {
  const tAuth = useTranslations("auth")
  const tCart = useTranslations("cart")
  const availabilitySummary = accountLists.activeListAvailabilitySummary
  const isAddingListToCart =
    accountLists.createListCartMutation.isPending ||
    accountLists.isAddingListToCart
  const addToCartLabel = availabilitySummary.canAddWholeList
    ? tAuth("product_lists.availability.add_all")
    : availabilitySummary.canAddAnyToCart
      ? tAuth("product_lists.availability.add_available")
      : tAuth("product_lists.availability.none_available")
  const unavailablePriceLabel = tAuth("product_lists.price_unavailable")

  return (
    <div className="pt-300">
      <div className="ml-auto w-full space-y-200 sm:max-w-sm">
        <div className="space-y-100 text-sm">
          <div className="flex items-center justify-between gap-300">
            <span className="text-fg-secondary">
              {tCart("products_subtotal_excl_tax")}
            </span>
            <span className="font-medium">
              {accountLists.activeListPriceSummary.totalWithoutTaxLabel ??
                unavailablePriceLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-300">
            <span className="font-semibold">{tCart("total_incl_tax")}</span>
            <span className="font-bold text-lg">
              {accountLists.activeListPriceSummary.totalWithTaxLabel ??
                unavailablePriceLabel}
            </span>
          </div>
        </div>
        <Button
          block
          disabled={!accountLists.activeListCanCreateCart || isAddingListToCart}
          icon="token-icon-cart"
          isLoading={isAddingListToCart}
          loadingText={tCart("adding_to_cart")}
          onClick={() => {
            runDetachedPromise(accountLists.handleAddListToCart())
          }}
          size="sm"
          type="button"
          variant="primary"
        >
          {addToCartLabel}
        </Button>
      </div>
    </div>
  )
}

function ProductListActiveContent({
  accountLists,
}: {
  accountLists: AccountProductListsController
}) {
  const tAuth = useTranslations("auth")

  if (accountLists.activeListQuery.isLoading) {
    return <ProductListItemsSkeleton />
  }

  if (accountLists.activeListQuery.error) {
    return (
      <div className="space-y-300 rounded-md border border-border-secondary p-400">
        <p className="text-danger text-sm">
          {tAuth("product_lists.errors.list_load_failed")}
        </p>
        <Button
          onClick={() => {
            runDetachedPromise(accountLists.activeListQuery.query.refetch())
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          {tAuth("product_lists.retry")}
        </Button>
      </div>
    )
  }

  if (accountLists.activeProductsAreLoading) {
    return <ProductListItemsSkeleton />
  }

  if (accountLists.activeItems.length === 0) {
    return <ProductListEmptyPanel />
  }

  return (
    <div className="space-y-250">
      {accountLists.activeItems.map((item) => {
        const productId = item.product_id ?? item.product?.id
        const variantId = item.variant_id ?? item.variant?.id
        const product = productId
          ? (accountLists.productsById.get(productId) ?? null)
          : (item.product ?? null)
        const existingItem =
          productId && accountLists.activeList
            ? findProductListItem(accountLists.activeList, productId, variantId)
            : item

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
        )
      })}
      <ProductListSummary accountLists={accountLists} />
    </div>
  )
}

export function ProductListTabs({ accountLists }: ProductListTabsProps) {
  const tAuth = useTranslations("auth")
  const titleLabels = {
    favorite: tAuth("product_lists.favorite_title"),
    untitled: tAuth("product_lists.untitled_list"),
  }

  return (
    <Tabs
      onValueChange={accountLists.selectList}
      size="sm"
      value={accountLists.activeListId ?? accountLists.sortedLists[0]?.id}
      variant="line"
    >
      <div className="flex items-center gap-100 overflow-x-auto">
        <Tabs.List className="min-w-max border-product-list-tabs-border bg-base">
          {accountLists.sortedLists.map((list) => {
            const listTitle = getProductListTitle(list, titleLabels)
            const canDeleteList = !isFavoriteProductList(list)

            return (
              <Fragment key={list.id}>
                <Tabs.Trigger className="px-200 py-200" value={list.id}>
                  {`${listTitle} (${getProductListItemCount(list)})`}
                </Tabs.Trigger>
                {canDeleteList ? (
                  <Button
                    aria-label={tAuth("product_lists.delete_list_aria", {
                      listTitle,
                    })}
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
            )
          })}
          <Tabs.Indicator />
        </Tabs.List>
        <Button
          aria-label={tAuth("product_lists.create_list_aria")}
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
  )
}

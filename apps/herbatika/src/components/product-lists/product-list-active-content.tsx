"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useTranslations } from "next-intl"

import { AccountProductListItemRow } from "@/components/product-lists/account-product-list-item-row"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { findProductListItem } from "@/lib/storefront/product-lists"

import { ProductListItemsSkeleton } from "./product-list-items-skeleton"
import { ProductListSummary } from "./product-list-summary"
import type { AccountProductListsController } from "./use-account-product-lists"

const ProductListEmptyPanel = () => {
  const tAuth = useTranslations("auth")

  return (
    <div className="rounded-md border border-border-secondary bg-base p-400">
      <p className="text-fg-secondary text-sm">
        {tAuth("product_lists.list_empty")}
      </p>
    </div>
  )
}

export const ProductListActiveContent = ({
  accountLists,
}: {
  accountLists: AccountProductListsController
}) => {
  const tAuth = useTranslations("auth")

  if (accountLists.activeListQuery.isLoading) {
    return <ProductListItemsSkeleton />
  }
  if (accountLists.activeListQuery.error !== null) {
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
        let product = item.product ?? null
        let existingItem = item
        if (productId !== undefined && productId !== "") {
          product = accountLists.productsById.get(productId) ?? null
          if (accountLists.activeList !== null) {
            existingItem =
              findProductListItem(
                accountLists.activeList,
                productId,
                variantId,
              ) ?? item
          }
        }

        return (
          <AccountProductListItemRow
            state={{
              canChangeQuantity: accountLists.activeListSupportsQuantity,
              isAddingToCart: accountLists.activeProductId === product?.id,
              isDeleting: accountLists.activeDeleteItemId === existingItem?.id,
              isSettingQuantity:
                accountLists.activeQuantitySetItemId === existingItem?.id,
            }}
            item={existingItem}
            key={item.id}
            onAddToCart={(nextItem, nextProduct) => {
              runDetachedPromise(
                accountLists.handleAddToCart(nextItem, nextProduct),
              )
            }}
            onDelete={(nextItem) => {
              runDetachedPromise(accountLists.handleDeleteItem(nextItem))
            }}
            onQuantitySet={(nextItem, quantity) => {
              runDetachedPromise(
                accountLists.handleQuantitySet(nextItem, quantity),
              )
            }}
            product={product}
          />
        )
      })}
      <ProductListSummary accountLists={accountLists} />
    </div>
  )
}

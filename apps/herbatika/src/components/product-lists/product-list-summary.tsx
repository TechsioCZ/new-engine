"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useTranslations } from "next-intl"

import { runDetachedPromise } from "@/lib/storefront/detached-promise"

import type { AccountProductListsController } from "./use-account-product-lists"

export const ProductListSummary = ({
  accountLists,
}: {
  accountLists: AccountProductListsController
}) => {
  const tAuth = useTranslations("auth")
  const tCart = useTranslations("cart")
  const availabilitySummary = accountLists.activeListAvailabilitySummary
  const isAddingListToCart =
    accountLists.createListCartMutation.isPending ||
    accountLists.isAddingListToCart
  let addToCartLabel = tAuth("product_lists.availability.none_available")
  if (availabilitySummary.canAddWholeList) {
    addToCartLabel = tAuth("product_lists.availability.add_all")
  } else if (availabilitySummary.canAddAnyToCart) {
    addToCartLabel = tAuth("product_lists.availability.add_available")
  }
  const unavailablePriceLabel = tAuth("product_lists.price_unavailable")

  return (
    <div className="pt-300">
      <div className="ml-auto w-full space-y-200 sm:max-w-product-list-summary">
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

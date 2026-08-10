"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Input } from "@techsio/ui-kit/atoms/input"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"

import { ProductListPickerListRow } from "./product-list-picker-list-row"
import type { ProductListPickerController } from "./use-product-list-picker"

export const ProductListPickerContent = ({
  picker,
}: {
  picker: ProductListPickerController
}) => {
  const tAuth = useTranslations("auth")

  if (!picker.authQuery.isAuthenticated) {
    return (
      <div className="space-y-300 px-350 py-350">
        <p className="text-fg-secondary text-sm">
          {tAuth("product_lists.picker.auth_required")}
        </p>
        <LinkButton
          as={NextLink}
          block
          href={picker.loginHref}
          size="sm"
          variant="primary"
        >
          {tAuth("sign_in")}
        </LinkButton>
      </div>
    )
  }

  if (picker.listsQuery.isLoading || picker.detailsAreLoading) {
    return (
      <div className="space-y-250 px-350 py-350">
        <Skeleton>
          <Skeleton.Text noOfLines={3} />
        </Skeleton>
      </div>
    )
  }

  if (picker.listsQuery.error !== null || picker.detailsHaveError) {
    return (
      <div className="space-y-300 px-350 py-350">
        <p className="text-danger text-sm">
          {tAuth("product_lists.errors.lists_load_failed")}
        </p>
        <Button
          block
          onClick={() => {
            runDetachedPromise(picker.retryLists())
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

  return (
    <>
      <div className="divide-y divide-border-secondary">
        {picker.rows.map((row) => (
          <ProductListPickerListRow
            isMutating={picker.isMutating}
            isPending={picker.isMutating && picker.activeListKey === row.key}
            key={row.key}
            onAdd={(nextRow) => {
              runDetachedPromise(picker.addProductToList(nextRow))
            }}
            row={row}
          />
        ))}
      </div>

      <div className="border-border-secondary border-t px-350 py-250">
        {picker.showNewListInput ? (
          <form
            className="flex items-center gap-200"
            onSubmit={(event) => {
              runDetachedPromise(picker.handleCreateList(event))
            }}
          >
            <label
              className="sr-only"
              htmlFor="product-list-picker-new-list-title"
            >
              {tAuth("product_lists.new_list_name")}
            </label>
            <Input
              aria-label={tAuth("product_lists.new_list_name")}
              autoFocus
              disabled={picker.isMutating}
              id="product-list-picker-new-list-title"
              name="product-list-title"
              onChange={(event) => {
                picker.setNewListTitle(event.target.value)
              }}
              placeholder={tAuth("product_lists.new_list_placeholder")}
              size="sm"
              value={picker.newListTitle}
            />
            <Button
              disabled={picker.isMutating}
              isLoading={picker.activeListKey === "new-list"}
              size="sm"
              theme="borderless"
              type="submit"
              variant="primary"
            >
              {tAuth("product_lists.actions.confirm")}
            </Button>
          </form>
        ) : (
          <Button
            disabled={picker.isMutating}
            icon="token-icon-plus"
            iconSize="md"
            onClick={() => {
              picker.setShowNewListInput(true)
            }}
            size="sm"
            theme="borderless"
            variant="primary"
          >
            {tAuth("product_lists.new_list")}
          </Button>
        )}
      </div>
    </>
  )
}

"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"
import { Input } from "@techsio/ui-kit/atoms/input"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { Popover } from "@techsio/ui-kit/molecules/popover"
import NextLink from "next/link"
import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import type { Product } from "@/components/product-detail/product-detail.types"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import {
  type ProductListPickerRow,
  useProductListPicker,
} from "./use-product-list-picker"

type ProductListPickerPopoverProps = {
  product: Product
  quantity: number
  selectedVariantId: string | null
}

type ProductListPickerListRowProps = {
  isMutating: boolean
  isPending: boolean
  onAdd: (row: ProductListPickerRow) => void
  row: ProductListPickerRow
}

function ProductListPickerListRow({
  isMutating,
  isPending,
  onAdd,
  row,
}: ProductListPickerListRowProps) {
  const tAuth = useTranslations("auth")

  return (
    <div className="flex items-center gap-200 px-350 py-250">
      <Checkbox
        aria-label={
          row.checked
            ? tAuth("product_lists.picker.contains_product_aria", {
                listTitle: row.title,
              })
            : tAuth("product_lists.picker.add_to_list_aria", {
                listTitle: row.title,
              })
        }
        checked={row.checked}
        disabled={isMutating}
        onChange={() => {
          if (!row.checked) {
            onAdd(row)
          }
        }}
      />
      <span className="min-w-0 flex-1 truncate text-sm">{row.title}</span>
      <span className="text-fg-tertiary text-xs">{row.count}</span>
      {row.list?.id ? (
        <LinkButton
          aria-label={tAuth("product_lists.picker.open_list_aria", {
            listTitle: row.title,
          })}
          as={NextLink}
          className="h-500 w-500 p-0"
          href={`/account/lists?list=${encodeURIComponent(row.list.id)}`}
          icon="token-icon-chevron-right"
          iconSize="sm"
          size="current"
          theme="unstyled"
          variant="secondary"
        />
      ) : (
        <span className="h-500 w-500" />
      )}
      {isPending ? (
        <span className="sr-only">
          {tAuth("product_lists.picker.adding_product")}
        </span>
      ) : null}
    </div>
  )
}

export function ProductListPickerPopover({
  product,
  quantity,
  selectedVariantId,
}: ProductListPickerPopoverProps) {
  const tAuth = useTranslations("auth")
  const picker = useProductListPicker({
    product,
    quantity,
    selectedVariantId,
  })
  let pickerContent: ReactNode

  if (!picker.authQuery.isAuthenticated) {
    pickerContent = (
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
  } else if (picker.listsQuery.isLoading || picker.detailsAreLoading) {
    pickerContent = (
      <div className="space-y-250 px-350 py-350">
        <Skeleton>
          <Skeleton.Text noOfLines={3} />
        </Skeleton>
      </div>
    )
  } else if (picker.listsQuery.error || picker.detailsHaveError) {
    pickerContent = (
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
  } else {
    pickerContent = (
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
              onSubmit={picker.handleCreateList}
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

  return (
    <Popover.Root
      border
      gutter={10}
      id="product-list-picker"
      onOpenChange={({ open }) => picker.setIsOpen(open)}
      open={picker.isOpen}
      portalled={false}
      size="sm"
    >
      <Popover.Trigger
        aria-label={tAuth("product_lists.picker.trigger_aria")}
        className="h-750 min-h-750 w-750 min-w-750 p-0 text-fg-secondary hover:bg-transparent hover:text-fg-primary hover:text-primary sm:h-600 sm:min-h-600 sm:w-600 sm:min-w-600"
        icon="token-icon-heart"
        iconSize="2xl"
        size="sm"
        theme="borderless"
        variant="secondary"
      />

      <Popover.Positioner>
        <Popover.Content className="w-950 max-w-full p-0">
          <Popover.Arrow />
          <div className="border-border-secondary border-b px-350 py-300">
            <Popover.Title className="mb-0 text-sm">
              {tAuth("product_lists.picker.title")}
            </Popover.Title>
          </div>

          {pickerContent}
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  )
}

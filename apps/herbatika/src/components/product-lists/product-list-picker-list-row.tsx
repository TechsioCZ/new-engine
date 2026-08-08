"use client"

import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { useTranslations } from "next-intl"

import NextLink from "@/components/app-link"

import type { ProductListPickerRow } from "./product-list-picker-rows"

interface ProductListPickerListRowProps {
  isMutating: boolean
  isPending: boolean
  onAdd: (row: ProductListPickerRow) => void
  row: ProductListPickerRow
}

export const ProductListPickerListRow = ({
  isMutating,
  isPending,
  onAdd,
  row,
}: ProductListPickerListRowProps) => {
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
      {row.list?.id !== undefined && row.list.id !== "" ? (
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

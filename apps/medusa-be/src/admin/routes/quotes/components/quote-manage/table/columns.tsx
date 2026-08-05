import type { HttpTypes } from "@medusajs/types"
import { Checkbox } from "@medusajs/ui"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { ProductCell, ProductHeader } from "../../../../../components"

const columnHelper = createColumnHelper<HttpTypes.AdminProductVariant>()

export const useManageItemsTableColumns = (_currencyCode: string) => {
  const { t } = useTranslation("quotes")

  return useMemo(
    () => [
      columnHelper.display({
        cell: ({ row }) => {
          const isSelectable = row.getCanSelect()

          return (
            <Checkbox
              checked={row.getIsSelected()}
              disabled={!isSelectable}
              onCheckedChange={(value) => {
                row.toggleSelected(!!value)
              }}
              onClick={(e) => {
                e.stopPropagation()
              }}
            />
          )
        },
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value)
            }}
          />
        ),
        id: "select",
      }),
      columnHelper.display({
        cell: ({ row }) =>
          row.original.product ? (
            <ProductCell product={row.original.product} />
          ) : (
            "-"
          ),
        header: () => <ProductHeader />,
        id: "product",
      }),
      columnHelper.accessor("sku", {
        cell: ({ getValue }) => getValue() || "-",
        header: t("fields.sku"),
      }),
      columnHelper.accessor("title", {
        header: t("fields.title"),
      }),
    ],
    [t],
  )
}

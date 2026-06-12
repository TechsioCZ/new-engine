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
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
          />
        ),
        cell: ({ row }) => {
          const isSelectable = row.getCanSelect()

          return (
            <Checkbox
              checked={row.getIsSelected()}
              disabled={!isSelectable}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              onClick={(e) => {
                e.stopPropagation()
              }}
            />
          )
        },
      }),
      columnHelper.display({
        id: "product",
        header: () => <ProductHeader />,
        cell: ({ row }) =>
          row.original.product ? (
            <ProductCell product={row.original.product} />
          ) : (
            "-"
          ),
      }),
      columnHelper.accessor("sku", {
        header: t("fields.sku"),
        cell: ({ getValue }) => getValue() || "-",
      }),
      columnHelper.accessor("title", {
        header: t("fields.title"),
      }),
    ],
    [t]
  )
}

import type { HttpTypes } from "@medusajs/types"
import { Checkbox } from "@medusajs/ui"
import { createColumnHelper } from "@tanstack/react-table"
import { useTranslation } from "react-i18next"

import {
  ProductCell,
  ProductHeader,
} from "../../../../../components/common/table/table-cells/product-cell"

const columnHelper = createColumnHelper<HttpTypes.AdminProductVariant>()

export const useManageItemsTableColumns = (_currencyCode: string) => {
  const { t } = useTranslation("quotes")

  return [
    columnHelper.display({
      cell: ({ row }) => {
        const isSelectable = row.getCanSelect()

        return (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!isSelectable}
            onCheckedChange={(value) => {
              row.toggleSelected(value === true || value === "indeterminate")
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
            table.toggleAllPageRowsSelected(
              value === true || value === "indeterminate",
            )
          }}
        />
      ),
      id: "select",
    }),
    columnHelper.display({
      cell: ({ row }) =>
        row.original.product !== null && row.original.product !== undefined ? (
          <ProductCell product={row.original.product} />
        ) : (
          "-"
        ),
      header: () => <ProductHeader />,
      id: "product",
    }),
    columnHelper.accessor("sku", {
      cell: ({ getValue }) => {
        const value = getValue()
        return value === null || value === undefined || value.length === 0
          ? "-"
          : value
      },
      header: t("fields.sku"),
    }),
    columnHelper.accessor("title", {
      header: t("fields.title"),
    }),
  ]
}

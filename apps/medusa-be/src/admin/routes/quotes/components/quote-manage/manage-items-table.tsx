import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import { useState } from "react"
import { DataTable } from "../../../../components"
import { useVariants } from "../../../../hooks/api"
import { useDataTable } from "../../../../hooks/use-data-table"
import { useManageItemsTableColumns } from "./table/columns"
import { useManageItemsTableFilters } from "./table/filters"
import { useManageItemsTableQuery } from "./table/query"

const PAGE_SIZE = 50
const PREFIX = "rit"

type ManageItemsTableProps = {
  onSelectionChange: (ids: string[]) => void
  currencyCode: string
}

export const ManageItemsTable = ({
  onSelectionChange,
  currencyCode,
}: ManageItemsTableProps) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const updater: OnChangeFn<RowSelectionState> = (fn) => {
    const newState: RowSelectionState =
      typeof fn === "function" ? fn(rowSelection) : fn

    setRowSelection(newState)
    onSelectionChange(Object.keys(newState))
  }

  const { searchParams, raw } = useManageItemsTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  })

  const { variants = [], count } = useVariants({
    ...searchParams,
    fields: "*inventory_items.inventory.location_levels,+inventory_quantity",
  })

  const columns = useManageItemsTableColumns(currencyCode)
  const filters = useManageItemsTableFilters()

  const { table } = useDataTable({
    data: variants,
    columns,
    count,
    enablePagination: true,
    getRowId: (row) => row.id,
    pageSize: PAGE_SIZE,
    enableRowSelection: (row) => true,
    rowSelection: {
      state: rowSelection,
      updater,
    },
  })

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <DataTable
        columns={columns}
        count={count}
        filters={filters}
        layout="fill"
        orderBy={["product_id", "title", "sku"]}
        pageSize={PAGE_SIZE}
        pagination
        prefix={PREFIX}
        queryObject={raw}
        search
        table={table}
      />
    </div>
  )
}

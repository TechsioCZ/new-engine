import {
  DataTable,
  type DataTableColumnDef,
  type DataTableEmptyStateProps,
  type DataTablePaginationState,
  type DataTableRow,
  type DataTableRowSelectionState,
  useDataTable,
} from "@medusajs/ui"
import type { MouseEvent } from "react"
import { useTranslation } from "react-i18next"

import { getPaginationTranslations } from "../../lib/table"

type BrandDataTableProps<TData> = {
  columns: DataTableColumnDef<TData>[]
  count: number
  data: TData[]
  emptyState?: DataTableEmptyStateProps
  getRowId: (row: TData) => string
  isLoading: boolean
  onPageIndexChange: (pageIndex: number) => void
  onRowClick?: (
    event: MouseEvent<HTMLTableRowElement, globalThis.MouseEvent>,
    row: TData
  ) => void
  pageIndex: number
  pageSize: number
  rowSelection?: {
    enableRowSelection?: boolean | ((row: DataTableRow<TData>) => boolean)
    onRowSelectionChange: (state: DataTableRowSelectionState) => void
    state: DataTableRowSelectionState
  }
}

export const BrandDataTable = <TData,>({
  columns,
  count,
  data,
  emptyState,
  getRowId,
  isLoading,
  onPageIndexChange,
  onRowClick,
  pageIndex,
  pageSize,
  rowSelection,
}: BrandDataTableProps<TData>) => {
  const { t } = useTranslation("brands")
  const pagination = { pageIndex, pageSize }
  const instance = useDataTable({
    columns,
    data,
    getRowId,
    isLoading,
    ...(onRowClick === undefined ? {} : { onRowClick }),
    pagination: {
      onPaginationChange: (next: DataTablePaginationState) => {
        onPageIndexChange(next.pageIndex)
      },
      state: pagination,
    },
    rowCount: count,
    ...(rowSelection === undefined ? {} : { rowSelection }),
  })

  return (
    <DataTable instance={instance}>
      <DataTable.Table {...(emptyState === undefined ? {} : { emptyState })} />
      <DataTable.Pagination translations={getPaginationTranslations(t)} />
    </DataTable>
  )
}

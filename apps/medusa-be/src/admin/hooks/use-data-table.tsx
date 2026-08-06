import {
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type {
  OnChangeFn,
  PaginationState,
  Row,
  RowSelectionState,
  TableOptions,
} from "@tanstack/react-table"
import { useState } from "react"
import { useSearchParams } from "react-router-dom"

interface UseDataTableProps<TData> {
  data?: TData[] | undefined
  // ColumnDef is invariant in TValue, and this table accepts heterogeneous column value types.
  columns: TableOptions<TData>["columns"]
  count?: number | undefined
  pageSize?: number
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  rowSelection?: {
    state: RowSelectionState
    updater: OnChangeFn<RowSelectionState>
  }
  enablePagination?: boolean
  enableExpandableRows?: boolean
  getRowId?: (original: TData, index: number) => string
  getSubRows?: (original: TData) => TData[]
  meta?: Record<string, unknown>
  prefix?: string
}

const getPageIndex = (offset: string | null, pageSize: number): number =>
  offset === null ? 0 : Math.ceil(Number(offset) / pageSize)

const applyPaginationUpdate = (
  update: Parameters<OnChangeFn<PaginationState>>[0],
  current: PaginationState,
): PaginationState => (typeof update === "function" ? update(current) : update)

const getPaginationOptions = (
  enabled: boolean,
  onPaginationChange: OnChangeFn<PaginationState>,
) =>
  enabled
    ? {
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: true,
        onPaginationChange,
      }
    : {}

const getPaginationState = (enabled: boolean, pagination: PaginationState) =>
  enabled ? { pagination } : {}

export const useDataTable = <TData,>({
  data = [],
  columns,
  count = 0,
  pageSize: _pageSize = 20,
  enablePagination = true,
  enableRowSelection = false,
  enableExpandableRows = false,
  rowSelection: _rowSelection,
  getSubRows,
  getRowId,
  meta,
  prefix,
}: UseDataTableProps<TData>) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const prefixValue = prefix === undefined ? "" : `${prefix}_`
  const offsetKey = `${prefixValue}offset`
  const offset = searchParams.get(offsetKey)

  const pagination: PaginationState = {
    pageIndex: getPageIndex(offset, _pageSize),
    pageSize: _pageSize,
  }
  const { pageSize } = pagination
  const [localRowSelection, setLocalRowSelection] = useState<RowSelectionState>(
    {},
  )
  const rowSelection = _rowSelection?.state ?? localRowSelection
  const setRowSelection = _rowSelection?.updater ?? setLocalRowSelection

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const state = applyPaginationUpdate(updater, pagination)
    const { pageIndex: nextPageIndex, pageSize: nextPageSize } = state

    setSearchParams((prev) => {
      if (!nextPageIndex) {
        prev.delete(offsetKey)
        return prev
      }

      const newSearch = new URLSearchParams(prev)
      newSearch.set(offsetKey, String(nextPageIndex * nextPageSize))

      return newSearch
    })
  }

  const table = useReactTable({
    columns,
    data,
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    ...(enableExpandableRows
      ? { getExpandedRowModel: getExpandedRowModel() }
      : {}),
    ...getPaginationOptions(enablePagination, onPaginationChange),
    ...(getRowId ? { getRowId } : {}),
    ...(getSubRows ? { getSubRows } : {}),
    ...(meta ? { meta } : {}),
    ...(enableRowSelection === false
      ? {}
      : { onRowSelectionChange: setRowSelection }),
    pageCount: Math.ceil((count ?? 0) / pageSize),
    state: {
      // Always pass selection state, even when row selection is disabled.
      rowSelection,
      ...getPaginationState(enablePagination, pagination),
    },
  })

  return { table }
}

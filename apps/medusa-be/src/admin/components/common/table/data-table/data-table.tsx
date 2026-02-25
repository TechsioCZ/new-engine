import { clx } from "@medusajs/ui"
import { memo } from "react"
import { TableSkeleton } from "../../skeleton"
import { NoRecords, type NoResultsProps } from "../"
import { DataTableQuery, type DataTableQueryProps } from "./data-table-query"
import { DataTableRoot, type DataTableRootProps } from "./data-table-root"

interface DataTableProps<TData>
  extends Omit<DataTableRootProps<TData>, "noResults">,
    DataTableQueryProps {
  isLoading?: boolean
  pageSize: number
  queryObject?: Record<string, any>
  noRecords?: Pick<NoResultsProps, "title" | "message">
}

// Maybe we should use the memoized version of DataTableRoot
// const MemoizedDataTableRoot = memo(DataTableRoot) as typeof DataTableRoot
const MemoizedDataTableQuery = memo(DataTableQuery)

export const DataTable = <TData,>({
  table,
  columns,
  pagination,
  navigateTo,
  commands,
  count = 0,
  search = false,
  orderBy,
  filters,
  prefix,
  queryObject = {},
  pageSize,
  isLoading = false,
  noHeader = false,
  layout = "fit",
  noRecords: noRecordsProps = {},
}: DataTableProps<TData>) => {
  if (isLoading) {
    return (
      <TableSkeleton
        filters={!!filters?.length}
        layout={layout}
        orderBy={!!orderBy?.length}
        pagination={!!pagination}
        rowCount={pageSize}
        search={!!search}
      />
    )
  }

  const noQuery =
    Object.values(queryObject).filter((v) => Boolean(v)).length === 0
  const noResults = !isLoading && count === 0 && !noQuery
  const noRecords = !isLoading && count === 0 && noQuery

  if (noRecords) {
    return (
      <NoRecords
        className={clx({
          "flex h-full flex-col overflow-hidden": layout === "fill",
        })}
        {...noRecordsProps}
      />
    )
  }

  return (
    <div
      className={clx("divide-y", {
        "flex h-full flex-col overflow-hidden": layout === "fill",
      })}
    >
      <MemoizedDataTableQuery
        filters={filters}
        orderBy={orderBy}
        prefix={prefix}
        search={search}
      />
      <DataTableRoot
        columns={columns}
        commands={commands}
        count={count}
        layout={layout}
        navigateTo={navigateTo}
        noHeader={noHeader}
        noResults={noResults}
        pagination
        table={table}
      />
    </div>
  )
}

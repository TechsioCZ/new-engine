import { clx } from "@medusajs/ui"

import { TableSkeleton } from "../../skeleton/skeleton"
import { NoRecords } from "../empty-state"
import type { NoResultsProps } from "../empty-state"
import { DataTableQuery } from "./data-table-query"
import type { DataTableQueryProps } from "./data-table-query"
import { DataTableRoot } from "./data-table-root"
import type { DataTableRootProps } from "./data-table-root"

const EMPTY_QUERY_OBJECT: Readonly<
  Record<string, string | string[] | null | undefined>
> = {}
const EMPTY_NO_RECORDS_PROPS: Pick<NoResultsProps, "title" | "message"> = {}

interface DataTableProps<TData>
  extends Omit<DataTableRootProps<TData>, "noResults">, DataTableQueryProps {
  isLoading?: boolean
  pageSize: number
  queryObject?: Readonly<Record<string, string | string[] | null | undefined>>
  noRecords?: Pick<NoResultsProps, "title" | "message">
}

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
  queryObject = EMPTY_QUERY_OBJECT,
  pageSize,
  isLoading = false,
  noHeader = false,
  layout = "fit",
  noRecords: noRecordsProps = EMPTY_NO_RECORDS_PROPS,
}: DataTableProps<TData>) => {
  if (isLoading) {
    return (
      <TableSkeleton
        filters={filters !== undefined && filters.length > 0}
        layout={layout}
        orderBy={orderBy !== undefined && orderBy.length > 0}
        pagination={pagination === true}
        rowCount={pageSize}
        search={Boolean(search)}
      />
    )
  }

  const noQuery = !Object.values(queryObject).some(Boolean)
  const noResults = count === 0 && !noQuery
  const noRecords = count === 0 && noQuery

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
      <DataTableQuery
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
        pagination={pagination}
        table={table}
      />
    </div>
  )
}

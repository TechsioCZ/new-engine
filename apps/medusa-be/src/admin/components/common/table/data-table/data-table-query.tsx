import { DataTableFilter } from "./data-table-filter/data-table-filter"
import type { Filter } from "./data-table-filter/data-table-filter"

export interface DataTableQueryProps {
  search?: boolean | "autofocus" | undefined
  orderBy?: (string | number)[] | undefined
  filters?: Filter[] | undefined
  prefix?: string | undefined
}

const dataTableQuery = ({
  search,
  orderBy,
  filters,
  prefix,
}: DataTableQueryProps) => {
  const hasSearchOrOrder =
    search === undefined ? orderBy !== undefined : search !== false
  const hasQueryControls =
    hasSearchOrOrder ||
    filters !== undefined ||
    (prefix !== undefined && prefix.length > 0)

  if (!hasQueryControls) {
    return null
  }

  const hasFilters = filters !== undefined && filters.length > 0
  const hasPrefix = prefix !== undefined && prefix.length > 0

  return (
    <div className="flex items-start justify-between gap-x-4 px-6 py-4">
      <div className="w-full max-w-[60%]">
        {hasFilters && (
          <DataTableFilter
            filters={filters}
            {...(hasPrefix ? { prefix } : {})}
          />
        )}
      </div>
      <div className="flex shrink-0 items-center gap-x-2" />
    </div>
  )
}

export { dataTableQuery as DataTableQuery }

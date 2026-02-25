import { DataTable } from "../../../../admin/components"
import { useDataTable } from "../../../../admin/hooks"
import { useApprovals } from "../../../../admin/hooks/api"
import { useApprovalsTableColumns } from "./table/columns"
import { useApprovalsTableFilters } from "./table/filters"
import { useApprovalsTableQuery } from "./table/query"

const PAGE_SIZE = 50

export const ApprovalsTable = () => {
  const { searchParams, raw } = useApprovalsTableQuery({
    pageSize: PAGE_SIZE,
  })

  const { data, isPending } = useApprovals({
    ...searchParams,
    order: "-updated_at",
  })

  const columns = useApprovalsTableColumns()
  const filters = useApprovalsTableFilters()

  const { table } = useDataTable({
    data: data?.carts_with_approvals,
    columns,
    enablePagination: true,
    count: data?.count,
    pageSize: PAGE_SIZE,
  })

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <DataTable
        columns={columns}
        count={data?.count}
        filters={filters}
        isLoading={isPending}
        noRecords={{
          title: "No approvals found",
          message: "There are currently no approvals.",
        }}
        orderBy={["id", "created_at"]}
        pageSize={PAGE_SIZE}
        pagination
        queryObject={raw}
        search
        table={table}
      />
    </div>
  )
}

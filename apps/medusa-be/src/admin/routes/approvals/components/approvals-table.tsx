import { useTranslation } from "react-i18next"
import { useApprovals } from "../../../../admin/hooks/api"
import { DataTable } from "../../../../components/common/table/data-table/data-table"
import { useDataTable } from "../../../../hooks/use-data-table"
import { useApprovalsTableColumns } from "./table/columns"
import { useApprovalsTableFilters } from "./table/filters"
import { useApprovalsTableQuery } from "./table/query"

const PAGE_SIZE = 50

export const ApprovalsTable = () => {
  const { t } = useTranslation("approvals")
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
          title: t("noRecords.title"),
          message: t("noRecords.message"),
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

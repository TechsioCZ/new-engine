import { useTranslation } from "react-i18next"

import { DataTable } from "../../../components/common/table/data-table/data-table"
import { useApprovals } from "../../../hooks/api/approvals"
import { useDataTable } from "../../../hooks/use-data-table"
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
    columns,
    count: data?.count,
    data: data?.carts_with_approvals,
    enablePagination: true,
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
          message: t("noRecords.message"),
          title: t("noRecords.title"),
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

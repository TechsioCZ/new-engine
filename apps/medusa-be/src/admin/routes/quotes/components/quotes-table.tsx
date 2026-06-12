import { useTranslation } from "react-i18next"
import { DataTable } from "../../../../admin/components"
import { useDataTable } from "../../../../admin/hooks"
import { useQuotes } from "../../../../admin/hooks/api"
import { useQuotesTableColumns } from "./table/columns"
import { useQuotesTableFilters } from "./table/filters"
import { useQuotesTableQuery } from "./table/query"

const PAGE_SIZE = 50
const PREFIX = "quo"

export const QuotesTable = () => {
  const { t } = useTranslation("quotes")
  const { searchParams, raw } = useQuotesTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  })

  const {
    quotes = [],
    count,
    isPending,
  } = useQuotes({
    ...searchParams,
    fields:
      "+draft_order.total,+draft_order.customer.email,*draft_order.customer.employee.company",
    order: "-created_at",
  })

  const columns = useQuotesTableColumns()
  const filters = useQuotesTableFilters()

  const { table } = useDataTable({
    data: quotes,
    columns,
    enablePagination: true,
    count,
    pageSize: PAGE_SIZE,
  })

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <DataTable
        columns={columns}
        count={count}
        filters={filters}
        isLoading={isPending}
        navigateTo={(row) => `/quotes/${row.original.id}`}
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

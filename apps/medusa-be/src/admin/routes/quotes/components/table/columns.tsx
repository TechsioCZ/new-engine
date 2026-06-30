import { createColumnHelper } from "@tanstack/react-table"
import { useTranslation } from "react-i18next"
import type { QueryQuote } from "../../../../../types"
import { DateCell } from "../../../../components/common/table/table-cells/date-cell"
import { TextCell } from "../../../../components/common/table/table-cells/text-cell"
import QuoteStatusBadge from "../quote-status-badge"

const columnHelper = createColumnHelper<QueryQuote>()

export const useQuotesTableColumns = () => {
  const { t } = useTranslation("quotes")

  return [
    columnHelper.accessor("draft_order.display_id", {
      header: t("columns.id"),
      cell: ({ getValue }) => <TextCell text={`#${getValue()}`} />,
    }),
    columnHelper.accessor("status", {
      header: t("columns.status"),
      cell: ({ getValue }) => <QuoteStatusBadge status={getValue()} />,
    }),
    columnHelper.display({
      id: "email",
      header: t("columns.email"),
      cell: ({ row }) => <TextCell text={row.original.customer?.email} />,
    }),
    columnHelper.display({
      id: "company",
      header: t("columns.company"),
      cell: ({ row }) => (
        <TextCell text={row.original.customer?.employee?.company?.name} />
      ),
    }),
    columnHelper.accessor("draft_order.total", {
      header: t("columns.total"),
      cell: ({ getValue, row }) => (
        <TextCell
          text={`${row.original.draft_order.currency_code.toUpperCase()} ${getValue()}`}
        />
      ),
    }),

    columnHelper.accessor("created_at", {
      header: t("columns.createdAt"),
      cell: ({ getValue }) => <DateCell date={getValue()} />,
    }),
  ]
}

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
      cell: ({ getValue }) => <TextCell text={`#${getValue()}`} />,
      header: t("columns.id"),
    }),
    columnHelper.accessor("status", {
      cell: ({ getValue }) => <QuoteStatusBadge status={getValue()} />,
      header: t("columns.status"),
    }),
    columnHelper.display({
      cell: ({ row }) => <TextCell text={row.original.customer?.email} />,
      header: t("columns.email"),
      id: "email",
    }),
    columnHelper.display({
      cell: ({ row }) => (
        <TextCell text={row.original.customer?.employee?.company?.name} />
      ),
      header: t("columns.company"),
      id: "company",
    }),
    columnHelper.accessor("draft_order.total", {
      cell: ({ getValue, row }) => (
        <TextCell
          text={`${row.original.draft_order.currency_code.toUpperCase()} ${getValue()}`}
        />
      ),
      header: t("columns.total"),
    }),

    columnHelper.accessor("created_at", {
      cell: ({ getValue }) => <DateCell date={getValue()} />,
      header: t("columns.createdAt"),
    }),
  ]
}

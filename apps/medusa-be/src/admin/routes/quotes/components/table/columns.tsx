import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { DateCell } from "../../../../components/common/table/table-cells/date-cell"
import { TextCell } from "../../../../components/common/table/table-cells/text-cell"
import QuoteStatusBadge from "../quote-status-badge"

type QuoteTableRow = {
  created_at: Date | string
  customer: {
    email: string
  }
  draft_order: {
    currency_code: string
    customer: {
      employee: {
        company: {
          name: string
        }
      }
    }
    display_id: string | number
    total: number
  }
  status: string
}

const columnHelper = createColumnHelper<QuoteTableRow>()

export const useQuotesTableColumns = () => {
  const { t } = useTranslation("quotes")

  return useMemo(
    () => [
      columnHelper.accessor("draft_order.display_id", {
        header: t("columns.id"),
        cell: ({ getValue }) => <TextCell text={`#${getValue()}`} />,
      }),
      columnHelper.accessor("status", {
        header: t("columns.status"),
        cell: ({ getValue }) => <QuoteStatusBadge status={getValue()} />,
      }),
      columnHelper.accessor("customer.email", {
        header: t("columns.email"),
        cell: ({ getValue }) => <TextCell text={getValue()} />,
      }),
      columnHelper.accessor("draft_order.customer.employee.company.name", {
        header: t("columns.company"),
        cell: ({ getValue }) => <TextCell text={getValue()} />,
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
    ],
    [t]
  )
}

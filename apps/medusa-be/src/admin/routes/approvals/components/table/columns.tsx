import { StatusBadge } from "@medusajs/ui"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { DateCell } from "../../../../../admin/components/common/table/table-cells/date-cell"
import { ApprovalStatusType } from "../../../../../types/approval"
import { TextCell } from "../../../../components/common/table/table-cells/text-cell"
import { type ApprovalActionCart, ApprovalActions } from "../approval-actions"
import ItemsPopover, { type ApprovalItem } from "../approvals-items-popover"

type ApprovalTableRow = ApprovalActionCart & {
  company: {
    name: string
  }
  currency_code: string
  id: string
  items: ApprovalItem[]
  updated_at: Date | string
}

const columnHelper = createColumnHelper<ApprovalTableRow>()

const getStatusColor = (status: ApprovalStatusType) => {
  if (status === ApprovalStatusType.APPROVED) {
    return "green"
  }

  if (status === ApprovalStatusType.REJECTED) {
    return "red"
  }

  return "purple"
}

export const useApprovalsTableColumns = () => {
  const { t } = useTranslation("approvals")

  return useMemo(
    () => [
      columnHelper.accessor("id", {
        header: t("columns.id"),
        cell: ({ getValue }) => <TextCell text={`#${getValue().slice(-4)}`} />,
      }),
      columnHelper.accessor("updated_at", {
        header: t("columns.updatedAt"),
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
      columnHelper.accessor("company.name", {
        header: t("columns.company"),
        cell: ({ getValue }) => <TextCell text={getValue()} />,
      }),
      columnHelper.accessor("approval_status.status", {
        header: t("columns.status"),
        cell: ({ getValue }) => {
          const status = getValue()
          return (
            <StatusBadge color={getStatusColor(status)}>
              {t(`statuses.${status.toLowerCase()}`)}
            </StatusBadge>
          )
        },
      }),
      columnHelper.accessor("items", {
        header: t("columns.items"),
        cell: ({ getValue, row }) => (
          <ItemsPopover
            currencyCode={row.original.currency_code}
            items={getValue()}
          />
        ),
      }),
      columnHelper.accessor("actions", {
        header: t("columns.actions"),
        cell: ({ row }) => <ApprovalActions cart={row.original} />,
      }),
    ],
    [t]
  )
}

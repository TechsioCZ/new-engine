import { StatusBadge } from "@medusajs/ui"
import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { AdminCartWithApprovals } from "../../../../../types"
import { ApprovalStatusType } from "../../../../../types"
import { DateCell } from "../../../../components/common/table/table-cells/date-cell"
import { TextCell } from "../../../../components/common/table/table-cells/text-cell"
import { ApprovalActions } from "../approval-actions"
import ItemsPopover, { type ApprovalItem } from "../approvals-items-popover"

const columnHelper = createColumnHelper<AdminCartWithApprovals>()

const getApprovalItems = (
  items: AdminCartWithApprovals["items"]
): ApprovalItem[] =>
  items?.map((item) => ({
    id: item.id,
    product_title: item.product_title ?? item.title ?? "-",
    quantity: item.quantity,
    thumbnail: item.thumbnail ?? undefined,
    unit_price: item.unit_price,
    variant_title: item.variant_title ?? undefined,
  })) ?? []

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
      columnHelper.display({
        id: "company",
        header: t("columns.company"),
        cell: ({ row }) => (
          <TextCell text={row.original.company?.name ?? "-"} />
        ),
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
      columnHelper.display({
        id: "items",
        header: t("columns.items"),
        cell: ({ row }) => (
          <ItemsPopover
            currencyCode={row.original.currency_code ?? ""}
            items={getApprovalItems(row.original.items)}
          />
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: t("columns.actions"),
        cell: ({ row }) => <ApprovalActions cart={row.original} />,
      }),
    ],
    [t]
  )
}

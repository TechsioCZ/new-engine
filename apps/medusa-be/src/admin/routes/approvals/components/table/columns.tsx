import { StatusBadge } from "@medusajs/ui"
import { createColumnHelper } from "@tanstack/react-table"
import { useTranslation } from "react-i18next"

import type { AdminCartWithApprovals } from "../../../../../types/approval/http"
import { ApprovalStatusType } from "../../../../../types/approval/module"
import { DateCell } from "../../../../components/common/table/table-cells/date-cell"
import { TextCell } from "../../../../components/common/table/table-cells/text-cell"
import { ApprovalActions } from "../approval-actions"
import ItemsPopover from "../approvals-items-popover"
import type { ApprovalItem } from "../approvals-items-popover"

const columnHelper = createColumnHelper<AdminCartWithApprovals>()

const getApprovalItems = (
  items: AdminCartWithApprovals["items"],
): ApprovalItem[] =>
  items?.map((item) => ({
    id: item.id,
    product_title: item.product_title ?? item.title ?? "-",
    quantity: item.quantity,
    ...(item.thumbnail !== null &&
    item.thumbnail !== undefined &&
    item.thumbnail.length > 0
      ? { thumbnail: item.thumbnail }
      : {}),
    unit_price: item.unit_price,
    ...(item.variant_title !== null &&
    item.variant_title !== undefined &&
    item.variant_title.length > 0
      ? { variant_title: item.variant_title }
      : {}),
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

  return [
    columnHelper.accessor("id", {
      cell: ({ getValue }) => <TextCell text={`#${getValue().slice(-4)}`} />,
      header: t("columns.id"),
    }),
    columnHelper.accessor("updated_at", {
      cell: ({ getValue }) => <DateCell date={getValue() ?? null} />,
      header: t("columns.updatedAt"),
    }),
    columnHelper.display({
      cell: ({ row }) => <TextCell text={row.original.company?.name ?? "-"} />,
      header: t("columns.company"),
      id: "company",
    }),
    columnHelper.accessor("approval_status.status", {
      cell: ({ getValue }) => {
        const status = getValue()
        return (
          <StatusBadge color={getStatusColor(status)}>
            {t(`statuses.${status.toLowerCase()}`)}
          </StatusBadge>
        )
      },
      header: t("columns.status"),
    }),
    columnHelper.display({
      cell: ({ row }) => (
        <ItemsPopover
          currencyCode={row.original.currency_code ?? ""}
          items={getApprovalItems(row.original.items)}
        />
      ),
      header: t("columns.items"),
      id: "items",
    }),
    columnHelper.display({
      cell: ({ row }) => <ApprovalActions cart={row.original} />,
      header: t("columns.actions"),
      id: "actions",
    }),
  ]
}

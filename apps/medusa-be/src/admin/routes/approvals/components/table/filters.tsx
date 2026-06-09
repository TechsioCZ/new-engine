import { useTranslation } from "react-i18next"
import { ApprovalStatusType } from "../../../../../types/approval"
import type { Filter } from "../../../../components/common/table/data-table/data-table-filter"

export const useApprovalsTableFilters = () => {
  const { t } = useTranslation("approvals")
  const filters: Filter[] = [
    {
      label: t("filters.status"),
      key: "status",
      type: "select",
      options: [
        { label: t("statuses.pending"), value: ApprovalStatusType.PENDING },
        { label: t("statuses.approved"), value: ApprovalStatusType.APPROVED },
        { label: t("statuses.rejected"), value: ApprovalStatusType.REJECTED },
      ],
    },
  ]

  return filters
}

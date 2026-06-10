import { Check, XMark } from "@medusajs/icons"
import { IconButton, usePrompt } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ApprovalStatusType, ApprovalType } from "../../../../types"
import { useUpdateApproval } from "../../../hooks/api"

export type ApprovalActionCart = {
  approval_status: {
    status: ApprovalStatusType
  }
  approval_requests: {
    id: string
    status: ApprovalStatusType
    type: ApprovalType
  }[]
}

export const ApprovalActions = ({ cart }: { cart: ApprovalActionCart }) => {
  const { t } = useTranslation("approvals")
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const dialog = usePrompt()

  const awaitingSalesManagerApproval = cart.approval_requests.find(
    (approval) =>
      approval.type === ApprovalType.SALES_MANAGER &&
      approval.status === ApprovalStatusType.PENDING
  )

  const { mutateAsync: updateApproval } = useUpdateApproval(
    awaitingSalesManagerApproval?.id ?? ""
  )

  const approveCart = async () => {
    setIsApproving(true)
    const confirmed = await dialog({
      title: t("prompts.approveTitle"),
      description: t("prompts.approveDescription"),
      confirmText: t("actions.approve"),
      cancelText: t("actions.cancel"),
    })

    if (confirmed && awaitingSalesManagerApproval) {
      await updateApproval({
        status: ApprovalStatusType.APPROVED,
      })
    }
    setIsApproving(false)
  }

  const rejectCart = async () => {
    setIsRejecting(true)
    const confirmed = await dialog({
      title: t("prompts.rejectTitle"),
      description: t("prompts.rejectDescription"),
      confirmText: t("actions.reject"),
      cancelText: t("actions.cancel"),
    })

    if (confirmed && awaitingSalesManagerApproval) {
      await updateApproval({
        status: ApprovalStatusType.REJECTED,
      })
    }
    setIsRejecting(false)
  }

  if (!awaitingSalesManagerApproval) {
    return null
  }

  if (cart.approval_status.status === ApprovalStatusType.PENDING) {
    return (
      <div className="flex gap-2">
        <IconButton
          aria-label={t("actions.reject")}
          className="h-8 w-8"
          isLoading={isRejecting}
          onClick={rejectCart}
        >
          <XMark />
        </IconButton>
        <IconButton
          aria-label={t("actions.approve")}
          className="h-8 w-8"
          isLoading={isApproving}
          onClick={approveCart}
        >
          <Check />
        </IconButton>
      </div>
    )
  }

  return null
}

export default ApprovalActions

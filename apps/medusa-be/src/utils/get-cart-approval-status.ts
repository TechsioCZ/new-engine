import { ApprovalStatusType } from "../types/approval/module"

interface CartWithApprovals {
  approvals?: ({ status?: string | null } | null)[] | null
}

export const getCartApprovalStatus = (cart: CartWithApprovals | null) => {
  const defaultStatus = {
    isApproved: false,
    isPendingApproval: false,
    isRejected: false,
  }

  if (
    cart?.approvals === undefined ||
    cart.approvals === null ||
    cart.approvals.length === 0
  ) {
    return defaultStatus
  }

  const { approvals } = cart

  const isPendingApproval = approvals.some(
    (approval) => approval?.status === ApprovalStatusType.PENDING,
  )

  if (isPendingApproval) {
    return { ...defaultStatus, isPendingApproval: true }
  }

  const isApproved = approvals.some(
    (approval) => approval?.status === ApprovalStatusType.APPROVED,
  )

  if (isApproved) {
    return { ...defaultStatus, isApproved: true }
  }

  const isRejected = approvals.some(
    (approval) => approval?.status === ApprovalStatusType.REJECTED,
  )

  return { ...defaultStatus, isRejected }
}

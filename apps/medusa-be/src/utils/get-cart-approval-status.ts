import { ApprovalStatusType, type QueryApproval } from "../types/approval"

type CartWithApprovals = {
  approvals?: QueryApproval[] | null
}

export const getCartApprovalStatus = (cart: CartWithApprovals | null) => {
  const defaultStatus = {
    isPendingApproval: false,
    isApproved: false,
    isRejected: false,
  }

  if (!cart?.approvals?.length) {
    return defaultStatus
  }

  const { approvals } = cart

  const isPendingApproval = approvals.some(
    (approval) => approval?.status === ApprovalStatusType.PENDING
  )

  if (isPendingApproval) {
    return { ...defaultStatus, isPendingApproval: true }
  }

  const isApproved = approvals.some(
    (approval) => approval?.status === ApprovalStatusType.APPROVED
  )

  if (isApproved) {
    return { ...defaultStatus, isApproved: true }
  }

  const isRejected = approvals.some(
    (approval) => approval?.status === ApprovalStatusType.REJECTED
  )

  return { ...defaultStatus, isRejected }
}

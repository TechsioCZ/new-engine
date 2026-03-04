import { ApprovalStatusType } from "../../types/approval"
import { getCartApprovalStatus } from "../get-cart-approval-status"

describe("getCartApprovalStatus", () => {
  it("returns default status for null cart or empty approvals", () => {
    expect(getCartApprovalStatus(null)).toEqual({
      isPendingApproval: false,
      isApproved: false,
      isRejected: false,
    })

    expect(getCartApprovalStatus({ approvals: [] })).toEqual({
      isPendingApproval: false,
      isApproved: false,
      isRejected: false,
    })
  })

  it("returns pending status when at least one approval is pending", () => {
    expect(
      getCartApprovalStatus({
        approvals: [
          { status: ApprovalStatusType.APPROVED },
          { status: ApprovalStatusType.PENDING },
        ],
      })
    ).toEqual({
      isPendingApproval: true,
      isApproved: false,
      isRejected: false,
    })
  })

  it("returns approved status when no pending approvals exist", () => {
    expect(
      getCartApprovalStatus({
        approvals: [
          { status: ApprovalStatusType.APPROVED },
          { status: ApprovalStatusType.REJECTED },
        ],
      })
    ).toEqual({
      isPendingApproval: false,
      isApproved: true,
      isRejected: false,
    })
  })

  it("returns rejected status when approvals are only rejected", () => {
    expect(
      getCartApprovalStatus({
        approvals: [{ status: ApprovalStatusType.REJECTED }],
      })
    ).toEqual({
      isPendingApproval: false,
      isApproved: false,
      isRejected: true,
    })
  })
})

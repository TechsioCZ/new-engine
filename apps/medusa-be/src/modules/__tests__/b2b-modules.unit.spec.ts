import ApprovalModuleService from "../approval/service"
import { ApprovalStatusType } from "../../types"

describe("b2b module services", () => {
  it("ApprovalModuleService.hasPendingApprovals returns true when pending approvals exist", async () => {
    const service = Object.create(ApprovalModuleService.prototype) as any
    service.listAndCountApprovals = jest.fn().mockResolvedValue([[], 2])

    await expect(service.hasPendingApprovals("cart_123")).resolves.toBe(true)
    expect(service.listAndCountApprovals).toHaveBeenCalledWith({
      cart_id: "cart_123",
      status: ApprovalStatusType.PENDING,
    })
  })

  it("ApprovalModuleService.hasPendingApprovals returns false when no pending approvals exist", async () => {
    const service = Object.create(ApprovalModuleService.prototype) as any
    service.listAndCountApprovals = jest.fn().mockResolvedValue([[], 0])

    await expect(service.hasPendingApprovals("cart_123")).resolves.toBe(false)
  })
})

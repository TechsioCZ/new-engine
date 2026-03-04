var mockAuthenticate: jest.Mock
var mockValidateAndTransformBody: jest.Mock
var mockValidateAndTransformQuery: jest.Mock
var mockEnsureRole: jest.Mock

jest.mock("@medusajs/framework", () => {
  mockAuthenticate = jest.fn(() => jest.fn())
  mockValidateAndTransformBody = jest.fn(() => jest.fn())
  mockValidateAndTransformQuery = jest.fn(() => jest.fn())

  return {
    authenticate: (...args: unknown[]) => mockAuthenticate(...args),
    validateAndTransformBody: (...args: unknown[]) =>
      mockValidateAndTransformBody(...args),
    validateAndTransformQuery: (...args: unknown[]) =>
      mockValidateAndTransformQuery(...args),
  }
})

jest.mock("../../../middlewares/ensure-role", () => {
  mockEnsureRole = jest.fn(() => jest.fn())
  return {
    ensureRole: (...args: unknown[]) => mockEnsureRole(...args),
  }
})

import { ApprovalType } from "../../../../types/approval"
import { storeApprovalsMiddlewares } from "../middlewares"

describe("store approvals middlewares", () => {
  it("defines expected route middleware entries", () => {
    expect(storeApprovalsMiddlewares).toHaveLength(3)
    expect(storeApprovalsMiddlewares[0]).toMatchObject({
      method: "ALL",
      matcher: "/store/approvals*",
    })
    expect(storeApprovalsMiddlewares[1]).toMatchObject({
      method: ["GET"],
      matcher: "/store/approvals",
    })
    expect(storeApprovalsMiddlewares[2]).toMatchObject({
      method: ["POST"],
      matcher: "/store/approvals/:id",
    })
    expect(mockAuthenticate).toHaveBeenCalled()
    expect(mockEnsureRole).toHaveBeenCalledWith("company_admin")
  })

  it("ensureApprovalType returns 404 when approval is not found", async () => {
    const ensureApprovalType = storeApprovalsMiddlewares[2]
      .middlewares?.[0] as any

    const req = {
      params: { id: "appr_1" },
      scope: {
        resolve: () => ({
          graph: jest.fn().mockResolvedValue({ data: [null] }),
        }),
      },
    } as any
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    await ensureApprovalType(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: "Approval not found" })
  })

  it("ensureApprovalType returns 403 for non-admin approval types", async () => {
    const ensureApprovalType = storeApprovalsMiddlewares[2]
      .middlewares?.[0] as any

    const req = {
      params: { id: "appr_1" },
      scope: {
        resolve: () => ({
          graph: jest.fn().mockResolvedValue({
            data: [{ type: ApprovalType.SALES_MANAGER }],
          }),
        }),
      },
    } as any
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    await ensureApprovalType(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" })
  })

  it("ensureApprovalType calls next for admin approvals", async () => {
    const ensureApprovalType = storeApprovalsMiddlewares[2]
      .middlewares?.[0] as any

    const req = {
      params: { id: "appr_1" },
      scope: {
        resolve: () => ({
          graph: jest.fn().mockResolvedValue({
            data: [{ type: ApprovalType.ADMIN }],
          }),
        }),
      },
    } as any
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    await ensureApprovalType(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
})

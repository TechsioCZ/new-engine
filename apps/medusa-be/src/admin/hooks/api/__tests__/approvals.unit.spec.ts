var mockUseQuery: jest.Mock
var mockUseMutation: jest.Mock
var mockUseQueryClient: jest.Mock
var mockInvalidateQueries: jest.Mock
var mockClientFetch: jest.Mock

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: (...args: unknown[]) => mockUseQueryClient(...args),
}))

jest.mock("../../../lib/client", () => ({
  sdk: {
    client: {
      fetch: (mockClientFetch = jest.fn()),
    },
  },
}))

jest.mock("../companies", () => ({
  companyQueryKey: {
    detail: (id: string) => ["company", "detail", id],
  },
}))

import {
  approvalSettingsQueryKey,
  useApprovals,
  useUpdateApproval,
  useUpdateApprovalSettings,
} from "../approvals"

describe("approval api hooks", () => {
  beforeEach(() => {
    mockUseQuery = jest.fn()
    mockUseMutation = jest.fn((options) => options)
    mockInvalidateQueries = jest.fn()
    mockUseQueryClient = jest.fn(() => ({
      invalidateQueries: mockInvalidateQueries,
    }))
    mockClientFetch.mockReset()
  })

  it("useUpdateApprovalSettings posts update and invalidates related queries", async () => {
    const payload = {
      requires_admin_approval: true,
      requires_sales_manager_approval: false,
    }
    mockClientFetch.mockResolvedValue({ id: "setting_1" })

    useUpdateApprovalSettings("cmp_1")

    const options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn(payload)
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/cmp_1/approval-settings",
      {
        body: payload,
        method: "POST",
      }
    )

    options.onSuccess({ id: "setting_1" }, payload, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: approvalSettingsQueryKey.detail("cmp_1"),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["company", "detail", "cmp_1"],
    })
  })

  it("useApprovals configures query for approvals list", async () => {
    mockUseQuery.mockReturnValue({ data: { carts_with_approvals: [] } })
    const query = { limit: 10, offset: 0 }

    useApprovals(query)

    const options = mockUseQuery.mock.calls[0][0]
    expect(options.queryKey).toEqual(["approval", "list", { query }])
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/approvals", {
      method: "GET",
      query,
    })
  })

  it("useUpdateApproval posts update and invalidates approval lists", async () => {
    const payload = { status: "approved", handled_by: "user_1" }
    mockClientFetch.mockResolvedValue({ id: "apr_1" })

    useUpdateApproval("apr_1")

    const options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn(payload)
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/approvals/apr_1", {
      body: payload,
      method: "POST",
    })

    options.onSuccess({ id: "apr_1" }, payload, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["approval", "list"],
    })
  })
})

var mockUseQuery: jest.Mock
var mockUseMutation: jest.Mock
var mockUseQueryClient: jest.Mock
var mockInvalidateQueries: jest.Mock

var mockClientFetch: jest.Mock
var mockAdminRegionList: jest.Mock
var mockAdminVariantList: jest.Mock
var mockAdminRetrievePreview: jest.Mock
var mockAdminCustomerGroupList: jest.Mock
var mockAdminCustomerCreate: jest.Mock

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: (...args: unknown[]) => mockUseQueryClient(...args),
}))

jest.mock("../../../lib/client", () => ({
  sdk: {
    client: {
      fetch: (mockClientFetch = jest.fn((...args: unknown[]) => args)),
    },
    admin: {
      region: {
        list: (mockAdminRegionList = jest.fn()),
      },
      productVariant: {
        list: (mockAdminVariantList = jest.fn()),
      },
      order: {
        retrievePreview: (mockAdminRetrievePreview = jest.fn()),
      },
      customerGroup: {
        list: (mockAdminCustomerGroupList = jest.fn()),
      },
      customer: {
        create: (mockAdminCustomerCreate = jest.fn()),
      },
    },
  },
}))

import { customerQueryKey, useAdminCreateCustomer, useAdminCustomerGroups } from "../customers"
import { orderPreviewQueryKey, useOrderPreview } from "../order-preview"
import { regionQueryKey, useRegions } from "../regions"
import { productVariantQueryKeys, useVariants } from "../variants"

describe("admin api basic hooks", () => {
  beforeEach(() => {
    mockUseQuery = jest.fn()
    mockUseMutation = jest.fn((options) => options)
    mockInvalidateQueries = jest.fn()
    mockUseQueryClient = jest.fn(() => ({
      invalidateQueries: mockInvalidateQueries,
    }))

    mockClientFetch.mockReset()
    mockAdminRegionList.mockReset()
    mockAdminVariantList.mockReset()
    mockAdminRetrievePreview.mockReset()
    mockAdminCustomerGroupList.mockReset()
    mockAdminCustomerCreate.mockReset()
  })

  it("useRegions creates region query and flattens returned data", async () => {
    mockUseQuery.mockReturnValue({
      data: { regions: [{ id: "reg_1" }] },
      isPending: false,
    })
    mockAdminRegionList.mockResolvedValue({ regions: [{ id: "reg_1" }] })

    const result = useRegions()

    expect(result.regions).toEqual([{ id: "reg_1" }])
    expect(result.isPending).toBe(false)

    const options = mockUseQuery.mock.calls[0][0]
    expect(options.queryKey).toEqual(regionQueryKey.list())
    await options.queryFn()
    expect(mockAdminRegionList).toHaveBeenCalledTimes(1)
  })

  it("useVariants creates query and calls product variant list", async () => {
    mockUseQuery.mockReturnValue({
      data: { variants: [{ id: "var_1" }] },
      isFetching: false,
    })
    mockAdminVariantList.mockResolvedValue({ variants: [{ id: "var_1" }] })

    const query = { q: "sku-1" }
    const result = useVariants(query)

    expect(result.variants).toEqual([{ id: "var_1" }])
    expect(result.isFetching).toBe(false)

    const options = mockUseQuery.mock.calls[0][0]
    expect(options.queryKey).toEqual(productVariantQueryKeys.list(query))
    await options.queryFn()
    expect(mockAdminVariantList).toHaveBeenCalledWith(query)
  })

  it("useOrderPreview configures order preview query and returns merged response", async () => {
    mockUseQuery.mockReturnValue({
      data: { order_preview: { id: "preview_1" } },
      isLoading: false,
    })
    mockAdminRetrievePreview.mockResolvedValue({ order_preview: { id: "preview_1" } })

    const query = { fields: "id" }
    const result = useOrderPreview("order_1", query as any)

    expect(result.order_preview).toEqual({ id: "preview_1" })
    expect(result.isLoading).toBe(false)

    const options = mockUseQuery.mock.calls[0][0]
    expect(options.queryKey).toEqual(orderPreviewQueryKey.detail("order_1"))
    await options.queryFn()
    expect(mockAdminRetrievePreview).toHaveBeenCalledWith("order_1", query)
  })

  it("useAdminCustomerGroups maps customer groups through select", async () => {
    mockUseQuery.mockReturnValue({
      data: [{ id: "cg_1" }],
      isLoading: false,
    })
    mockAdminCustomerGroupList.mockResolvedValue({
      customer_groups: [{ id: "cg_1" }],
    })

    useAdminCustomerGroups()

    const options = mockUseQuery.mock.calls[0][0]
    expect(options.queryKey).toEqual(customerQueryKey.list("groups"))
    const response = await options.queryFn()
    expect(response).toEqual({ customer_groups: [{ id: "cg_1" }] })
    expect(options.select(response)).toEqual([{ id: "cg_1" }])
  })

  it("useAdminCreateCustomer creates customer and invalidates customer list queries", async () => {
    mockAdminCustomerCreate.mockResolvedValue({
      customer: { id: "cus_1" },
    })

    useAdminCreateCustomer()

    const options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn({ email: "a@example.com" })
    expect(mockAdminCustomerCreate).toHaveBeenCalledWith({
      email: "a@example.com",
    })

    const payload = { customer: { id: "cus_1" } }
    options.onSuccess(payload, { email: "a@example.com" }, "ctx")

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: customerQueryKey.lists(),
    })
  })
})

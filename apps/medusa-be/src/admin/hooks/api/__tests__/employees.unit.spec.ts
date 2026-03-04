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

import { employeeQueryKey, useCreateEmployee, useDeleteEmployee, useEmployees, useUpdateEmployee } from "../employees"

describe("employee api hooks", () => {
  beforeEach(() => {
    mockUseQuery = jest.fn()
    mockUseMutation = jest.fn((options) => options)
    mockInvalidateQueries = jest.fn()
    mockUseQueryClient = jest.fn(() => ({
      invalidateQueries: mockInvalidateQueries,
    }))
    mockClientFetch.mockReset()
  })

  it("useEmployees builds query and requests employee list", async () => {
    mockUseQuery.mockReturnValue({ data: { employees: [] } })
    const query = { limit: 20, offset: 0 }

    useEmployees("cmp_1", query)

    const options = mockUseQuery.mock.calls[0][0]
    expect(options.queryKey).toEqual(employeeQueryKey.list("cmp_1"))
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/cmp_1/employees?limit=20&offset=0",
      {
        method: "GET",
      }
    )
  })

  it("useEmployees omits query string when no query is provided", async () => {
    mockUseQuery.mockReturnValue({ data: { employees: [] } })

    useEmployees("cmp_1")

    const options = mockUseQuery.mock.calls[0][0]
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/companies/cmp_1/employees", {
      method: "GET",
    })
  })

  it("useCreateEmployee posts employee payload and invalidates company employee list", async () => {
    const payload = {
      company_id: "cmp_1",
      customer_id: "cus_1",
      is_admin: false,
      spending_limit: 1000,
    }
    mockClientFetch.mockResolvedValue({ employee: { id: "emp_1" } })

    useCreateEmployee("cmp_1")

    const options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn(payload)
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/companies/cmp_1/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    })

    options.onSuccess({ employee: { id: "emp_1" } }, payload, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: employeeQueryKey.list("cmp_1"),
    })
  })

  it("useUpdateEmployee posts update and invalidates detail and list queries", async () => {
    const payload = {
      company_id: "cmp_1",
      is_admin: true,
      spending_limit: 2500,
    }
    mockClientFetch.mockResolvedValue({ employee: { id: "emp_1" } })

    useUpdateEmployee("cmp_1", "emp_1")

    const options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn(payload)
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/cmp_1/employees/emp_1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
      }
    )

    options.onSuccess({ employee: { id: "emp_1" } }, payload, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: employeeQueryKey.detail("emp_1"),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: employeeQueryKey.list("cmp_1"),
    })
  })

  it("useDeleteEmployee issues delete request and invalidates employee list", async () => {
    mockClientFetch.mockResolvedValue(undefined)

    useDeleteEmployee("cmp_1")

    const options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn("emp_1")
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/cmp_1/employees/emp_1",
      {
        method: "DELETE",
      }
    )

    options.onSuccess(undefined, "emp_1", "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: employeeQueryKey.list("cmp_1"),
    })
  })

  it("calls provided mutation onSuccess callbacks", () => {
    const createOnSuccess = jest.fn()
    const updateOnSuccess = jest.fn()
    const deleteOnSuccess = jest.fn()

    useCreateEmployee("cmp_1", { onSuccess: createOnSuccess })
    let options = mockUseMutation.mock.calls[0][0]
    options.onSuccess({ employee: { id: "emp_1" } }, { company_id: "cmp_1" }, "ctx")
    expect(createOnSuccess).toHaveBeenCalledWith(
      { employee: { id: "emp_1" } },
      { company_id: "cmp_1" },
      "ctx"
    )

    useUpdateEmployee("cmp_1", "emp_1", { onSuccess: updateOnSuccess })
    options = mockUseMutation.mock.calls[1][0]
    options.onSuccess({ employee: { id: "emp_1" } }, { spending_limit: 1 }, "ctx")
    expect(updateOnSuccess).toHaveBeenCalledWith(
      { employee: { id: "emp_1" } },
      { spending_limit: 1 },
      "ctx"
    )

    useDeleteEmployee("cmp_1", { onSuccess: deleteOnSuccess })
    options = mockUseMutation.mock.calls[2][0]
    options.onSuccess(undefined, "emp_1", "ctx")
    expect(deleteOnSuccess).toHaveBeenCalledWith(undefined, "emp_1", "ctx")
  })
})

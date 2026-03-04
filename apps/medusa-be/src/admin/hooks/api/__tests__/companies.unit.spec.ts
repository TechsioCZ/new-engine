var mockUseQuery: jest.Mock
var mockUseMutation: jest.Mock
var mockUseQueryClient: jest.Mock
var mockInvalidateQueries: jest.Mock
var mockClientFetch: jest.Mock

var mockNormalizeCzInfo: jest.Mock
var mockNormalizeAddressCount: jest.Mock
var mockNormalizeTaxReliability: jest.Mock
var mockNormalizeVies: jest.Mock

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

jest.mock("../../../utils", () => ({
  normalizeCompanyCheckCzInfoQuery: (mockNormalizeCzInfo = jest.fn((q) => q)),
  normalizeCompanyCheckCzAddressCountQuery: (mockNormalizeAddressCount = jest.fn((q) => q)),
  normalizeCompanyCheckCzTaxReliabilityQuery: (mockNormalizeTaxReliability = jest.fn((q) => q)),
  normalizeCompanyCheckViesQuery: (mockNormalizeVies = jest.fn((q) => q)),
}))

import {
  companyCheckQueryKey,
  companyQueryKey,
  useAddCompanyToCustomerGroup,
  useCompanies,
  useCompany,
  useCompanyCheckCzAddressCount,
  useCompanyCheckCzInfo,
  useCompanyCheckCzTaxReliability,
  useCompanyCheckVies,
  useCreateCompany,
  useDeleteCompany,
  useRemoveCompanyFromCustomerGroup,
  useUpdateCompany,
} from "../companies"

describe("company api hooks", () => {
  beforeEach(() => {
    mockUseQuery = jest.fn()
    mockUseMutation = jest.fn((options) => options)
    mockInvalidateQueries = jest.fn()
    mockUseQueryClient = jest.fn(() => ({
      invalidateQueries: mockInvalidateQueries,
    }))

    mockClientFetch.mockReset()
    mockNormalizeCzInfo.mockReset().mockImplementation((q) => q)
    mockNormalizeAddressCount.mockReset().mockImplementation((q) => q)
    mockNormalizeTaxReliability.mockReset().mockImplementation((q) => q)
    mockNormalizeVies.mockReset().mockImplementation((q) => q)
  })

  it("useCompanyCheckCzInfo normalizes query and fetches info endpoint", async () => {
    mockUseQuery.mockReturnValue({ data: [] })
    mockNormalizeCzInfo.mockReturnValue({
      company_identification_number: "12345678",
    })

    useCompanyCheckCzInfo({
      company_identification_number: " 12345678 ",
    })

    const options = mockUseQuery.mock.calls[0][0]
    expect(options.enabled).toBe(true)
    expect(options.queryKey).toEqual(
      companyCheckQueryKey.list({
        endpoint: "cz-info",
        query: { company_identification_number: "12345678" },
      })
    )

    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/check/cz/info?company_identification_number=12345678",
      {
        method: "GET",
      }
    )
  })

  it("disables company-check queries when normalization returns undefined", () => {
    mockUseQuery.mockReturnValue({ data: undefined })
    mockNormalizeTaxReliability.mockReturnValue(undefined)

    useCompanyCheckCzTaxReliability({
      vat_identification_number: "invalid",
    })

    const options = mockUseQuery.mock.calls[0][0]
    expect(options.enabled).toBe(false)
  })

  it("useCompanyCheckCzAddressCount and VIES hit expected endpoints", async () => {
    mockUseQuery.mockReturnValue({ data: undefined })
    mockNormalizeAddressCount.mockReturnValue({ street: "Main", city: "Prague" })
    mockNormalizeVies.mockReturnValue({ vat_identification_number: "CZ123" })

    useCompanyCheckCzAddressCount({ street: "Main", city: "Prague" })
    let options = mockUseQuery.mock.calls[0][0]
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/check/cz/address-count?street=Main&city=Prague",
      { method: "GET" }
    )

    useCompanyCheckVies({ vat_identification_number: "CZ123" })
    options = mockUseQuery.mock.calls[1][0]
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/check/vies?vat_identification_number=CZ123",
      { method: "GET" }
    )
  })

  it("uses base company-check endpoints when normalized queries are missing", async () => {
    mockUseQuery.mockReturnValue({ data: undefined })
    mockNormalizeCzInfo.mockReturnValue(undefined)
    mockNormalizeAddressCount.mockReturnValue(undefined)
    mockNormalizeTaxReliability.mockReturnValue(undefined)
    mockNormalizeVies.mockReturnValue(undefined)

    useCompanyCheckCzInfo(undefined)
    let options = mockUseQuery.mock.calls[0][0]
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/companies/check/cz/info", {
      method: "GET",
    })

    useCompanyCheckCzAddressCount(undefined)
    options = mockUseQuery.mock.calls[1][0]
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/check/cz/address-count",
      {
        method: "GET",
      }
    )

    useCompanyCheckCzTaxReliability(undefined, { enabled: true })
    options = mockUseQuery.mock.calls[2][0]
    expect(options.enabled).toBe(false)
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/check/cz/tax-reliability",
      {
        method: "GET",
      }
    )

    useCompanyCheckVies(undefined)
    options = mockUseQuery.mock.calls[3][0]
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/companies/check/vies", {
      method: "GET",
    })
  })

  it("fetches tax reliability endpoint with query params when normalization succeeds", async () => {
    mockUseQuery.mockReturnValue({ data: undefined })
    mockNormalizeTaxReliability.mockReturnValue({
      vat_identification_number: "CZ123",
    })

    useCompanyCheckCzTaxReliability({ vat_identification_number: "CZ123" })
    const options = mockUseQuery.mock.calls[0][0]
    expect(options.enabled).toBe(true)

    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/check/cz/tax-reliability?vat_identification_number=CZ123",
      {
        method: "GET",
      }
    )
  })

  it("useCompanies and useCompany fetch list and detail endpoints", async () => {
    mockUseQuery.mockReturnValue({ data: undefined })

    useCompanies({ limit: 10, offset: 0 })
    let options = mockUseQuery.mock.calls[0][0]
    expect(options.queryKey).toEqual(
      companyQueryKey.list({ limit: 10, offset: 0 })
    )
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies?limit=10&offset=0",
      {
        method: "GET",
      }
    )

    useCompany("cmp_1", { fields: "id" })
    options = mockUseQuery.mock.calls[1][0]
    expect(options.queryKey).toEqual(companyQueryKey.detail("cmp_1"))
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/companies/cmp_1?fields=id", {
      method: "GET",
    })
  })

  it("uses base list/detail endpoints when query params are absent", async () => {
    mockUseQuery.mockReturnValue({ data: undefined })

    useCompanies()
    let options = mockUseQuery.mock.calls[0][0]
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/companies", {
      method: "GET",
    })

    useCompany("cmp_1")
    options = mockUseQuery.mock.calls[1][0]
    await options.queryFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/companies/cmp_1", {
      method: "GET",
    })
  })

  it("honors options.enabled=false for normalized company-check queries", () => {
    mockUseQuery.mockReturnValue({ data: undefined })
    mockNormalizeCzInfo.mockReturnValue({
      company_identification_number: "12345678",
    })

    useCompanyCheckCzInfo(
      { company_identification_number: "12345678" },
      { enabled: false }
    )

    const options = mockUseQuery.mock.calls[0][0]
    expect(options.enabled).toBe(false)
  })

  it("useCreateCompany posts payload and invalidates list/detail queries", async () => {
    const payload = { name: "ACME", email: "acme@example.com" }
    mockClientFetch.mockResolvedValue({ id: "cmp_1" })

    useCreateCompany()

    const options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn(payload)
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/companies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    })

    options.onSuccess({ id: "cmp_1" }, payload, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: companyQueryKey.lists(),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: companyQueryKey.detail("cmp_1"),
    })
  })

  it("useUpdateCompany and useDeleteCompany invalidate company lists", async () => {
    mockClientFetch.mockResolvedValue(undefined)

    useUpdateCompany("cmp_1")
    let options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn({ name: "ACME Updated" })
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/companies/cmp_1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: { name: "ACME Updated" },
    })

    options.onSuccess({ id: "cmp_1" }, { name: "ACME Updated" }, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: companyQueryKey.lists(),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: companyQueryKey.detail("cmp_1"),
    })

    useDeleteCompany("cmp_1")
    options = mockUseMutation.mock.calls[1][0]
    await options.mutationFn()
    expect(mockClientFetch).toHaveBeenCalledWith("/admin/companies/cmp_1", {
      method: "DELETE",
    })
    options.onSuccess(undefined, undefined, "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: companyQueryKey.lists(),
    })
  })

  it("useAdd/RemoveCompanyToCustomerGroup issue proper requests and invalidate queries", async () => {
    mockClientFetch.mockResolvedValue(undefined)

    useAddCompanyToCustomerGroup("cmp_1")
    let options = mockUseMutation.mock.calls[0][0]
    await options.mutationFn("cg_1")
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/cmp_1/customer-group",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: { group_id: "cg_1" },
      }
    )
    options.onSuccess(undefined, "cg_1", "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: companyQueryKey.lists(),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: companyQueryKey.detail("cmp_1"),
    })

    useRemoveCompanyFromCustomerGroup("cmp_1")
    options = mockUseMutation.mock.calls[1][0]
    await options.mutationFn("cg_1")
    expect(mockClientFetch).toHaveBeenCalledWith(
      "/admin/companies/cmp_1/customer-group/cg_1",
      {
        method: "DELETE",
        headers: {
          Accept: "text/plain",
        },
      }
    )
    options.onSuccess(undefined, "cg_1", "ctx")
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: companyQueryKey.lists(),
    })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: companyQueryKey.detail("cmp_1"),
    })
  })

  it("calls provided mutation onSuccess callbacks", () => {
    const createOnSuccess = jest.fn()
    const updateOnSuccess = jest.fn()
    const deleteOnSuccess = jest.fn()

    useCreateCompany({ onSuccess: createOnSuccess })
    let options = mockUseMutation.mock.calls[0][0]
    options.onSuccess({ id: "cmp_1" }, { name: "ACME" }, "ctx")
    expect(createOnSuccess).toHaveBeenCalledWith(
      { id: "cmp_1" },
      { name: "ACME" },
      "ctx"
    )

    useUpdateCompany("cmp_1", { onSuccess: updateOnSuccess })
    options = mockUseMutation.mock.calls[1][0]
    options.onSuccess({ id: "cmp_1" }, { name: "Updated" }, "ctx")
    expect(updateOnSuccess).toHaveBeenCalledWith(
      { id: "cmp_1" },
      { name: "Updated" },
      "ctx"
    )

    useDeleteCompany("cmp_1", { onSuccess: deleteOnSuccess })
    options = mockUseMutation.mock.calls[2][0]
    options.onSuccess(undefined, undefined, "ctx")
    expect(deleteOnSuccess).toHaveBeenCalledWith(undefined, undefined, "ctx")
  })
})

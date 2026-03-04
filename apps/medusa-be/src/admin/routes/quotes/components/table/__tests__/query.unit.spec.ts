var mockUseQueryParams: jest.Mock

jest.mock("../../../../../hooks/use-query-params", () => ({
  useQueryParams: (...args: unknown[]) => mockUseQueryParams(...args),
}))

import { useQuotesTableQuery } from "../query"

describe("useQuotesTableQuery", () => {
  beforeEach(() => {
    mockUseQueryParams = jest.fn()
  })

  it("maps raw query params into table search params", () => {
    const raw = {
      q: "acme",
      offset: "10",
      created_at: '{"gt":"2024-01-01"}',
      updated_at: '{"lt":"2024-02-01"}',
      order: "-created_at",
    }
    mockUseQueryParams.mockReturnValue(raw)

    const { searchParams, raw: rawResult } = useQuotesTableQuery({
      pageSize: 10,
      prefix: "quo",
    })

    expect(searchParams).toEqual({
      q: "acme",
      order: "-created_at",
      limit: 10,
      offset: 10,
      created_at: { gt: "2024-01-01" },
      updated_at: { lt: "2024-02-01" },
    })
    expect(rawResult).toBe(raw)
    expect(mockUseQueryParams).toHaveBeenCalledWith(
      ["q", "offset", "order", "created_at", "updated_at"],
      "quo"
    )
  })

  it("uses fallback offset/date values when optional params are not present", () => {
    mockUseQueryParams.mockReturnValue({})

    const { searchParams } = useQuotesTableQuery({})

    expect(searchParams.limit).toBe(50)
    expect(searchParams.offset).toBe(0)
    expect(searchParams.created_at).toBeUndefined()
    expect(searchParams.updated_at).toBeUndefined()
  })
})

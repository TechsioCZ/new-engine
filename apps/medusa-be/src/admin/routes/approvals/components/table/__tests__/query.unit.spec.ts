var mockUseQueryParams: jest.Mock

jest.mock("../../../../../hooks/use-query-params", () => ({
  useQueryParams: (...args: unknown[]) => mockUseQueryParams(...args),
}))

import { useApprovalsTableQuery } from "../query"

describe("useApprovalsTableQuery", () => {
  beforeEach(() => {
    mockUseQueryParams = jest.fn()
  })

  it("parses offset/date filters and keeps raw query object", () => {
    const raw = {
      q: "acme",
      offset: "40",
      created_at: '{"gt":"2024-01-01"}',
      updated_at: '{"lt":"2024-02-01"}',
      status: "pending",
    }
    mockUseQueryParams.mockReturnValue(raw)

    const { searchParams, raw: rawResult } = useApprovalsTableQuery({
      pageSize: 25,
      prefix: "apr",
    })

    expect(searchParams).toEqual({
      q: "acme",
      status: "pending",
      limit: 25,
      offset: 40,
      created_at: { gt: "2024-01-01" },
      updated_at: { lt: "2024-02-01" },
      order: undefined,
    })
    expect(rawResult).toBe(raw)
    expect(mockUseQueryParams).toHaveBeenCalledWith(
      ["q", "offset", "order", "created_at", "updated_at", "status"],
      "apr"
    )
  })

  it("defaults offset to 0 and date filters to undefined", () => {
    mockUseQueryParams.mockReturnValue({
      q: "acme",
    })

    const { searchParams } = useApprovalsTableQuery({})

    expect(searchParams.offset).toBe(0)
    expect(searchParams.created_at).toBeUndefined()
    expect(searchParams.updated_at).toBeUndefined()
    expect(searchParams.limit).toBe(50)
  })
})

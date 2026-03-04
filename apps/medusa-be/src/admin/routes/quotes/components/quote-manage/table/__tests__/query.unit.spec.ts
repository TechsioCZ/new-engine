var mockUseQueryParams: jest.Mock

jest.mock("../../../../../../hooks/use-query-params", () => ({
  useQueryParams: (...args: unknown[]) => mockUseQueryParams(...args),
}))

import { useManageItemsTableQuery } from "../query"

describe("useManageItemsTableQuery", () => {
  beforeEach(() => {
    mockUseQueryParams = jest.fn()
  })

  it("converts raw params into search params", () => {
    const raw = {
      q: "sku",
      offset: "5",
      created_at: '{"gt":"2024-01-01"}',
      updated_at: '{"lt":"2024-02-01"}',
      order: "title",
    }
    mockUseQueryParams.mockReturnValue(raw)

    const { searchParams, raw: rawResult } = useManageItemsTableQuery({
      pageSize: 15,
      prefix: "rit",
    })

    expect(searchParams).toEqual({
      q: "sku",
      order: "title",
      limit: 15,
      offset: 5,
      created_at: { gt: "2024-01-01" },
      updated_at: { lt: "2024-02-01" },
    })
    expect(rawResult).toBe(raw)
    expect(mockUseQueryParams).toHaveBeenCalledWith(
      ["q", "offset", "order", "created_at", "updated_at"],
      "rit"
    )
  })

  it("uses default offset and undefined date filters when params are absent", () => {
    mockUseQueryParams.mockReturnValue({})

    const { searchParams } = useManageItemsTableQuery({})

    expect(searchParams.limit).toBe(50)
    expect(searchParams.offset).toBe(0)
    expect(searchParams.created_at).toBeUndefined()
    expect(searchParams.updated_at).toBeUndefined()
  })
})

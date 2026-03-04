import React from "react"

const collectElements = (node: any, predicate: (value: any) => boolean): any[] => {
  const found: any[] = []

  const walk = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (!React.isValidElement(value)) {
      return
    }

    if (predicate(value)) {
      found.push(value)
    }

    walk(value.props?.children)
  }

  walk(node)
  return found
}

describe("quotes table hooks", () => {
  it("returns empty filters for quote and manage-items tables", () => {
    const { useQuotesTableFilters } = require("../components/table/filters")
    const { useManageItemsTableFilters } = require(
      "../components/quote-manage/table/filters"
    )

    expect(useQuotesTableFilters()).toEqual([])
    expect(useManageItemsTableFilters()).toEqual([])
  })

  it("maps quote and manage-items query params", () => {
    const mockUseQueryParams = jest
      .fn()
      .mockReturnValueOnce({
        q: "quote",
        offset: "3",
        order: "-updated_at",
        created_at: JSON.stringify({ gt: "2024-01-01" }),
        updated_at: JSON.stringify({ lt: "2024-02-01" }),
      })
      .mockReturnValueOnce({
        q: "manage",
        offset: "7",
        order: "created_at",
      })

    let useQuotesTableQuery: (args: { pageSize?: number; prefix?: string }) => any
    let useManageItemsTableQuery: (args: {
      pageSize?: number
      prefix?: string
    }) => any

    jest.isolateModules(() => {
      jest.doMock("../../../hooks/use-query-params", () => ({
        useQueryParams: (...args: unknown[]) => mockUseQueryParams(...args),
      }))

      useQuotesTableQuery = require("../components/table/query").useQuotesTableQuery
      useManageItemsTableQuery =
        require("../components/quote-manage/table/query").useManageItemsTableQuery
    })

    const quotes = useQuotesTableQuery!({ pageSize: 10, prefix: "quotes" })
    const manage = useManageItemsTableQuery!({ pageSize: 20, prefix: "manage" })

    expect(mockUseQueryParams).toHaveBeenNthCalledWith(
      1,
      ["q", "offset", "order", "created_at", "updated_at"],
      "quotes"
    )
    expect(mockUseQueryParams).toHaveBeenNthCalledWith(
      2,
      ["q", "offset", "order", "created_at", "updated_at"],
      "manage"
    )

    expect(quotes.searchParams).toEqual({
      q: "quote",
      order: "-updated_at",
      limit: 10,
      offset: 3,
      created_at: { gt: "2024-01-01" },
      updated_at: { lt: "2024-02-01" },
    })
    expect(manage.searchParams).toEqual({
      q: "manage",
      order: "created_at",
      limit: 20,
      offset: 7,
      created_at: undefined,
      updated_at: undefined,
    })
  })
})

describe("quote status badge", () => {
  it("maps status to label and color", () => {
    let QuoteStatusBadge: (props: { status: string }) => any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        return {
          StatusBadge: ({ children, ...props }: any) =>
            React.createElement("status-badge", props, children),
        }
      })

      QuoteStatusBadge = require("../components/quote-status-badge").default
    })

    const pending = QuoteStatusBadge!({ status: "pending_customer" })
    const accepted = QuoteStatusBadge!({ status: "accepted" })

    expect(pending.props.color).toBe("blue")
    expect(pending.props.children).toBe("Pending Customer")
    expect(accepted.props.color).toBe("green")
    expect(accepted.props.children).toBe("Accepted")
  })
})

describe("Quotes page", () => {
  it("renders quotes table and exposes route config", () => {
    let Quotes: () => any
    let config: any
    let quotesTableType: any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/admin-sdk", () => ({
        defineRouteConfig: (routeConfig: unknown) => routeConfig,
      }))

      jest.doMock("@medusajs/icons", () => ({
        DocumentText: () => null,
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        return {
          Container: ({ children, ...props }: any) =>
            React.createElement("container-component", props, children),
          Heading: ({ children, ...props }: any) =>
            React.createElement("heading-component", props, children),
          Toaster: ({ children, ...props }: any) =>
            React.createElement("toaster-component", props, children),
        }
      })

      jest.doMock("../components/quotes-table", () => {
        quotesTableType = () => null
        return {
          QuotesTable: quotesTableType,
        }
      })

      const module = require("../page")
      Quotes = module.default
      config = module.config
    })

    const tree = Quotes!()
    const quotesTable = collectElements(
      tree,
      (element) => element.type === quotesTableType
    )

    expect(quotesTable).toHaveLength(1)
    expect(config.label).toBe("Quotes")
    expect(config.icon).toBeDefined()
  })

})

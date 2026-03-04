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

const renderElements = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(renderElements)
  }

  if (!React.isValidElement(value)) {
    return value
  }

  if (typeof value.type === "function") {
    return renderElements(value.type(value.props))
  }

  return React.cloneElement(value, {
    ...value.props,
    children: renderElements(value.props?.children),
  })
}

describe("quotes table + columns", () => {
  it("wires quotes table data", () => {
    const dataTable = jest.fn(() => null)
    const useDataTable = jest.fn(() => ({ table: { id: "table_1" } }))

    let QuotesTable: () => any

    jest.isolateModules(() => {
      jest.doMock("../../../../components", () => ({
        DataTable: dataTable,
      }))

      jest.doMock("../../../../hooks", () => ({
        useDataTable,
      }))

      jest.doMock("../../../../hooks/api", () => ({
        useQuotes: () => ({
          quotes: [{ id: "quote_1" }],
          count: 1,
          isPending: false,
        }),
      }))

      jest.doMock("../table/columns", () => ({
        useQuotesTableColumns: () => ["col"],
      }))

      jest.doMock("../table/filters", () => ({
        useQuotesTableFilters: () => ["filter"],
      }))

      jest.doMock("../table/query", () => ({
        useQuotesTableQuery: () => ({
          searchParams: { q: "x" },
          raw: { q: "x" },
        }),
      }))

      QuotesTable = require("../quotes-table").QuotesTable
    })

    const tree = QuotesTable!()
    const dataTableNode = collectElements(tree, (element) => element.type === dataTable)[0]

    expect(useDataTable).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ id: "quote_1" }],
        pageSize: 50,
      })
    )
    expect(dataTableNode.props.count).toBe(1)
    expect(dataTableNode.props.orderBy).toEqual(["id", "created_at"])
  })

  it("uses fallback rows when quotes are undefined and exposes row navigation handler", () => {
    const dataTable = jest.fn(() => null)
    const useDataTable = jest.fn(() => ({ table: { id: "table_1" } }))

    let QuotesTable: () => any

    jest.isolateModules(() => {
      jest.doMock("../../../../components", () => ({
        DataTable: dataTable,
      }))

      jest.doMock("../../../../hooks", () => ({
        useDataTable,
      }))

      jest.doMock("../../../../hooks/api", () => ({
        useQuotes: () => ({
          quotes: undefined,
          count: 0,
          isPending: true,
        }),
      }))

      jest.doMock("../table/columns", () => ({
        useQuotesTableColumns: () => ["col"],
      }))

      jest.doMock("../table/filters", () => ({
        useQuotesTableFilters: () => ["filter"],
      }))

      jest.doMock("../table/query", () => ({
        useQuotesTableQuery: () => ({
          searchParams: {},
          raw: {},
        }),
      }))

      QuotesTable = require("../quotes-table").QuotesTable
    })

    const tree = QuotesTable!()
    const dataTableNode = collectElements(tree, (element) => element.type === dataTable)[0]

    expect(useDataTable).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [],
      })
    )
    expect(dataTableNode.props.isLoading).toBe(true)
    expect(dataTableNode.props.navigateTo({ original: { id: "quote_2" } })).toBe(
      "/quotes/quote_2"
    )
  })

})

describe("quote detail components", () => {
  it("maps preview items to quote-item entries with original-item lookup", () => {
    let QuoteItems: (props: any) => any
    let QuoteItem: any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useMemo: (factory: () => unknown) => factory(),
      }))

      jest.doMock("react-i18next", () => ({
        useTranslation: () => ({
          t: (value: string) => value,
        }),
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        return {
          Badge: ({ children, ...props }: any) =>
            React.createElement("badge-component", props, children),
          Copy: ({ children, ...props }: any) =>
            React.createElement("copy-component", props, children),
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
        }
      })

      jest.doMock("../../../../components/common", () => ({
        AmountCell: ({ amount, originalAmount }: any) => ({
          type: "AmountCell",
          props: { amount, originalAmount },
        }),
        Thumbnail: ({ src }: any) => ({ type: "Thumbnail", props: { src } }),
      }))

      const module = require("../quote-details/quote-items")
      QuoteItems = module.QuoteItems
      QuoteItem = module.QuoteItem
    })

    const tree = QuoteItems!({
      order: {
        currency_code: "usd",
        items: [{ id: "item_1", unit_price: 100, total: 100 }],
      },
      preview: {
        items: [
          {
            id: "item_1",
            unit_price: 110,
            total: 110,
            detail: { quantity: 1, fulfilled_quantity: 0 },
            actions: [],
          },
        ],
      },
    })

    const mappedItems = collectElements(tree, (element) => element.type === QuoteItem)
    expect(mappedItems).toHaveLength(1)
    expect(mappedItems[0].props.originalItem.id).toBe("item_1")
  })

  it("renders cost breakdown with formatted amounts", () => {
    const formatAmount = jest.fn((value: number, currency: string) => `${currency}-${value}`)

    let CostBreakdown: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        return {
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
        }
      })

      jest.doMock("../../../../utils", () => ({
        formatAmount,
      }))

      CostBreakdown = require("../quote-details/quote-cost-breakdown").CostBreakdown
    })

    CostBreakdown!({
      order: {
        discount_total: 150,
        currency_code: "usd",
        shipping_methods: [
          { id: "sm_2", name: "Express", total: 200, created_at: "2024-02-02" },
          { id: "sm_1", name: "Basic", total: 100, created_at: "2024-01-01" },
        ],
      },
    })

    expect(formatAmount).toHaveBeenCalledWith(150, "usd")
    expect(formatAmount).toHaveBeenCalledWith(100, "usd")
    expect(formatAmount).toHaveBeenCalledWith(200, "usd")
  })

  it("renders zero-discount fallback when there are no shipping methods", () => {
    const formatAmount = jest.fn((value: number, currency: string) => `${currency}-${value}`)

    let CostBreakdown: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        return {
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
        }
      })

      jest.doMock("../../../../utils", () => ({
        formatAmount,
      }))

      CostBreakdown = require("../quote-details/quote-cost-breakdown").CostBreakdown
    })

    const tree = CostBreakdown!({
      order: {
        discount_total: 0,
        currency_code: "usd",
      },
    })
    const renderedTree = renderElements(tree)

    const textValues = collectElements(
      renderedTree,
      (element) => element.type === "text-component"
    )
      .map((element) => element.props.children)
      .flat()
      .join(" ")

    expect(textValues).toContain("-")
    expect(formatAmount).not.toHaveBeenCalledWith(0, "usd")
  })

  it("handles quote details header actions", () => {
    const navigate = jest.fn()

    let QuoteDetailsHeader: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react-router-dom", () => ({
        useNavigate: () => navigate,
      }))

      jest.doMock("@medusajs/icons", () => ({
        EllipsisHorizontal: () => null,
        PencilSquare: () => null,
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")

        const DropdownMenu = ({ children, ...props }: any) =>
          React.createElement("dropdown-menu", props, children)
        DropdownMenu.Trigger = ({ children, ...props }: any) =>
          React.createElement("dropdown-trigger", props, children)
        DropdownMenu.Content = ({ children, ...props }: any) =>
          React.createElement("dropdown-content", props, children)
        DropdownMenu.Item = ({ children, ...props }: any) =>
          React.createElement("dropdown-item", props, children)

        return {
          DropdownMenu,
          Heading: ({ children, ...props }: any) =>
            React.createElement("heading-component", props, children),
          IconButton: ({ children, ...props }: any) =>
            React.createElement("icon-button", props, children),
        }
      })

      jest.doMock("../quote-status-badge", () => ({
        __esModule: true,
        default: ({ status }: any) => ({
          type: "QuoteStatusBadge",
          props: { status },
        }),
      }))

      QuoteDetailsHeader = require("../quote-details/quote-details-header").QuoteDetailsHeader
    })

    const tree = QuoteDetailsHeader!({
      quote: { status: "pending_merchant" },
    })

    const menuItem = collectElements(
      tree,
      (element) => typeof element.props?.onClick === "function"
    )[0]

    menuItem.props.onClick()

    expect(menuItem.props.disabled).toBe(false)
    expect(navigate).toHaveBeenCalledWith("manage")
  })

  it("renders quote item tags and amounts", () => {
    let QuoteItem: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useMemo: (factory: () => unknown) => factory(),
      }))

      jest.doMock("react-i18next", () => ({
        useTranslation: () => ({
          t: (value: string) => value,
        }),
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        return {
          Badge: ({ children, ...props }: any) =>
            React.createElement("badge-component", props, children),
          Copy: ({ children, ...props }: any) =>
            React.createElement("copy-component", props, children),
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
        }
      })

      jest.doMock("../../../../components/common", () => ({
        AmountCell: ({ amount, originalAmount }: any) => ({
          type: "AmountCell",
          props: { amount, originalAmount },
        }),
        Thumbnail: ({ src }: any) => ({ type: "Thumbnail", props: { src } }),
      }))

      QuoteItem = require("../quote-details/quote-items").QuoteItem
    })

    const tree = QuoteItem!({
      currencyCode: "usd",
      originalItem: {
        unit_price: 90,
        total: 90,
      },
      item: {
        id: "item_1",
        title: "Line item",
        variant_sku: "SKU-1",
        variant: { options: [{ value: "Blue" }] },
        unit_price: 100,
        quantity: 2,
        total: 200,
        detail: { fulfilled_quantity: 1, quantity: 2 },
        actions: [{ action: "ITEM_ADD" }],
      },
    })

    const badges = collectElements(tree, (element) => typeof element.props?.color !== "undefined")

    expect(badges.length).toBeGreaterThan(0)
  })

  it("renders quote item removed/updated badges and quote totals", () => {
    let QuoteItem: (props: any) => any
    let QuoteTotal: (props: any) => any
    const formatAmount = jest.fn((value: number, currency: string) => `${currency}-${value}`)

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useMemo: (factory: () => unknown) => factory(),
      }))

      jest.doMock("react-i18next", () => ({
        useTranslation: () => ({
          t: (value: string) => value,
        }),
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        return {
          Badge: ({ children, ...props }: any) =>
            React.createElement("badge-component", props, children),
          Copy: ({ children, ...props }: any) =>
            React.createElement("copy-component", props, children),
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
        }
      })

      jest.doMock("../../../../components/common", () => ({
        AmountCell: ({ amount, originalAmount }: any) => ({
          type: "AmountCell",
          props: { amount, originalAmount },
        }),
        Thumbnail: ({ src }: any) => ({ type: "Thumbnail", props: { src } }),
      }))

      jest.doMock("../../../../utils", () => ({
        formatAmount,
      }))

      QuoteItem = require("../quote-details/quote-items").QuoteItem
      QuoteTotal = require("../quote-details/quote-total").QuoteTotal
    })

    const removedItem = QuoteItem!({
      currencyCode: "usd",
      originalItem: {
        unit_price: 120,
        total: 120,
      },
      item: {
        id: "item_2",
        title: "Removed item",
        variant: { options: [] },
        unit_price: 120,
        quantity: 1,
        total: 120,
        detail: { fulfilled_quantity: 1, quantity: 1 },
        actions: [{ action: "ITEM_UPDATE" }],
      },
    })
    const renderedRemovedItem = renderElements(removedItem)

    const removedBadges = collectElements(
      renderedRemovedItem,
      (element) => element.type === "badge-component"
    )
    expect(removedBadges.some((badge) => badge.props.color === "red")).toBe(true)
    expect(removedBadges.some((badge) => badge.props.color === "orange")).toBe(false)

    const totals = QuoteTotal!({
      order: {
        total: 1000,
        currency_code: "usd",
      },
      preview: {
        summary: {
          current_order_total: 1200,
        },
      },
    })

    expect(formatAmount).toHaveBeenCalledWith(1000, "usd")
    expect(formatAmount).toHaveBeenCalledWith(1200, "usd")
  })
})

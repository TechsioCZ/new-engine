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

describe("approvals table hooks", () => {
  it("returns status filter options", () => {
    const { ApprovalStatusType } = require("../../../../types/approval")
    const { useApprovalsTableFilters } = require("../components/table/filters")

    const filters = useApprovalsTableFilters()

    expect(filters).toHaveLength(1)
    expect(filters[0]).toEqual(
      expect.objectContaining({
        label: "Status",
        key: "status",
        type: "select",
      })
    )
    expect(filters[0].options).toEqual([
      { label: "Pending", value: ApprovalStatusType.PENDING },
      { label: "Approved", value: ApprovalStatusType.APPROVED },
      { label: "Rejected", value: ApprovalStatusType.REJECTED },
    ])
  })

  it("maps query params to search params", () => {
    const mockUseQueryParams = jest.fn(() => ({
      q: "abc",
      offset: "5",
      order: "-created_at",
      status: "pending",
      created_at: JSON.stringify({ gt: "2024-01-01" }),
      updated_at: JSON.stringify({ lt: "2024-02-01" }),
    }))

    let useApprovalsTableQuery: (args: { pageSize?: number; prefix?: string }) => any

    jest.isolateModules(() => {
      jest.doMock("../../../hooks/use-query-params", () => ({
        useQueryParams: (...args: unknown[]) => mockUseQueryParams(...args),
      }))

      useApprovalsTableQuery = require("../components/table/query").useApprovalsTableQuery
    })

    const result = useApprovalsTableQuery!({
      pageSize: 25,
      prefix: "approvals",
    })

    expect(mockUseQueryParams).toHaveBeenCalledWith(
      ["q", "offset", "order", "created_at", "updated_at", "status"],
      "approvals"
    )
    expect(result.searchParams).toEqual({
      q: "abc",
      order: "-created_at",
      status: "pending",
      limit: 25,
      offset: 5,
      created_at: { gt: "2024-01-01" },
      updated_at: { lt: "2024-02-01" },
    })
  })
})

describe("Approvals page", () => {
  it("renders approvals table and exposes route config", () => {
    let Approvals: () => any
    let config: any
    let approvalsTableType: any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/admin-sdk", () => ({
        defineRouteConfig: (routeConfig: unknown) => routeConfig,
      }))

      jest.doMock("@medusajs/icons", () => ({
        CheckCircle: () => null,
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

      jest.doMock("../components/approvals-table", () => {
        approvalsTableType = () => null
        return {
          ApprovalsTable: approvalsTableType,
        }
      })

      const module = require("../page")
      Approvals = module.default
      config = module.config
    })

    const tree = Approvals!()
    const approvalsTable = collectElements(
      tree,
      (element) => element.type === approvalsTableType
    )

    expect(approvalsTable).toHaveLength(1)
    expect(config.label).toBe("Approvals")
    expect(config.icon).toBeDefined()
  })
})

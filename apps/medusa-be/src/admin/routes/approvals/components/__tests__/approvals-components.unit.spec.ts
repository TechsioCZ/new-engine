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

const extractText = (value: any): string => {
  if (Array.isArray(value)) {
    return value.map(extractText).join("")
  }

  if (value === null || value === undefined || value === false) {
    return ""
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }

  if (React.isValidElement(value)) {
    return extractText(value.props?.children)
  }

  return ""
}

describe("ApprovalActions", () => {
  it("updates approval status after user confirmation", async () => {
    const prompt = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
    const updateApproval = jest.fn().mockResolvedValue(undefined)
    const setState = jest.fn()

    let ApprovalActions: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: (value: unknown) => [value, setState],
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        return {
          IconButton: ({ children, ...props }: any) =>
            React.createElement("icon-button", props, children),
          usePrompt: () => prompt,
        }
      })

      jest.doMock("@medusajs/icons", () => ({
        Check: () => null,
        XMark: () => null,
      }))

      jest.doMock("../../../../hooks/api/approvals", () => ({
        useUpdateApproval: () => ({
          mutateAsync: updateApproval,
        }),
      }))

      ApprovalActions = require("../approval-actions").ApprovalActions
    })

    const { ApprovalStatusType, ApprovalType } = require("../../../../../types/approval")

    const cart = {
      approval_status: { status: ApprovalStatusType.PENDING },
      approvals: [
        {
          id: "approval_1",
          type: ApprovalType.SALES_MANAGER,
          status: ApprovalStatusType.PENDING,
        },
      ],
    }

    const tree = ApprovalActions!({ cart })
    const buttons = collectElements(
      tree,
      (element) => typeof element.props?.onClick === "function"
    )

    await buttons[0].props.onClick()
    await buttons[1].props.onClick()

    expect(prompt).toHaveBeenCalledTimes(2)
    expect(updateApproval).toHaveBeenCalledWith({ status: ApprovalStatusType.REJECTED })
    expect(updateApproval).toHaveBeenCalledWith({ status: ApprovalStatusType.APPROVED })
    expect(setState).toHaveBeenCalled()
  })

  it("returns null when sales manager approval is missing", () => {
    let ApprovalActions: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: (value: unknown) => [value, jest.fn()],
      }))

      jest.doMock("@medusajs/ui", () => ({
        IconButton: () => null,
        usePrompt: () => jest.fn(),
      }))

      jest.doMock("../../../../hooks/api/approvals", () => ({
        useUpdateApproval: () => ({ mutateAsync: jest.fn() }),
      }))

      ApprovalActions = require("../approval-actions").ApprovalActions
    })

    const result = ApprovalActions!({
      cart: {
        approval_status: { status: "PENDING" },
        approvals: [],
      },
    })

    expect(result).toBeNull()
  })

  it("does not update approval when confirmation is cancelled", async () => {
    const prompt = jest.fn().mockResolvedValue(false)
    const updateApproval = jest.fn().mockResolvedValue(undefined)

    let ApprovalActions: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: (value: unknown) => [value, jest.fn()],
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        return {
          IconButton: ({ children, ...props }: any) =>
            React.createElement("icon-button", props, children),
          usePrompt: () => prompt,
        }
      })

      jest.doMock("@medusajs/icons", () => ({
        Check: () => null,
        XMark: () => null,
      }))

      jest.doMock("../../../../hooks/api/approvals", () => ({
        useUpdateApproval: () => ({
          mutateAsync: updateApproval,
        }),
      }))

      ApprovalActions = require("../approval-actions").ApprovalActions
    })

    const { ApprovalStatusType, ApprovalType } = require("../../../../../types/approval")
    const tree = ApprovalActions!({
      cart: {
        approval_status: { status: ApprovalStatusType.PENDING },
        approvals: [
          {
            id: "approval_1",
            type: ApprovalType.SALES_MANAGER,
            status: ApprovalStatusType.PENDING,
          },
        ],
      },
    })

    const buttons = collectElements(
      tree,
      (element) => typeof element.props?.onClick === "function"
    )
    await buttons[0].props.onClick()
    await buttons[1].props.onClick()

    expect(updateApproval).not.toHaveBeenCalled()
  })

  it("returns undefined for non-pending approval status", () => {
    let ApprovalActions: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: (value: unknown) => [value, jest.fn()],
      }))

      jest.doMock("@medusajs/ui", () => ({
        IconButton: () => null,
        usePrompt: () => jest.fn(),
      }))

      jest.doMock("../../../../hooks/api/approvals", () => ({
        useUpdateApproval: () => ({ mutateAsync: jest.fn() }),
      }))

      ApprovalActions = require("../approval-actions").ApprovalActions
    })

    const { ApprovalStatusType, ApprovalType } = require("../../../../../types/approval")

    const result = ApprovalActions!({
      cart: {
        approval_status: { status: ApprovalStatusType.APPROVED },
        approvals: [
          {
            id: "approval_1",
            type: ApprovalType.SALES_MANAGER,
            status: ApprovalStatusType.PENDING,
          },
        ],
      },
    })

    expect(result).toBeUndefined()
  })
})

describe("ItemsPopover", () => {
  it("renders item count and uses amount formatting", () => {
    const formatAmount = jest.fn((amount: number, currency: string) =>
      `${currency}-${amount}`
    )

    let ItemsPopover: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/icons", () => ({
        MagnifyingGlass: () => null,
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")

        const Popover = ({ children, ...props }: any) =>
          React.createElement("popover-component", props, children)
        Popover.Trigger = ({ children, ...props }: any) =>
          React.createElement("popover-trigger", props, children)
        Popover.Content = ({ children, ...props }: any) =>
          React.createElement("popover-content", props, children)

        const Table = ({ children, ...props }: any) =>
          React.createElement("table-component", props, children)
        Table.Body = ({ children, ...props }: any) =>
          React.createElement("table-body", props, children)
        Table.Row = ({ children, ...props }: any) =>
          React.createElement("table-row", props, children)
        Table.Cell = ({ children, ...props }: any) =>
          React.createElement("table-cell", props, children)

        return {
          Popover,
          Table,
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
        }
      })

      jest.doMock("../../../../utils/format-amount", () => ({
        formatAmount,
      }))

      ItemsPopover = require("../approvals-items-popover").default
    })

    const tree = ItemsPopover!({
      currencyCode: "USD",
      items: [
        {
          id: "item_1",
          product_title: "Product 1",
          variant_title: "Variant 1",
          quantity: 2,
          unit_price: 100,
        },
        {
          id: "item_2",
          product_title: "Product 2",
          variant_title: "Variant 2",
          quantity: 1,
          unit_price: 200,
        },
      ],
    })

    expect(tree).toBeTruthy()
    expect(formatAmount).toHaveBeenCalledWith(100, "USD")
    expect(formatAmount).toHaveBeenCalledWith(200, "USD")
    expect(formatAmount).toHaveBeenCalledWith(200, "USD")
  })

  it("renders singular item label when there is exactly one item", () => {
    let ItemsPopover: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("@medusajs/icons", () => ({
        MagnifyingGlass: () => null,
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")

        const Popover = ({ children, ...props }: any) =>
          React.createElement("popover-component", props, children)
        Popover.Trigger = ({ children, ...props }: any) =>
          React.createElement("popover-trigger", props, children)
        Popover.Content = ({ children, ...props }: any) =>
          React.createElement("popover-content", props, children)

        const Table = ({ children, ...props }: any) =>
          React.createElement("table-component", props, children)
        Table.Body = ({ children, ...props }: any) =>
          React.createElement("table-body", props, children)
        Table.Row = ({ children, ...props }: any) =>
          React.createElement("table-row", props, children)
        Table.Cell = ({ children, ...props }: any) =>
          React.createElement("table-cell", props, children)

        return {
          Popover,
          Table,
          Text: ({ children, ...props }: any) =>
            React.createElement("text-component", props, children),
        }
      })

      jest.doMock("../../../../utils/format-amount", () => ({
        formatAmount: (amount: number, currency: string) =>
          `${currency}-${amount}`,
      }))

      ItemsPopover = require("../approvals-items-popover").default
    })

    const tree = ItemsPopover!({
      currencyCode: "USD",
      items: [
        {
          id: "item_1",
          product_title: "Product 1",
          variant_title: "Variant 1",
          quantity: 1,
          unit_price: 100,
        },
      ],
    })
    const renderedTree = renderElements(tree)

    const trigger = collectElements(
      renderedTree,
      (element) => element.type === "popover-trigger"
    )[0]
    const triggerText = extractText(trigger.props.children)

    expect(triggerText).toContain("1 item")
  })
})

describe("approvals table", () => {
  it("wires data table props", () => {
    const dataTable = jest.fn(() => null)
    const useDataTable = jest.fn(() => ({ table: { id: "table_1" } }))

    let ApprovalsTable: () => any

    jest.isolateModules(() => {
      jest.doMock("../../../../components", () => ({
        DataTable: dataTable,
      }))

      jest.doMock("../../../../hooks", () => ({
        useDataTable,
      }))

      jest.doMock("../../../../hooks/api", () => ({
        useApprovals: () => ({
          data: {
            carts_with_approvals: [{ id: "cart_1" }],
            count: 1,
          },
          isPending: false,
        }),
      }))

      jest.doMock("../table/columns", () => ({
        useApprovalsTableColumns: () => ["col"],
      }))

      jest.doMock("../table/filters", () => ({
        useApprovalsTableFilters: () => ["filter"],
      }))

      jest.doMock("../table/query", () => ({
        useApprovalsTableQuery: () => ({
          searchParams: { q: "x" },
          raw: { q: "x" },
        }),
      }))

      ApprovalsTable = require("../approvals-table").ApprovalsTable
    })

    const tree = ApprovalsTable!()
    const dataTableNode = collectElements(tree, (element) => element.type === dataTable)[0]

    expect(useDataTable).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [{ id: "cart_1" }],
        pageSize: 50,
      })
    )
    expect(dataTableNode.props.count).toBe(1)
    expect(dataTableNode.props.orderBy).toEqual(["id", "created_at"])
  })
})

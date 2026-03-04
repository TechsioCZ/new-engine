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

describe("DataTableRoot", () => {
  it("renders rows/links/pagination and executes command actions", async () => {
    const setShowStickyBorder = jest.fn()
    const scroll = jest.fn()
    const commandAction = jest.fn().mockResolvedValue(undefined)
    const resetRowSelection = jest.fn()

    let commandType: any
    let paginationType: any
    let DataTableRoot: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useEffect: (callback: () => unknown) => {
          callback()
        },
        useRef: () => ({
          current: {
            scroll,
          },
        }),
        useState: () => [false, setShowStickyBorder],
      }))

      jest.doMock("react-i18next", () => ({
        useTranslation: () => ({
          t: (key: string, options?: any) =>
            typeof options?.count === "number"
              ? `${key}:${options.count}`
              : key,
        }),
      }))

      jest.doMock("react-router-dom", () => {
        const React = require("react")
        return {
          Link: ({ children, ...props }: any) =>
            React.createElement("link-component", props, children),
        }
      })

      jest.doMock("@tanstack/react-table", () => ({
        flexRender: (renderer: any, context: any) =>
          typeof renderer === "function" ? renderer(context) : renderer,
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")

        const Table = ({ children, ...props }: any) =>
          React.createElement("table-component", props, children)
        Table.Header = ({ children, ...props }: any) =>
          React.createElement("table-header", props, children)
        Table.Row = ({ children, ...props }: any) =>
          React.createElement("table-row", props, children)
        Table.HeaderCell = ({ children, ...props }: any) =>
          React.createElement("table-header-cell", props, children)
        Table.Body = ({ children, ...props }: any) =>
          React.createElement("table-body", props, children)
        Table.Cell = ({ children, ...props }: any) =>
          React.createElement("table-cell", props, children)
        paginationType = ({ children, ...props }: any) =>
          React.createElement("table-pagination", props, children)
        Table.Pagination = paginationType

        const CommandBar = ({ children, ...props }: any) =>
          React.createElement("command-bar", props, children)
        CommandBar.Bar = ({ children, ...props }: any) =>
          React.createElement("command-bar-bar", props, children)
        CommandBar.Value = ({ children, ...props }: any) =>
          React.createElement("command-bar-value", props, children)
        CommandBar.Seperator = ({ children, ...props }: any) =>
          React.createElement("command-bar-separator", props, children)
        commandType = ({ children, ...props }: any) =>
          React.createElement("command-bar-command", props, children)
        CommandBar.Command = commandType

        return {
          clx: (...parts: any[]) =>
            parts
              .flatMap((part) => {
                if (!part) {
                  return []
                }

                if (typeof part === "string") {
                  return [part]
                }

                if (typeof part === "object") {
                  return Object.keys(part).filter((key) => part[key])
                }

                return []
              })
              .join(" "),
          CommandBar,
          Table,
        }
      })

      jest.doMock("../../empty-state", () => ({
        NoResults: (props: any) => require("react").createElement("no-results", props),
      }))

      DataTableRoot = require("../data-table-root").DataTableRoot
    })

    const headers = [
      {
        id: "select",
        column: {
          columnDef: {
            header: () => "Select",
          },
        },
        getContext: () => ({}),
      },
      {
        id: "name",
        column: {
          columnDef: {
            header: () => "Name",
          },
        },
        getContext: () => ({}),
      },
      {
        id: "actions",
        column: {
          columnDef: {
            header: () => "Actions",
          },
        },
        getContext: () => ({}),
      },
    ]

    const cells = [
      {
        id: "select_cell",
        column: {
          id: "select",
          columnDef: {
            cell: () => "S",
          },
        },
        getContext: () => ({}),
      },
      {
        id: "name_cell",
        column: {
          id: "name",
          columnDef: {
            cell: () => "N",
          },
        },
        getContext: () => ({}),
      },
      {
        id: "actions_cell",
        column: {
          id: "actions",
          columnDef: {
            cell: () => "A",
          },
        },
        getContext: () => ({}),
      },
    ]

    const row = {
      id: "row_1",
      depth: 1,
      getCanSelect: () => false,
      getIsSelected: () => true,
      getVisibleCells: () => cells,
    }

    const table = {
      getCanNextPage: () => true,
      getCanPreviousPage: () => false,
      getHeaderGroups: () => [{ id: "hg_1", headers }],
      getPageCount: () => 4,
      getRowModel: () => ({ rows: [row] }),
      getState: () => ({
        rowSelection: { row_1: true },
        pagination: { pageIndex: 1, pageSize: 20 },
      }),
      nextPage: jest.fn(),
      previousPage: jest.fn(),
      resetRowSelection,
    }

    const tree = DataTableRoot!({
      table,
      columns: [{ id: "select" }, { id: "name" }, { id: "actions" }],
      commands: [
        {
          label: "Approve",
          shortcut: "A",
          action: commandAction,
        },
      ],
      count: 20,
      navigateTo: (tableRow: any) => `/orders/${tableRow.id}`,
      pagination: true,
      layout: "fill",
    })
    const renderedTree = renderElements(tree)

    expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0 })

    const scrollContainer = collectElements(
      renderedTree,
      (element) => typeof element.props?.onScroll === "function"
    )[0]
    scrollContainer.props.onScroll({ currentTarget: { scrollLeft: 12 } })
    scrollContainer.props.onScroll({ currentTarget: { scrollLeft: 0 } })

    expect(setShowStickyBorder).toHaveBeenCalledWith(true)
    expect(setShowStickyBorder).toHaveBeenCalledWith(false)

    const link = collectElements(
      renderedTree,
      (element) => element.type === "link-component"
    )[0]
    expect(link.props.to).toBe("/orders/row_1")
    expect(link.props.tabIndex).toBe(0)

    const command = collectElements(
      renderedTree,
      (element) => element.type === "command-bar-command"
    )[0]
    await command.props.action()

    expect(commandAction).toHaveBeenCalledWith({ row_1: true })
    expect(resetRowSelection).toHaveBeenCalled()

    const pagination = collectElements(
      renderedTree,
      (element) => element.type === "table-pagination"
    )[0]

    expect(pagination.props.count).toBe(20)
    expect(pagination.props.pageIndex).toBe(1)
    expect(pagination.props.pageSize).toBe(20)
    expect(pagination.props.translations.next).toBe("general.next")
  })

  it("renders no-results state when query has no matches", () => {
    let DataTableRoot: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useEffect: () => undefined,
        useRef: () => ({ current: null }),
        useState: () => [false, jest.fn()],
      }))

      jest.doMock("react-i18next", () => ({
        useTranslation: () => ({
          t: (key: string) => key,
        }),
      }))

      jest.doMock("react-router-dom", () => ({
        Link: ({ children, ...props }: any) =>
          require("react").createElement("link-component", props, children),
      }))

      jest.doMock("@tanstack/react-table", () => ({
        flexRender: (renderer: any, context: any) =>
          typeof renderer === "function" ? renderer(context) : renderer,
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = require("react")
        const Table = ({ children, ...props }: any) =>
          React.createElement("table-component", props, children)
        Table.Header = ({ children, ...props }: any) =>
          React.createElement("table-header", props, children)
        Table.Row = ({ children, ...props }: any) =>
          React.createElement("table-row", props, children)
        Table.HeaderCell = ({ children, ...props }: any) =>
          React.createElement("table-header-cell", props, children)
        Table.Body = ({ children, ...props }: any) =>
          React.createElement("table-body", props, children)
        Table.Cell = ({ children, ...props }: any) =>
          React.createElement("table-cell", props, children)
        Table.Pagination = ({ children, ...props }: any) =>
          React.createElement("table-pagination", props, children)

        const CommandBar = ({ children, ...props }: any) =>
          React.createElement("command-bar", props, children)
        CommandBar.Bar = ({ children, ...props }: any) =>
          React.createElement("command-bar-bar", props, children)
        CommandBar.Value = ({ children, ...props }: any) =>
          React.createElement("command-bar-value", props, children)
        CommandBar.Seperator = ({ children, ...props }: any) =>
          React.createElement("command-bar-separator", props, children)
        CommandBar.Command = ({ children, ...props }: any) =>
          React.createElement("command-bar-command", props, children)

        return {
          clx: (...parts: any[]) => parts.filter(Boolean).join(" "),
          CommandBar,
          Table,
        }
      })

      jest.doMock("../../empty-state", () => ({
        NoResults: (props: any) => require("react").createElement("no-results", props),
      }))

      DataTableRoot = require("../data-table-root").DataTableRoot
    })

    const table = {
      getCanNextPage: () => false,
      getCanPreviousPage: () => false,
      getHeaderGroups: () => [],
      getPageCount: () => 0,
      getRowModel: () => ({ rows: [] }),
      getState: () => ({
        rowSelection: {},
        pagination: { pageIndex: 0, pageSize: 10 },
      }),
      nextPage: jest.fn(),
      previousPage: jest.fn(),
      resetRowSelection: jest.fn(),
    }

    const tree = DataTableRoot!({
      table,
      columns: [{ id: "name" }],
      noResults: true,
      layout: "fit",
      noHeader: true,
    })
    const renderedTree = renderElements(tree)

    const noResults = collectElements(
      renderedTree,
      (element) => element.type === "no-results"
    )[0]
    expect(noResults).toBeDefined()
  })
})

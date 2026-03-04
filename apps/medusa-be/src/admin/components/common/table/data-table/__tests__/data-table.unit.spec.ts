import React from "react"

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  memo: (component: any) => component,
}))

jest.mock("@medusajs/ui", () => ({
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
}))

jest.mock("../../../skeleton", () => ({
  TableSkeleton: (props: any) =>
    require("react").createElement("table-skeleton", props),
}))

jest.mock("../../", () => ({
  NoRecords: (props: any) => require("react").createElement("no-records", props),
}))

jest.mock("../data-table-query", () => ({
  DataTableQuery: (props: any) =>
    require("react").createElement("data-table-query", props),
}))

jest.mock("../data-table-root", () => ({
  DataTableRoot: (props: any) =>
    require("react").createElement("data-table-root", props),
}))

import { DataTable } from "../data-table"
import { TableSkeleton } from "../../../skeleton"
import { NoRecords } from "../../"
import { DataTableQuery } from "../data-table-query"
import { DataTableRoot } from "../data-table-root"

const collectElements = (node: any, type: any): any[] => {
  const found: any[] = []

  const walk = (value: any) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (!React.isValidElement(value)) {
      return
    }

    if (value.type === type) {
      found.push(value)
    }

    walk(value.props?.children)
  }

  walk(node)
  return found
}

describe("DataTable", () => {
  const baseProps = {
    table: {} as any,
    columns: [{ id: "id" }] as any,
    pageSize: 20,
  }

  it("renders loading skeleton when loading is true", () => {
    const tree = DataTable({
      ...baseProps,
      isLoading: true,
      filters: [{ key: "status", label: "Status", type: "string" }] as any,
      orderBy: ["name"],
      search: true,
      pagination: true,
      layout: "fill",
    })

    const skeleton = collectElements(tree, TableSkeleton)[0]
    expect(skeleton.props.rowCount).toBe(20)
    expect(skeleton.props.filters).toBe(true)
    expect(skeleton.props.orderBy).toBe(true)
    expect(skeleton.props.search).toBe(true)
    expect(skeleton.props.layout).toBe("fill")
  })

  it("renders no-records state when there are no rows and no active query", () => {
    const tree = DataTable({
      ...baseProps,
      isLoading: false,
      count: 0,
      queryObject: {},
      noRecords: {
        title: "No records",
        message: "Create one",
      },
      layout: "fill",
    })

    const noRecords = collectElements(tree, NoRecords)[0]
    expect(noRecords.props.title).toBe("No records")
    expect(noRecords.props.message).toBe("Create one")
    expect(noRecords.props.className).toContain("flex h-full flex-col overflow-hidden")
  })

  it("renders query + root table and passes noResults when query is active with empty count", () => {
    const tree = DataTable({
      ...baseProps,
      isLoading: false,
      count: 0,
      queryObject: { q: "acme" },
      search: true,
      prefix: "orders",
      pagination: true,
    })

    const query = collectElements(tree, DataTableQuery)[0]
    expect(query.props.search).toBe(true)
    expect(query.props.prefix).toBe("orders")

    const root = collectElements(tree, DataTableRoot)[0]
    expect(root.props.noResults).toBe(true)
    expect(root.props.pagination).toBe(true)
    expect(root.props.table).toBe(baseProps.table)
  })
})

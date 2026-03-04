import React from "react"

jest.mock("../data-table-filter", () => ({
  DataTableFilter: (props: any) =>
    require("react").createElement("data-table-filter", props),
}))

import { DataTableFilter } from "../data-table-filter"
import { DataTableQuery } from "../data-table-query"

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

describe("DataTableQuery", () => {
  it("returns undefined when query controls are not configured", () => {
    expect(
      DataTableQuery({
        search: false,
        orderBy: undefined,
        filters: undefined,
        prefix: undefined,
      })
    ).toBeUndefined()
  })

  it("renders filter container and passes filters/prefix to DataTableFilter", () => {
    const tree = DataTableQuery({
      search: true,
      filters: [
        {
          key: "status",
          label: "Status",
          type: "string",
        },
      ],
      prefix: "orders",
    })

    const filters = collectElements(tree, DataTableFilter)
    expect(filters).toHaveLength(1)
    expect(filters[0].props.filters).toHaveLength(1)
    expect(filters[0].props.prefix).toBe("orders")
  })
})

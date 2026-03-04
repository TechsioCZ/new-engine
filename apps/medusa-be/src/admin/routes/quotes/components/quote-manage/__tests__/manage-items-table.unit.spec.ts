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

describe("ManageItemsTable", () => {
  it("wires variants, table config, and row-selection updater", () => {
    const setRowSelection = jest.fn()
    const onSelectionChange = jest.fn()
    const useDataTable = jest.fn(() => ({ table: { id: "table_1" } }))

    let dataTableType: any
    let ManageItemsTable: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: () => [{}, setRowSelection],
      }))

      jest.doMock("../../../../../components", () => {
        dataTableType = (props: any) =>
          (require("react").createElement("data-table", props) as any)
        return {
          DataTable: dataTableType,
        }
      })

      jest.doMock("../../../../../hooks/api", () => ({
        useVariants: () => ({
          variants: [{ id: "var_1" }],
          count: 1,
        }),
      }))

      jest.doMock("../../../../../hooks/use-data-table", () => ({
        useDataTable: (...args: any[]) => useDataTable(...args),
      }))

      jest.doMock("../table/columns", () => ({
        useManageItemsTableColumns: () => ["col"],
      }))

      jest.doMock("../table/filters", () => ({
        useManageItemsTableFilters: () => ["filter"],
      }))

      jest.doMock("../table/query", () => ({
        useManageItemsTableQuery: () => ({
          searchParams: { q: "x" },
          raw: { q: "x" },
        }),
      }))

      ManageItemsTable = require("../manage-items-table").ManageItemsTable
    })

    const tree = ManageItemsTable!({
      onSelectionChange,
      currencyCode: "usd",
    })

    const dataTableConfig = useDataTable.mock.calls[0][0]
    dataTableConfig.rowSelection.updater(() => ({ var_1: true, var_2: true }))
    dataTableConfig.rowSelection.updater({ var_3: true })

    expect(setRowSelection).toHaveBeenCalledWith({ var_1: true, var_2: true })
    expect(setRowSelection).toHaveBeenCalledWith({ var_3: true })
    expect(onSelectionChange).toHaveBeenCalledWith(["var_1", "var_2"])
    expect(onSelectionChange).toHaveBeenCalledWith(["var_3"])
    expect(dataTableConfig.getRowId({ id: "variant_1" })).toBe("variant_1")
    expect(dataTableConfig.enableRowSelection({})).toBe(true)

    const table = collectElements(tree, (element) => element.type === dataTableType)[0]
    expect(table.props.prefix).toBe("rit")
    expect(table.props.queryObject).toEqual({ q: "x" })
    expect(table.props.orderBy).toEqual(["product_id", "title", "sku"])
  })

  it("falls back to empty variants when API response omits variants", () => {
    const useDataTable = jest.fn(() => ({ table: { id: "table_2" } }))

    let ManageItemsTable: (props: any) => any

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: () => [{}, jest.fn()],
      }))

      jest.doMock("../../../../../components", () => ({
        DataTable: () => null,
      }))

      jest.doMock("../../../../../hooks/api", () => ({
        useVariants: () => ({
          count: 0,
        }),
      }))

      jest.doMock("../../../../../hooks/use-data-table", () => ({
        useDataTable: (...args: any[]) => useDataTable(...args),
      }))

      jest.doMock("../table/columns", () => ({
        useManageItemsTableColumns: () => ["col"],
      }))

      jest.doMock("../table/filters", () => ({
        useManageItemsTableFilters: () => ["filter"],
      }))

      jest.doMock("../table/query", () => ({
        useManageItemsTableQuery: () => ({
          searchParams: {},
          raw: {},
        }),
      }))

      ManageItemsTable = require("../manage-items-table").ManageItemsTable
    })

    ManageItemsTable!({
      onSelectionChange: jest.fn(),
      currencyCode: "usd",
    })

    const dataTableConfig = useDataTable.mock.calls[0][0]
    expect(dataTableConfig.data).toEqual([])
  })
})

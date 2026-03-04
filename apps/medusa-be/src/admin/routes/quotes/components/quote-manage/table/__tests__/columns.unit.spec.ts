describe("useManageItemsTableColumns", () => {
  it("builds selection + product columns and row handlers", () => {
    let useManageItemsTableColumns: (currencyCode: string) => any[]

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

      jest.doMock("@tanstack/react-table", () => ({
        createColumnHelper: () => ({
          display: (config: any) => ({ ...config }),
          accessor: (key: string, config: any) => ({ key, ...config }),
        }),
      }))

      jest.doMock("@medusajs/ui", () => ({
        Checkbox: (props: any) => ({ type: "Checkbox", props }) as any,
      }))

      jest.doMock("../../../../../../components", () => ({
        ProductCell: ({ product }: any) =>
          ({ type: "ProductCell", props: { product } }) as any,
        ProductHeader: () => ({ type: "ProductHeader", props: {} }) as any,
      }))

      useManageItemsTableColumns =
        require("../columns").useManageItemsTableColumns
    })

    const columns = useManageItemsTableColumns!("usd")
    expect(columns).toHaveLength(4)

    const toggleAllPageRowsSelected = jest.fn()
    const headerCheckbox = columns[0].header({
      table: {
        getIsSomePageRowsSelected: () => false,
        getIsAllPageRowsSelected: () => true,
        toggleAllPageRowsSelected,
      },
    })
    headerCheckbox.props.onCheckedChange(false)
    expect(toggleAllPageRowsSelected).toHaveBeenCalledWith(false)

    const indeterminateCheckbox = columns[0].header({
      table: {
        getIsSomePageRowsSelected: () => true,
        getIsAllPageRowsSelected: () => false,
        toggleAllPageRowsSelected,
      },
    })
    expect(indeterminateCheckbox.props.checked).toBe("indeterminate")

    const toggleSelected = jest.fn()
    const rowCheckbox = columns[0].cell({
      row: {
        getCanSelect: () => true,
        getIsSelected: () => true,
        toggleSelected,
      },
    })
    rowCheckbox.props.onCheckedChange(true)
    expect(toggleSelected).toHaveBeenCalledWith(true)

    const stopPropagation = jest.fn()
    rowCheckbox.props.onClick({ stopPropagation })
    expect(stopPropagation).toHaveBeenCalled()

    const disabledRowCheckbox = columns[0].cell({
      row: {
        getCanSelect: () => false,
        getIsSelected: () => false,
        toggleSelected: jest.fn(),
      },
    })
    expect(disabledRowCheckbox.props.disabled).toBe(true)

    expect(columns[1].header().type).toBeDefined()
    expect(
      columns[1].cell({ row: { original: { product: { id: "prod_1" } } } }).props
        .product
    ).toEqual({ id: "prod_1" })

    expect(columns[2].cell({ getValue: () => "SKU-1" })).toBe("SKU-1")
    expect(columns[2].cell({ getValue: () => "" })).toBe("-")
  })
})

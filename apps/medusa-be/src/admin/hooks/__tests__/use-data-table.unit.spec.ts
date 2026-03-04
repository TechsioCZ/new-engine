const mockUseReactTable = jest.fn()
const mockGetCoreRowModel = jest.fn(() => "core")
const mockGetPaginationRowModel = jest.fn(() => "pagination")
const mockGetExpandedRowModel = jest.fn(() => "expanded")

const mockUseState = jest.fn()
const mockUseMemo = jest.fn((factory: () => unknown) => factory())
const mockUseEffect = jest.fn((effect: () => void) => effect())

const mockUseSearchParams = jest.fn()

jest.mock("@tanstack/react-table", () => ({
  getCoreRowModel: () => mockGetCoreRowModel(),
  getExpandedRowModel: () => mockGetExpandedRowModel(),
  getPaginationRowModel: () => mockGetPaginationRowModel(),
  useReactTable: (...args: unknown[]) => mockUseReactTable(...args),
}))

jest.mock("react", () => ({
  useEffect: (...args: unknown[]) => mockUseEffect(...args),
  useMemo: (...args: unknown[]) => mockUseMemo(...args),
  useState: (...args: unknown[]) => mockUseState(...args),
}))

jest.mock("react-router-dom", () => ({
  useSearchParams: (...args: unknown[]) => mockUseSearchParams(...args),
}))

import { useDataTable } from "../use-data-table"

describe("useDataTable", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const prepareStateMocks = ({
    pageIndex = 0,
    pageSize = 20,
    rowSelection = {},
  }: {
    pageIndex?: number
    pageSize?: number
    rowSelection?: Record<string, unknown>
  } = {}) => {
    const setPagination = jest.fn()
    const setLocalRowSelection = jest.fn()

    mockUseState
      .mockImplementationOnce(() => [{ pageIndex, pageSize }, setPagination])
      .mockImplementationOnce(() => [rowSelection, setLocalRowSelection])

    return { setPagination, setLocalRowSelection }
  }

  it("configures react-table with pagination and updates search params on page change", () => {
    const table = { id: "table" }
    mockUseReactTable.mockReturnValue(table)
    const mockSetSearchParams = jest.fn()
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), mockSetSearchParams])
    const { setPagination } = prepareStateMocks()

    const result = useDataTable({
      data: [{ id: "row_1" }],
      columns: [],
      count: 40,
      prefix: "companies",
    })

    expect(result.table).toBe(table)

    const options = mockUseReactTable.mock.calls[0][0]
    expect(options.pageCount).toBe(2)
    expect(options.manualPagination).toBe(true)
    expect(options.state.pagination).toEqual({ pageIndex: 0, pageSize: 20 })
    expect(options.getCoreRowModel).toBe("core")
    expect(options.getPaginationRowModel).toBe("pagination")

    const nextState = options.onPaginationChange((old) => ({
      ...old,
      pageIndex: 2,
      pageSize: 20,
    }))

    expect(nextState).toEqual({ pageIndex: 2, pageSize: 20 })
    expect(setPagination).toHaveBeenCalledWith({ pageIndex: 2, pageSize: 20 })

    const updater = mockSetSearchParams.mock.calls[0][0]
    const updated = updater(new URLSearchParams("existing=1"))
    expect(updated.get("companies_offset")).toBe("40")
  })

  it("disables pagination hooks when pagination is turned off", () => {
    const table = { id: "table" }
    mockUseReactTable.mockReturnValue(table)
    mockUseSearchParams.mockReturnValue([new URLSearchParams("offset=20"), jest.fn()])
    prepareStateMocks({ pageIndex: 1 })

    useDataTable({
      data: [{ id: "row_1" }],
      columns: [],
      count: 40,
      enablePagination: false,
      enableExpandableRows: true,
    })

    const options = mockUseReactTable.mock.calls[0][0]
    expect(options.state.pagination).toBeUndefined()
    expect(options.onPaginationChange).toBeUndefined()
    expect(options.getPaginationRowModel).toBeUndefined()
    expect(options.manualPagination).toBeUndefined()
    expect(options.getExpandedRowModel).toBe("expanded")
  })

  it("uses provided rowSelection state and updater when enabled", () => {
    mockUseReactTable.mockReturnValue({ id: "table" })
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), jest.fn()])
    prepareStateMocks()
    const externalUpdater = jest.fn()
    const externalState = { row_1: true }

    useDataTable({
      data: [{ id: "row_1" }],
      columns: [],
      enableRowSelection: true,
      rowSelection: {
        state: externalState,
        updater: externalUpdater,
      },
    })

    const options = mockUseReactTable.mock.calls[0][0]
    expect(options.state.rowSelection).toBe(externalState)
    expect(options.onRowSelectionChange).toBe(externalUpdater)
  })
})

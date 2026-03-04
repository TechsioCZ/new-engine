describe("DataTableFilterContext", () => {
  it("throws when hook is used without provider context", () => {
    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useContext: () => null,
      }))

      const { useDataTableFilterContext } = require("../context")
      expect(() => useDataTableFilterContext()).toThrow(
        "useDataTableFacetedFilterContext must be used within a DataTableFacetedFilter"
      )
    })
  })

  it("returns context value when available", () => {
    jest.isolateModules(() => {
      const value = {
        removeFilter: jest.fn(),
        removeAllFilters: jest.fn(),
      }

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useContext: () => value,
      }))

      const { useDataTableFilterContext } = require("../context")
      expect(useDataTableFilterContext()).toBe(value)
    })
  })
})

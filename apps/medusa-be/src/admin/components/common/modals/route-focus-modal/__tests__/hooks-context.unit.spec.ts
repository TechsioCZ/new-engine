describe("route-focus-modal contexts and hooks", () => {
  it("useRouteModal throws when context is missing", () => {
    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useContext: () => null,
      }))

      const { useRouteModal } = require("../use-route-modal")
      expect(() => useRouteModal()).toThrow(
        "useRouteModal must be used within a RouteModalProvider"
      )
    })
  })

  it("useRouteModal returns context value when present", () => {
    jest.isolateModules(() => {
      const value = {
        handleSuccess: jest.fn(),
        setCloseOnEscape: jest.fn(),
        __internal: { closeOnEscape: true },
      }

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useContext: () => value,
      }))

      const { useRouteModal } = require("../use-route-modal")
      expect(useRouteModal()).toBe(value)
    })
  })

  it("useStackedModal throws when context is missing", () => {
    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useContext: () => null,
      }))

      const { useStackedModal } = require("../use-stacked-modal")
      expect(() => useStackedModal()).toThrow(
        "useStackedModal must be used within a StackedModalProvider"
      )
    })
  })

  it("useStackedModal returns context value when present", () => {
    jest.isolateModules(() => {
      const value = {
        getIsOpen: jest.fn(),
        setIsOpen: jest.fn(),
        register: jest.fn(),
        unregister: jest.fn(),
      }

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useContext: () => value,
      }))

      const { useStackedModal } = require("../use-stacked-modal")
      expect(useStackedModal()).toBe(value)
    })
  })
})

describe("RouteModalProvider", () => {
  it("provides context with navigation-based handleSuccess", () => {
    jest.isolateModules(() => {
      const navigate = jest.fn()
      const setCloseOnEscape = jest.fn()

      jest.doMock("react-router-dom", () => ({
        useNavigate: () => navigate,
      }))

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: () => [true, setCloseOnEscape],
        useCallback: (fn: any) => fn,
        useMemo: (fn: any) => fn(),
      }))

      const { RouteModalProvider } = require("../route-modal-provider")

      const tree = RouteModalProvider({
        prev: "/companies",
        children: "child",
      })

      const value = tree.props.value

      expect(value.__internal.closeOnEscape).toBe(true)
      expect(value.setCloseOnEscape).toBe(setCloseOnEscape)

      value.handleSuccess()
      expect(navigate).toHaveBeenCalledWith("/companies", {
        replace: true,
        state: { isSubmitSuccessful: true },
      })

      value.handleSuccess("/companies/1")
      expect(navigate).toHaveBeenCalledWith("/companies/1", {
        replace: true,
        state: { isSubmitSuccessful: true },
      })
    })
  })
})

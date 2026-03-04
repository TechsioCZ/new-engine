describe("StackedModalProvider", () => {
  it("exposes register/unregister/get/set behavior via context value", () => {
    jest.isolateModules(() => {
      let state = { existing: true } as Record<string, boolean>
      const setState = jest.fn((updater: any) => {
        state = updater(state)
      })
      const onOpenChange = jest.fn()

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: () => [state, setState],
      }))

      const { StackedModalProvider } = require("../stacked-modal-provider")

      const tree = StackedModalProvider({
        children: "child",
        onOpenChange,
      })

      const value = tree.props.value

      expect(value.getIsOpen("existing")).toBe(true)

      value.setIsOpen("modal_1", true)
      expect(setState).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(true)
      expect(state).toEqual({ existing: true, modal_1: true })

      value.register("modal_2")
      expect(state).toEqual({ existing: true, modal_1: true, modal_2: false })

      value.unregister("modal_1")
      expect(state).toEqual({ existing: true, modal_2: false })
    })
  })
})

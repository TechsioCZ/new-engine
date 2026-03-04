describe("StackedFocusModal", () => {
  it("registers on mount, unregisters on unmount and maps open changes", () => {
    jest.isolateModules(() => {
      const register = jest.fn()
      const unregister = jest.fn()
      const getIsOpen = jest.fn(() => false)
      const setIsOpen = jest.fn()

      let cleanup: undefined | (() => void)

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useEffect: (effect: any) => {
          cleanup = effect()
        },
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        const clx = (...parts: any[]) => parts.filter(Boolean).join(" ")

        const FocusModal = ({ children, ...props }: any) =>
          React.createElement("focus-modal", props, children)
        FocusModal.Close = ({ children, ...props }: any) =>
          React.createElement("focus-close", props, children)
        FocusModal.Header = ({ children, ...props }: any) =>
          React.createElement("focus-header", props, children)
        FocusModal.Body = ({ children, ...props }: any) =>
          React.createElement("focus-body", props, children)
        FocusModal.Trigger = ({ children, ...props }: any) =>
          React.createElement("focus-trigger", props, children)
        FocusModal.Footer = ({ children, ...props }: any) =>
          React.createElement("focus-footer", props, children)
        FocusModal.Title = ({ children, ...props }: any) =>
          React.createElement("focus-title", props, children)
        FocusModal.Description = ({ children, ...props }: any) =>
          React.createElement("focus-description", props, children)
        FocusModal.Content = ({ children, ...props }: any) =>
          React.createElement("focus-content", props, children)

        return { clx, FocusModal }
      })

      jest.doMock("../use-stacked-modal", () => ({
        useStackedModal: () => ({
          register,
          unregister,
          getIsOpen,
          setIsOpen,
        }),
      }))

      const { Root, StackedFocusModal } = require("../stacked-focus-modal")

      const tree = Root({ id: "modal_1", children: "child" })

      expect(register).toHaveBeenCalledWith("modal_1")
      expect(getIsOpen).toHaveBeenCalledWith("modal_1")
      expect(tree.props.open).toBe(false)

      tree.props.onOpenChange(true)
      expect(setIsOpen).toHaveBeenCalledWith("modal_1", true)

      cleanup?.()
      expect(unregister).toHaveBeenCalledWith("modal_1")

      const renderedContent = StackedFocusModal.Content.render(
        { className: "extra" },
        null
      )
      expect(renderedContent.props.className).toContain("!top-6")
      expect(renderedContent.props.className).toContain("extra")
      expect(renderedContent.props.overlayProps).toEqual({
        className: "bg-transparent",
      })
    })
  })
})

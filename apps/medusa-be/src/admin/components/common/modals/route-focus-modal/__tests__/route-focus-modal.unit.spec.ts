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

const renderElements = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(renderElements)
  }

  if (!React.isValidElement(value)) {
    return value
  }

  if (typeof value.type === "function") {
    return renderElements(value.type(value.props))
  }

  return React.cloneElement(value, {
    ...value.props,
    children: renderElements(value.props?.children),
  })
}

describe("RouteFocusModal", () => {
  it("opens on mount, handles close navigation, and resets on unmount", () => {
    jest.isolateModules(() => {
      const navigate = jest.fn()
      const setOpen = jest.fn()
      const setStackedModalOpen = jest.fn()
      let cleanup: undefined | (() => void)

      ;(global as any).document = { body: { style: {} } }

      jest.doMock("react-router-dom", () => ({
        useNavigate: () => navigate,
      }))

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: jest
          .fn()
          .mockImplementationOnce(() => [false, setOpen])
          .mockImplementationOnce(() => [false, setStackedModalOpen]),
        useEffect: (effect: any) => {
          cleanup = effect()
        },
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        const clx = (...parts: any[]) =>
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
            .join(" ")

        const FocusModal = ({ children, ...props }: any) =>
          React.createElement("focus-modal", props, children)
        FocusModal.Title = ({ children, ...props }: any) =>
          React.createElement("focus-title", props, children)
        FocusModal.Description = ({ children, ...props }: any) =>
          React.createElement("focus-description", props, children)
        FocusModal.Content = ({ children, ...props }: any) =>
          React.createElement("focus-content", props, children)
        FocusModal.Header = ({ children, ...props }: any) =>
          React.createElement("focus-header", props, children)
        FocusModal.Footer = ({ children, ...props }: any) =>
          React.createElement("focus-footer", props, children)
        FocusModal.Body = ({ children, ...props }: any) =>
          React.createElement("focus-body", props, children)
        FocusModal.Close = ({ children, ...props }: any) =>
          React.createElement("focus-close", props, children)

        return { clx, FocusModal }
      })

      jest.doMock("../route-modal-provider", () => {
        const React = jest.requireActual("react")
        return {
          RouteModalProvider: ({ children, ...props }: any) =>
            React.createElement("route-modal-provider", props, children),
        }
      })

      jest.doMock("../stacked-modal-provider", () => {
        const React = jest.requireActual("react")
        return {
          StackedModalProvider: ({ children, ...props }: any) =>
            React.createElement("stacked-modal-provider", props, children),
        }
      })

      const { RouteFocusModal } = require("../route-focus-modal")

      const tree = RouteFocusModal({ prev: "/companies", children: "child" })

      expect(setOpen).toHaveBeenCalledWith(true)
      expect(tree.props.open).toBe(false)

      tree.props.onOpenChange(false)
      expect((global as any).document.body.style.pointerEvents).toBe("auto")
      expect(navigate).toHaveBeenCalledWith("/companies", { replace: true })

      tree.props.onOpenChange(true)
      expect(setOpen).toHaveBeenCalledWith(true)

      cleanup?.()
      expect(setOpen).toHaveBeenCalledWith(false)
      expect(setStackedModalOpen).toHaveBeenCalledWith(false)
    })
  })

  it("prevents escape close when route-modal context disables closeOnEscape", () => {
    jest.isolateModules(() => {
      const setOpen = jest.fn()
      const navigate = jest.fn()

      ;(global as any).document = { body: { style: {} } }

      jest.doMock("react-router-dom", () => ({
        useNavigate: () => navigate,
      }))

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: jest
          .fn()
          .mockImplementationOnce(() => [true, setOpen])
          .mockImplementationOnce(() => [false, jest.fn()]),
        useEffect: () => undefined,
      }))

      jest.doMock("../use-route-modal", () => ({
        useRouteModal: () => ({
          __internal: {
            closeOnEscape: false,
          },
        }),
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        const clx = (...parts: any[]) =>
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
            .join(" ")

        const FocusModal = ({ children, ...props }: any) =>
          React.createElement("focus-modal", props, children)
        FocusModal.Title = ({ children, ...props }: any) =>
          React.createElement("focus-title", props, children)
        FocusModal.Description = ({ children, ...props }: any) =>
          React.createElement("focus-description", props, children)
        FocusModal.Content = ({ children, ...props }: any) =>
          React.createElement("focus-content", props, children)
        FocusModal.Header = ({ children, ...props }: any) =>
          React.createElement("focus-header", props, children)
        FocusModal.Footer = ({ children, ...props }: any) =>
          React.createElement("focus-footer", props, children)
        FocusModal.Body = ({ children, ...props }: any) =>
          React.createElement("focus-body", props, children)
        FocusModal.Close = ({ children, ...props }: any) =>
          React.createElement("focus-close", props, children)

        return { clx, FocusModal }
      })

      jest.doMock("../route-modal-provider", () => {
        const React = jest.requireActual("react")
        return {
          RouteModalProvider: ({ children, ...props }: any) =>
            React.createElement("route-modal-provider", props, children),
        }
      })

      jest.doMock("../stacked-modal-provider", () => {
        const React = jest.requireActual("react")
        return {
          StackedModalProvider: ({ children, ...props }: any) =>
            React.createElement("stacked-modal-provider", props, children),
        }
      })

      const { RouteFocusModal } = require("../route-focus-modal")
      const tree = RouteFocusModal({ prev: "/companies", children: "child" })
      const contentElement = tree.props.children[2].props.children.props.children
      const focusContent = contentElement.type(contentElement.props)
      const preventDefault = jest.fn()

      focusContent.props.onEscapeKeyDown({ preventDefault })
      expect(preventDefault).toHaveBeenCalled()
      expect(tree.props.open).toBe(true)
    })
  })

  it("uses default prev route and does not wire escape handler when closeOnEscape is true", () => {
    jest.isolateModules(() => {
      const setOpen = jest.fn()
      const navigate = jest.fn()

      ;(global as any).document = { body: { style: {} } }

      jest.doMock("react-router-dom", () => ({
        useNavigate: () => navigate,
      }))

      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useState: jest
          .fn()
          .mockImplementationOnce(() => [false, setOpen])
          .mockImplementationOnce(() => [true, jest.fn()]),
        useEffect: () => undefined,
      }))

      jest.doMock("../use-route-modal", () => ({
        useRouteModal: () => ({
          __internal: {
            closeOnEscape: true,
          },
        }),
      }))

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        const clx = (...parts: any[]) =>
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
            .join(" ")

        const FocusModal = ({ children, ...props }: any) =>
          React.createElement("focus-modal", props, children)
        FocusModal.Title = ({ children, ...props }: any) =>
          React.createElement("focus-title", props, children)
        FocusModal.Description = ({ children, ...props }: any) =>
          React.createElement("focus-description", props, children)
        FocusModal.Content = ({ children, ...props }: any) =>
          React.createElement("focus-content", props, children)
        FocusModal.Header = ({ children, ...props }: any) =>
          React.createElement("focus-header", props, children)
        FocusModal.Footer = ({ children, ...props }: any) =>
          React.createElement("focus-footer", props, children)
        FocusModal.Body = ({ children, ...props }: any) =>
          React.createElement("focus-body", props, children)
        FocusModal.Close = ({ children, ...props }: any) =>
          React.createElement("focus-close", props, children)

        return { clx, FocusModal }
      })

      jest.doMock("../route-modal-provider", () => {
        const React = jest.requireActual("react")
        return {
          RouteModalProvider: ({ children, ...props }: any) =>
            React.createElement("route-modal-provider", props, children),
        }
      })

      jest.doMock("../stacked-modal-provider", () => {
        const React = jest.requireActual("react")
        return {
          StackedModalProvider: ({ children, ...props }: any) =>
            React.createElement("stacked-modal-provider", props, children),
        }
      })

      const { RouteFocusModal } = require("../route-focus-modal")
      const tree = RouteFocusModal({ children: "child" })

      tree.props.onOpenChange(false)
      expect(navigate).toHaveBeenCalledWith("..", { replace: true })

      const contentElement = tree.props.children[2].props.children.props.children
      const focusContent = contentElement.type(contentElement.props)
      expect(focusContent.props.onEscapeKeyDown).toBeUndefined()
    })
  })
})

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

const loadStringFilter = ({
  currentValue,
}: {
  currentValue: string[]
}) => {
  const add = jest.fn()
  const deleteParam = jest.fn()
  const removeFilter = jest.fn()

  let rootType: any
  let contentType: any
  let inputType: any
  let filterChipType: any
  let StringFilter: (props: any) => any

  jest.isolateModules(() => {
    jest.doMock("react", () => ({
      ...jest.requireActual("react"),
      useCallback: (callback: unknown) => callback,
      useEffect: (callback: () => unknown) => {
        callback()
      },
      useState: (value: unknown) => [value, jest.fn()],
    }))

    jest.doMock("lodash", () => ({
      debounce: (fn: any) => {
        const debounced = (...args: any[]) => fn(...args)
        debounced.cancel = jest.fn()
        return debounced
      },
    }))

    jest.doMock("@medusajs/ui", () => {
      const React = require("react")
      inputType = ({ children, ...props }: any) =>
        React.createElement("input-component", props, children)
      return {
        clx: (...parts: any[]) => parts.filter(Boolean).join(" "),
        Input: inputType,
        Label: ({ children, ...props }: any) =>
          React.createElement("label-component", props, children),
      }
    })

    jest.doMock("@radix-ui/react-popover", () => {
      const React = require("react")
      rootType = ({ children, ...props }: any) =>
        React.createElement("popover-root", props, children)
      contentType = ({ children, ...props }: any) =>
        React.createElement("popover-content", props, children)

      return {
        Root: rootType,
        Portal: ({ children, ...props }: any) =>
          React.createElement("popover-portal", props, children),
        Content: contentType,
      }
    })

    jest.doMock("../../hooks", () => ({
      useSelectedParams: () => ({
        add,
        delete: deleteParam,
        get: () => currentValue,
      }),
    }))

    jest.doMock("../context", () => ({
      useDataTableFilterContext: () => ({
        removeFilter,
      }),
    }))

    jest.doMock("../filter-chip", () => {
      filterChipType = (props: any) =>
        (require("react").createElement("filter-chip", props) as any)
      return {
        __esModule: true,
        default: filterChipType,
      }
    })

    StringFilter = require("../string-filter").StringFilter
  })

  const tree = StringFilter!({
    filter: { key: "name", label: "Name" },
    openOnMount: true,
    prefix: "orders",
  })

  return {
    tree,
    add,
    deleteParam,
    removeFilter,
    rootType,
    contentType,
    inputType,
    filterChipType,
  }
}

describe("StringFilter", () => {
  it("updates/deletes selected query values and handles chip removal", () => {
    const {
      tree,
      add,
      deleteParam,
      removeFilter,
      contentType,
      inputType,
      filterChipType,
    } = loadStringFilter({
      currentValue: ["acme"],
    })

    const input = collectElements(
      tree,
      (element) =>
        element.type === inputType && typeof element.props?.onChange === "function"
    )[0]

    input.props.onChange({ target: { value: "globex" } })
    input.props.onChange({ target: { value: "" } })

    expect(add).toHaveBeenCalledWith("globex")
    expect(deleteParam).toHaveBeenCalled()

    const chip = collectElements(
      tree,
      (element) => element.type === filterChipType
    )[0]
    chip.props.onRemove()

    expect(deleteParam).toHaveBeenCalledTimes(2)
    expect(removeFilter).toHaveBeenCalledWith("name")

    const popoverContent = collectElements(
      tree,
      (element) => element.type === contentType
    )[0]

    const previousHTMLElement = (global as any).HTMLElement
    class HTMLElementMock {}
    ;(global as any).HTMLElement = HTMLElementMock as any

    const preventDefault = jest.fn()
    const stopPropagation = jest.fn()
    const target = new (HTMLElementMock as any)()
    target.attributes = {
      getNamedItem: () => ({ value: "filters_menu_content" }),
    }

    popoverContent.props.onInteractOutside({
      target,
      preventDefault,
      stopPropagation,
    })

    expect(preventDefault).toHaveBeenCalled()
    expect(stopPropagation).toHaveBeenCalled()

    ;(global as any).HTMLElement = previousHTMLElement
  })

  it("removes filter when closed and there is no selected query", () => {
    jest.useFakeTimers()

    const { tree, removeFilter, rootType } = loadStringFilter({
      currentValue: [],
    })

    const popoverRoot = collectElements(tree, (element) => element.type === rootType)[0]
    popoverRoot.props.onOpenChange(false)

    jest.advanceTimersByTime(250)

    expect(removeFilter).toHaveBeenCalledWith("name")

    jest.useRealTimers()
  })
})

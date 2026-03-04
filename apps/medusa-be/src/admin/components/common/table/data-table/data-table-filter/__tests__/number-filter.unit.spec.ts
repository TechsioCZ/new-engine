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

const loadNumberFilter = ({
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
  let NumberFilter: (props: any) => any

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

    jest.doMock("react-i18next", () => ({
      useTranslation: () => ({
        t: (key: string, values?: { value: unknown }) =>
          values?.value !== undefined ? `${key}:${values.value}` : key,
      }),
    }))

    jest.doMock("@medusajs/icons", () => ({
      EllipseMiniSolid: () => null,
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

    jest.doMock("@radix-ui/react-radio-group", () => {
      const React = require("react")
      const Root = ({ children, ...props }: any) =>
        React.createElement("radio-group-root", props, children)
      const Item = ({ children, ...props }: any) =>
        React.createElement("radio-group-item", props, children)
      const Indicator = ({ children, ...props }: any) =>
        React.createElement("radio-group-indicator", props, children)
      return {
        Root,
        Item,
        Indicator,
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

    NumberFilter = require("../number-filter").NumberFilter
  })

  const tree = NumberFilter!({
    filter: { key: "price", label: "Price" },
    openOnMount: true,
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

describe("NumberFilter", () => {
  it("handles range comparisons, filter chip removal, and outside interaction", () => {
    const {
      tree,
      add,
      deleteParam,
      removeFilter,
      contentType,
      inputType,
      filterChipType,
    } = loadNumberFilter({
      currentValue: ['{"gt":10,"lt":20}'],
    })

    const inputs = collectElements(
      tree,
      (element) =>
        element.type === inputType && typeof element.props?.onChange === "function"
    )

    const gtInput = inputs.find((input) => input.props?.name === "price-gt")
    const ltInput = inputs.find((input) => input.props?.name === "price-lt")

    gtInput.props.onChange({ target: { value: "12" } })
    ltInput.props.onChange({ target: { value: "" } })

    expect(add).toHaveBeenCalledWith(JSON.stringify({ gt: "12", lt: 20 }))
    expect(add).toHaveBeenCalledWith(JSON.stringify({ gt: 10 }))

    const chip = collectElements(
      tree,
      (element) => element.type === filterChipType
    )[0]
    chip.props.onRemove()

    expect(deleteParam).toHaveBeenCalled()
    expect(removeFilter).toHaveBeenCalledWith("price")

    const popoverContent = collectElements(
      tree,
      (element) => element.type === contentType
    )[0]

    const previousHTMLElement = (global as any).HTMLElement
    class HTMLElementMock {}
    ;(global as any).HTMLElement = HTMLElementMock as any

    const preventDefault = jest.fn()
    const target = new (HTMLElementMock as any)()
    target.attributes = {
      getNamedItem: () => ({ value: "filters_menu_content" }),
    }

    popoverContent.props.onInteractOutside({
      target,
      preventDefault,
    })

    expect(preventDefault).toHaveBeenCalled()
    ;(global as any).HTMLElement = previousHTMLElement
  })

  it("handles exact comparison add/delete and removes filter after close", () => {
    const exactLoad = loadNumberFilter({
      currentValue: ["5"],
    })

    const exactInput = collectElements(
      exactLoad.tree,
      (element) =>
        element.type === exactLoad.inputType &&
        element.props?.name === "price" &&
        typeof element.props?.onChange === "function"
    )[0]

    exactInput.props.onChange({ target: { value: "9" } })
    exactInput.props.onChange({ target: { value: "" } })

    expect(exactLoad.add).toHaveBeenCalledWith("9")
    expect(exactLoad.deleteParam).toHaveBeenCalled()

    jest.useFakeTimers()

    const emptyLoad = loadNumberFilter({
      currentValue: [],
    })
    const popoverRoot = collectElements(
      emptyLoad.tree,
      (element) => element.type === emptyLoad.rootType
    )[0]

    popoverRoot.props.onOpenChange(false)
    jest.advanceTimersByTime(250)

    expect(emptyLoad.removeFilter).toHaveBeenCalledWith("price")

    jest.useRealTimers()
  })
})

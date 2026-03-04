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

const loadSelectFilter = ({
  currentValue,
  searchable = true,
  multiple = true,
  openOnMount = true,
  searchRefValue = { focus: jest.fn() },
}: {
  currentValue: string[]
  searchable?: boolean
  multiple?: boolean
  openOnMount?: boolean
  searchRefValue?: { focus: jest.Mock } | null
}) => {
  const add = jest.fn()
  const deleteParam = jest.fn()
  const removeFilter = jest.fn()
  const setSearch = jest.fn()
  const searchRef = searchRefValue

  let rootType: any
  let contentType: any
  let filterChipType: any
  let commandItemType: any
  let SelectFilter: (props: any) => any

  jest.isolateModules(() => {
    let stateCall = 0

    jest.doMock("react", () => ({
      ...jest.requireActual("react"),
      useState: (initialValue: unknown) => {
        stateCall += 1

        if (stateCall === 1) {
          return [openOnMount, jest.fn()]
        }

        if (stateCall === 2) {
          return ["term", setSearch]
        }

        if (stateCall === 3) {
          return [searchRef, jest.fn()]
        }

        return [initialValue, jest.fn()]
      },
    }))

    jest.doMock("react-i18next", () => ({
      useTranslation: () => ({
        t: (value: string) => value,
      }),
    }))

    jest.doMock("@medusajs/icons", () => ({
      CheckMini: () => null,
      EllipseMiniSolid: () => null,
      XMarkMini: () => null,
    }))

    jest.doMock("@medusajs/ui", () => ({
      clx: (...parts: any[]) =>
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
          .join(" "),
    }))

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

    jest.doMock("cmdk", () => {
      const React = require("react")
      const Command = ({ children, ...props }: any) =>
        React.createElement("command-root", props, children)
      Command.Input = ({ children, ...props }: any) =>
        React.createElement("command-input", props, children)
      Command.Empty = ({ children, ...props }: any) =>
        React.createElement("command-empty", props, children)
      Command.List = ({ children, ...props }: any) =>
        React.createElement("command-list", props, children)
      commandItemType = ({ children, ...props }: any) =>
        React.createElement("command-item", props, children)
      Command.Item = commandItemType

      return {
        Command,
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

    SelectFilter = require("../select-filter").SelectFilter
  })

  const tree = SelectFilter!({
    filter: { key: "status", label: "Status" },
    multiple,
    openOnMount,
    options: [
      { label: "Active", value: "active" },
      { label: "Draft", value: "draft" },
    ],
    searchable,
  })

  return {
    tree,
    add,
    deleteParam,
    removeFilter,
    setSearch,
    searchRef,
    rootType,
    contentType,
    filterChipType,
    commandItemType,
  }
}

describe("SelectFilter", () => {
  it("selects/unselects options, clears search, and removes filter from chip", () => {
    const {
      tree,
      add,
      deleteParam,
      removeFilter,
      setSearch,
      searchRef,
      contentType,
      filterChipType,
      commandItemType,
    } = loadSelectFilter({
      currentValue: ["active"],
    })

    const items = collectElements(
      tree,
      (element) => element.type === commandItemType
    )

    items[0].props.onSelect()
    items[1].props.onSelect()

    expect(deleteParam).toHaveBeenCalledWith("active")
    expect(add).toHaveBeenCalledWith("draft")

    const clearButton = collectElements(
      tree,
      (element) => element.type === "button" && typeof element.props?.onClick === "function"
    )[0]
    clearButton.props.onClick()

    expect(setSearch).toHaveBeenCalledWith("")
    expect(searchRef.focus).toHaveBeenCalled()

    const chip = collectElements(
      tree,
      (element) => element.type === filterChipType
    )[0]
    chip.props.onRemove()

    expect(deleteParam).toHaveBeenCalled()
    expect(removeFilter).toHaveBeenCalledWith("status")

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

  it("removes the filter when popover closes with no selected values", () => {
    jest.useFakeTimers()

    const { tree, removeFilter, rootType } = loadSelectFilter({
      currentValue: [],
      searchable: false,
    })

    const popoverRoot = collectElements(tree, (element) => element.type === rootType)[0]
    popoverRoot.props.onOpenChange(false)

    jest.advanceTimersByTime(250)

    expect(removeFilter).toHaveBeenCalledWith("status")

    jest.useRealTimers()
  })

  it("handles non-matching outside interactions and single-select rendering branches", () => {
    const { tree, rootType, contentType } = loadSelectFilter({
      currentValue: [],
      searchable: false,
      multiple: false,
    })

    const popoverRoot = collectElements(tree, (element) => element.type === rootType)[0]
    popoverRoot.props.onOpenChange(true)

    const popoverContent = collectElements(
      tree,
      (element) => element.type === contentType
    )[0]
    const previousHTMLElement = (global as any).HTMLElement
    class HTMLElementMock {}
    ;(global as any).HTMLElement = HTMLElementMock as any

    const target = new (HTMLElementMock as any)()
    target.attributes = {
      getNamedItem: () => ({ value: "other" }),
    }
    const preventDefault = jest.fn()
    const stopPropagation = jest.fn()
    popoverContent.props.onInteractOutside({
      target,
      preventDefault,
      stopPropagation,
    })

    expect(preventDefault).not.toHaveBeenCalled()
    expect(stopPropagation).not.toHaveBeenCalled()

    ;(global as any).HTMLElement = previousHTMLElement
  })

  it("clears scheduled filter-removal timeout and handles missing search ref", () => {
    jest.useFakeTimers()

    const { tree, setSearch, rootType } = loadSelectFilter({
      currentValue: [],
      searchable: true,
      searchRefValue: null,
    })

    const popoverRoot = collectElements(tree, (element) => element.type === rootType)[0]
    popoverRoot.props.onOpenChange(false)
    popoverRoot.props.onOpenChange(false)

    const clearButton = collectElements(
      tree,
      (element) => element.type === "button" && typeof element.props?.onClick === "function"
    )[0]
    clearButton.props.onClick()
    expect(setSearch).toHaveBeenCalledWith("")

    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })
})

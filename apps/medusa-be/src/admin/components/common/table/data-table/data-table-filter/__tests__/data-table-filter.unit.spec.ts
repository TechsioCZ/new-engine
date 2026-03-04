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

const loadDataTableFilter = ({
  activeFilters = [],
  search = "",
  readonly = false,
  prefix = "orders",
  initialMount = true,
}: {
  activeFilters?: any[]
  search?: string
  readonly?: boolean
  prefix?: string
  initialMount?: boolean
}) => {
  const setOpen = jest.fn()
  let activeState = activeFilters
  const setActiveFilters = jest.fn((next) => {
    activeState = typeof next === "function" ? next(activeState) : next
    return activeState
  })
  const setSearchParams = jest.fn()
  const removeFilter = jest.fn()
  const removeAllFilters = jest.fn()

  let selectFilterType: any
  let stringFilterType: any
  let numberFilterType: any
  let DataTableFilter: (props: any) => any

  const filters = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ label: "Open", value: "open" }],
      multiple: true,
      searchable: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
    },
  ]

  jest.isolateModules(() => {
    let stateCall = 0

    jest.doMock("react", () => ({
      ...jest.requireActual("react"),
      useCallback: (callback: unknown) => callback,
      useEffect: (callback: () => unknown) => {
        callback()
      },
      useMemo: (factory: () => unknown) => factory(),
      useRef: () => ({ current: initialMount }),
      useState: (initialValue: unknown) => {
        stateCall += 1

        if (stateCall === 1) {
          return [false, setOpen]
        }

        if (stateCall === 2) {
          return [activeState, setActiveFilters]
        }

        return [initialValue, jest.fn()]
      },
    }))

    jest.doMock("react-i18next", () => ({
      useTranslation: () => ({
        t: (value: string) => value,
      }),
    }))

    jest.doMock("react-router-dom", () => ({
      useSearchParams: () => [new URLSearchParams(search), setSearchParams],
    }))

    jest.doMock("@medusajs/ui", () => ({
      Button: ({ children, ...props }: any) =>
        require("react").createElement("button-component", props, children),
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
      return {
        Root: ({ children, ...props }: any) =>
          React.createElement("popover-root", props, children),
        Trigger: ({ children, ...props }: any) =>
          React.createElement("popover-trigger", props, children),
        Portal: ({ children, ...props }: any) =>
          React.createElement("popover-portal", props, children),
        Content: ({ children, ...props }: any) =>
          React.createElement("popover-content", props, children),
      }
    })

    jest.doMock("../context", () => {
      const React = require("react")
      return {
        DataTableFilterContext: {
          Provider: ({ children, ...props }: any) =>
            React.createElement("context-provider", props, children),
        },
        useDataTableFilterContext: () => ({
          removeFilter,
          removeAllFilters,
        }),
      }
    })

    jest.doMock("../select-filter", () => {
      selectFilterType = (props: any) =>
        (require("react").createElement("select-filter", props) as any)
      return {
        SelectFilter: selectFilterType,
      }
    })

    jest.doMock("../string-filter", () => {
      stringFilterType = (props: any) =>
        (require("react").createElement("string-filter", props) as any)
      return {
        StringFilter: stringFilterType,
      }
    })

    jest.doMock("../number-filter", () => {
      numberFilterType = (props: any) =>
        (require("react").createElement("number-filter", props) as any)
      return {
        NumberFilter: numberFilterType,
      }
    })

    DataTableFilter = require("../data-table-filter").DataTableFilter
  })

  const tree = DataTableFilter!({
    filters,
    prefix,
    readonly,
  })

  return {
    tree,
    filters,
    setOpen,
    setActiveFilters,
    setSearchParams,
    removeFilter,
    removeAllFilters,
    selectFilterType,
    stringFilterType,
    numberFilterType,
  }
}

describe("DataTableFilter", () => {
  it("hydrates filters from URL and adds a new filter from the popover menu", () => {
    const { tree, setOpen, setActiveFilters } = loadDataTableFilter({
      activeFilters: [],
      search: "orders_status=open",
    })

    expect(setActiveFilters).toHaveBeenCalled()

    const menuItems = collectElements(
      tree,
      (element) =>
        element.type === "div" &&
        element.props?.role === "menuitem" &&
        typeof element.props?.onClick === "function"
    )

    menuItems[0].props.onClick()

    expect(setOpen).toHaveBeenCalledWith(false)
    expect(setActiveFilters).toHaveBeenCalled()
  })

  it("renders typed filters and clears all active filter query params", () => {
    const activeFilters = [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [{ label: "Open", value: "open" }],
        multiple: true,
        searchable: true,
        openOnMount: false,
      },
      {
        key: "name",
        label: "Name",
        type: "string",
        openOnMount: false,
      },
      {
        key: "amount",
        label: "Amount",
        type: "number",
        openOnMount: false,
      },
    ]

    const {
      tree,
      filters,
      setSearchParams,
      removeAllFilters,
      selectFilterType,
      stringFilterType,
      numberFilterType,
    } = loadDataTableFilter({
      activeFilters,
      search: "orders_status=open&orders_name=acme&orders_amount=10",
    })

    expect(
      collectElements(tree, (element) => element.type === selectFilterType).length
    ).toBe(1)
    expect(
      collectElements(tree, (element) => element.type === stringFilterType).length
    ).toBe(1)
    expect(
      collectElements(tree, (element) => element.type === numberFilterType).length
    ).toBe(1)

    const clearAllComponent = collectElements(
      tree,
      (element) => typeof element.type === "function" && Array.isArray(element.props?.filters)
    )[0]

    const clearButton = clearAllComponent.type(clearAllComponent.props)
    expect(clearButton.props.type).toBe("button")

    clearButton.props.onClick()

    const updater = setSearchParams.mock.calls[0][0]
    const updated = updater(
      new URLSearchParams("orders_status=open&orders_name=acme&orders_amount=10")
    )

    filters.forEach((filter: any) => {
      expect(updated.get(`orders_${filter.key}`)).toBeNull()
    })
    expect(removeAllFilters).toHaveBeenCalled()
  })

  it("invokes provider callbacks and handles popover close autofocus branches", () => {
    const { tree, setActiveFilters } = loadDataTableFilter({
      activeFilters: [
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [{ label: "Open", value: "open" }],
          multiple: true,
          searchable: true,
          openOnMount: true,
        },
      ],
      search: "orders_status=open",
    })

    const renderedTree = renderElements(tree)
    const provider = collectElements(
      renderedTree,
      (element) => element.type === "context-provider"
    )[0]
    provider.props.value.removeFilter("status")
    provider.props.value.removeAllFilters()
    expect(setActiveFilters).toHaveBeenCalled()

    const popoverContent = collectElements(
      renderedTree,
      (element) => element.type === "popover-content"
    )[0]
    const preventDefault = jest.fn()
    popoverContent.props.onCloseAutoFocus({ preventDefault })
    expect(preventDefault).toHaveBeenCalled()

    const second = loadDataTableFilter({
      activeFilters: [
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [{ label: "Open", value: "open" }],
          openOnMount: false,
        },
      ],
      search: "orders_status=open",
    })
    const secondRenderedTree = renderElements(second.tree)
    const secondContent = collectElements(
      secondRenderedTree,
      (element) => element.type === "popover-content"
    )[0]
    const secondPrevent = jest.fn()
    secondContent.props.onCloseAutoFocus({ preventDefault: secondPrevent })
    expect(secondPrevent).not.toHaveBeenCalled()
  })

  it("hydrates unprefixed string filters and supports unsupported filter types", () => {
    const unprefixed = loadDataTableFilter({
      activeFilters: [],
      search: "name=acme",
      prefix: "",
    })
    expect(unprefixed.tree).toBeTruthy()

    const withDateFilter = loadDataTableFilter({
      activeFilters: [
        {
          key: "created_at",
          label: "Created At",
          type: "date",
          openOnMount: false,
        },
      ],
      readonly: true,
      prefix: "",
    })
    expect(withDateFilter.tree).toBeTruthy()

    const withNoInitialMount = loadDataTableFilter({
      activeFilters: [],
      search: "name=acme",
      prefix: "",
      initialMount: false,
    })
    expect(withNoInitialMount.setActiveFilters).not.toHaveBeenCalled()
  })
})

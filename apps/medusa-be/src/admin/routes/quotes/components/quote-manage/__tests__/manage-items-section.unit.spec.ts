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

const loadModule = ({
  addItemsImpl,
  filterTerm = "",
}: {
  addItemsImpl: jest.Mock
  filterTerm?: string
}) => {
  const setFilterTerm = jest.fn()
  const setIsOpen = jest.fn()
  const toastError = jest.fn()

  let manageItemsTableType: any
  let buttonType: any
  let inputType: any
  let ManageItemsSection: (props: any) => any

  jest.isolateModules(() => {
    jest.doMock("react", () => ({
      ...jest.requireActual("react"),
      useMemo: (factory: () => unknown) => factory(),
      useState: () => [filterTerm, setFilterTerm],
    }))

    jest.doMock("react-i18next", () => ({
      useTranslation: () => ({
        t: (value: string) => value,
      }),
    }))

    jest.doMock("@medusajs/ui", () => {
      const React = require("react")
      buttonType = ({ children, ...props }: any) =>
        React.createElement("button-component", props, children)
      inputType = ({ children, ...props }: any) =>
        React.createElement("input-component", props, children)
      return {
        Button: buttonType,
        Heading: ({ children, ...props }: any) =>
          React.createElement("heading-component", props, children),
        Input: inputType,
        toast: {
          error: toastError,
        },
      }
    })

    jest.doMock("../../../../../components/common/modals/route-focus-modal", () => {
      const React = require("react")
      const StackedFocusModal = ({ children, ...props }: any) =>
        React.createElement("stacked-focus-modal", props, children)
      StackedFocusModal.Trigger = ({ children, ...props }: any) =>
        React.createElement("stacked-trigger", props, children)
      StackedFocusModal.Content = ({ children, ...props }: any) =>
        React.createElement("stacked-content", props, children)
      StackedFocusModal.Header = ({ children, ...props }: any) =>
        React.createElement("stacked-header", props, children)
      StackedFocusModal.Footer = ({ children, ...props }: any) =>
        React.createElement("stacked-footer", props, children)

      const RouteFocusModal = {
        Close: ({ children, ...props }: any) =>
          React.createElement("route-close", props, children),
      }

      return {
        RouteFocusModal,
        StackedFocusModal,
        useStackedModal: () => ({
          setIsOpen,
        }),
      }
    })

    jest.doMock("../../../../../hooks/api", () => ({
      useAddItemsToQuote: () => ({
        mutateAsync: addItemsImpl,
        isPending: false,
      }),
    }))

    jest.doMock("../manage-item", () => {
      const React = require("react")
      return {
        ManageItem: (props: any) => React.createElement("manage-item", props),
      }
    })

    jest.doMock("../manage-items-table", () => {
      manageItemsTableType = (props: any) =>
        (require("react").createElement("manage-items-table", props) as any)
      return {
        ManageItemsTable: manageItemsTableType,
      }
    })

    ManageItemsSection = require("../manage-items-section").ManageItemsSection
  })

  return {
    ManageItemsSection: ManageItemsSection!,
    manageItemsTableType,
    buttonType,
    inputType,
    setFilterTerm,
    setIsOpen,
    toastError,
  }
}

describe("ManageItemsSection", () => {
  const order = {
    id: "order_1",
    currency_code: "usd",
    items: [{ id: "item_1" }],
  }

  const preview = {
    id: "order_1",
    items: [
      {
        id: "item_1",
        title: "First Item",
        product_title: "Product",
      },
    ],
  }

  it("adds selected variants and closes stacked modal", async () => {
    const addItemsImpl = jest.fn().mockResolvedValue(undefined)
    const {
      ManageItemsSection,
      manageItemsTableType,
      buttonType,
      inputType,
      setFilterTerm,
      setIsOpen,
    } =
      loadModule({ addItemsImpl })

    const tree = ManageItemsSection({ order, preview })

    const searchInput = collectElements(
      tree,
      (element) => element.type === inputType && element.props?.type === "search"
    )[0]
    searchInput.props.onChange({ target: { value: "abc" } })
    expect(setFilterTerm).toHaveBeenCalledWith("abc")

    const table = collectElements(
      tree,
      (element) => element.type === manageItemsTableType
    )[0]
    table.props.onSelectionChange(["var_1", "var_2"])

    const saveButton = collectElements(
      tree,
      (element) =>
        element.type === buttonType && typeof element.props?.onClick === "function"
    )[0]

    await saveButton.props.onClick()

    expect(addItemsImpl).toHaveBeenCalledWith({
      items: [
        { variant_id: "var_1", quantity: 1 },
        { variant_id: "var_2", quantity: 1 },
      ],
    })
    expect(setIsOpen).toHaveBeenCalledWith("inbound-items", false)
  })

  it("shows toast error when add items fails", async () => {
    const addItemsImpl = jest.fn().mockRejectedValue(new Error("add failed"))
    const {
      ManageItemsSection,
      manageItemsTableType,
      buttonType,
      toastError,
      setIsOpen,
    } = loadModule({ addItemsImpl })

    const tree = ManageItemsSection({ order, preview })
    const table = collectElements(
      tree,
      (element) => element.type === manageItemsTableType
    )[0]
    table.props.onSelectionChange(["var_1"])

    const saveButton = collectElements(
      tree,
      (element) =>
        element.type === buttonType && typeof element.props?.onClick === "function"
    )[0]

    await saveButton.props.onClick()

    expect(toastError).toHaveBeenCalledWith("add failed")
    expect(setIsOpen).toHaveBeenCalledWith("inbound-items", false)
  })

  it("renders empty-state placeholder when search has no matches", () => {
    const addItemsImpl = jest.fn().mockResolvedValue(undefined)
    const { ManageItemsSection } = loadModule({
      addItemsImpl,
      filterTerm: "no-match",
    })

    const tree = ManageItemsSection({ order, preview })
    const emptyState = collectElements(
      tree,
      (element) =>
        element.type === "div" &&
        typeof element.props?.className === "string" &&
        element.props.className.includes("border-dashed")
    )[0]

    expect(emptyState).toBeDefined()
  })
})

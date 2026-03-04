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

const loadManageItem = ({
  item,
  showPriceForm = false,
  addItemsImpl,
  updateAddedItemImpl,
  updateOriginalItemImpl,
  undoActionImpl,
}: {
  item: any
  showPriceForm?: boolean
  addItemsImpl?: jest.Mock
  updateAddedItemImpl?: jest.Mock
  updateOriginalItemImpl?: jest.Mock
  undoActionImpl?: jest.Mock
}) => {
  const setShowPriceForm = jest.fn()
  const addItems = addItemsImpl ?? jest.fn().mockResolvedValue(undefined)
  const updateAddedItem =
    updateAddedItemImpl ?? jest.fn().mockResolvedValue(undefined)
  const updateOriginalItem =
    updateOriginalItemImpl ?? jest.fn().mockResolvedValue(undefined)
  const undoAction = undoActionImpl ?? jest.fn().mockResolvedValue(undefined)
  const toastError = jest.fn()

  let actionMenuType: any
  let inputType: any
  let currencyInputType: any
  let iconButtonType: any
  let ManageItem: (props: any) => any

  jest.isolateModules(() => {
    jest.doMock("react", () => ({
      ...jest.requireActual("react"),
      useMemo: (factory: () => unknown) => factory(),
      useState: () => [showPriceForm, setShowPriceForm],
    }))

    jest.doMock("react-i18next", () => ({
      useTranslation: () => ({
        t: (value: string) => value,
      }),
    }))

    jest.doMock("@medusajs/icons", () => ({
      ArrowUturnLeft: () => null,
      DocumentSeries: () => null,
      PencilSquare: () => null,
      XCircle: () => null,
      XMark: () => null,
    }))

    jest.doMock("@medusajs/ui", () => {
      const React = require("react")
      inputType = ({ children, ...props }: any) =>
        React.createElement("input-component", props, children)
      currencyInputType = ({ children, ...props }: any) =>
        React.createElement("currency-input", props, children)
      iconButtonType = ({ children, ...props }: any) =>
        React.createElement("icon-button", props, children)
      return {
        Badge: ({ children, ...props }: any) =>
          React.createElement("badge-component", props, children),
        CurrencyInput: currencyInputType,
        IconButton: iconButtonType,
        Input: inputType,
        Text: ({ children, ...props }: any) =>
          React.createElement("text-component", props, children),
        toast: {
          error: toastError,
        },
      }
    })

    jest.doMock("../../../../../components/common", () => {
      actionMenuType = (props: any) =>
        (require("react").createElement("action-menu", props) as any)
      return {
        ActionMenu: actionMenuType,
        AmountCell: ({ amount, originalAmount }: any) =>
          ({ type: "AmountCell", props: { amount, originalAmount } }) as any,
        Thumbnail: ({ src }: any) => ({ type: "Thumbnail", props: { src } }) as any,
      }
    })

    jest.doMock("../../../../../components/common/form", () => ({
      Form: {
        Label: ({ children }: any) => ({ type: "FormLabel", props: { children } }),
        Hint: ({ children }: any) => ({ type: "FormHint", props: { children } }),
        Field: ({ render }: any) => render({ field: { value: "10", onChange: jest.fn() } }),
        Item: ({ children }: any) => ({ type: "FormItem", props: { children } }),
        Control: ({ children }: any) => ({ type: "FormControl", props: { children } }),
        ErrorMessage: () => ({ type: "FormError", props: {} }),
      },
    }))

    jest.doMock("../../../../../hooks/api", () => ({
      useAddItemsToQuote: () => ({ mutateAsync: addItems }),
      useUpdateAddedQuoteItem: () => ({ mutateAsync: updateAddedItem }),
      useUpdateQuoteItem: () => ({ mutateAsync: updateOriginalItem }),
      useRemoveQuoteItem: () => ({ mutateAsync: undoAction }),
    }))

    jest.doMock("../../../../../utils", () => ({
      currencySymbolMap: {
        usd: "$",
      },
    }))

    ManageItem = require("../manage-item").ManageItem
  })

  const tree = ManageItem({
    orderId: "order_1",
    currencyCode: "usd",
    originalItem: {
      unit_price: 90,
      total: 90,
    },
    item,
  })

  return {
    tree,
    actionMenuType,
    inputType,
    currencyInputType,
    iconButtonType,
    setShowPriceForm,
    addItems,
    updateAddedItem,
    updateOriginalItem,
    undoAction,
    toastError,
  }
}

describe("ManageItem", () => {
  it("validates quantity lower than fulfillment and handles duplicate/remove for original item", async () => {
    const { tree, actionMenuType, inputType, addItems, updateOriginalItem, toastError } =
      loadManageItem({
        item: {
          id: "item_1",
          variant_id: "var_1",
          variant_sku: "SKU-1",
          product_title: "Product",
          title: "Item",
          thumbnail: "thumb",
          unit_price: 100,
          quantity: 3,
          total: 300,
          detail: {
            fulfilled_quantity: 2,
          },
          actions: [{ id: "act_1", action: "ITEM_UPDATE" }],
        },
      })

    const quantityInput = collectElements(
      tree,
      (element) =>
        element.type === inputType &&
        element.props?.type === "number" &&
        typeof element.props?.onBlur === "function"
    )[0]

    quantityInput.props.onBlur({ target: { value: "2" } })
    expect(toastError).toHaveBeenCalledWith(
      "orders.edits.validation.quantityLowerThanFulfillment"
    )

    const actionMenu = collectElements(
      tree,
      (element) => element.type === actionMenuType
    )[0]

    await actionMenu.props.groups[0].actions[1].onClick()
    expect(addItems).toHaveBeenCalledWith({
      items: [{ variant_id: "var_1", quantity: 3 }],
    })

    await actionMenu.props.groups[1].actions[0].onClick()
    expect(updateOriginalItem).toHaveBeenCalledWith({
      quantity: 2,
      itemId: "item_1",
    })
  })

  it("updates and removes added items through added-item action ids", async () => {
    const {
      tree,
      actionMenuType,
      inputType,
      setShowPriceForm,
      updateAddedItem,
      undoAction,
    } = loadManageItem({
      item: {
        id: "item_1",
        variant_id: "var_1",
        variant_sku: "SKU-1",
        product_title: "Product",
        title: "Item",
        thumbnail: "thumb",
        unit_price: 100,
        quantity: 5,
        total: 500,
        detail: {
          fulfilled_quantity: 1,
        },
        actions: [{ id: "act_add_1", action: "ITEM_ADD" }],
      },
    })

    const quantityInput = collectElements(
      tree,
      (element) =>
        element.type === inputType &&
        element.props?.type === "number" &&
        typeof element.props?.onBlur === "function"
    )[0]

    quantityInput.props.onBlur({ target: { value: "6" } })
    expect(updateAddedItem).toHaveBeenCalledWith({
      quantity: 6,
      unit_price: undefined,
      actionId: "act_add_1",
    })

    const actionMenu = collectElements(
      tree,
      (element) => element.type === actionMenuType
    )[0]

    actionMenu.props.groups[0].actions[0].onClick()
    expect(setShowPriceForm).toHaveBeenCalledWith(true)

    await actionMenu.props.groups[1].actions[0].onClick()
    expect(undoAction).toHaveBeenCalledWith("act_add_1")
  })

  it("handles duplicate/update/undo failures and closes the price form", async () => {
    const duplicateError = new Error("duplicate failed")
    const updateError = new Error("update failed")
    const undoError = new Error("undo failed")

    const addItemsImpl = jest.fn().mockRejectedValue(duplicateError)
    const updateOriginalItemImpl = jest.fn().mockRejectedValue(updateError)
    const undoActionImpl = jest.fn().mockRejectedValue(undoError)

    const {
      tree,
      actionMenuType,
      inputType,
      iconButtonType,
      setShowPriceForm,
      addItems,
      updateOriginalItem,
      undoAction,
      toastError,
    } = loadManageItem({
      showPriceForm: true,
      addItemsImpl,
      updateOriginalItemImpl,
      undoActionImpl,
      item: {
        id: "item_2",
        variant_id: "var_2",
        variant_sku: "SKU-2",
        product_title: "Another Product",
        title: "Another Item",
        thumbnail: "thumb",
        unit_price: 120,
        quantity: 4,
        total: 480,
        detail: {
          fulfilled_quantity: 1,
        },
        actions: [{ id: "act_2", action: "ITEM_UPDATE" }],
      },
    })

    const actionMenu = collectElements(
      tree,
      (element) => element.type === actionMenuType
    )[0]

    await actionMenu.props.groups[0].actions[1].onClick()
    expect(addItems).toHaveBeenCalledWith({
      items: [{ variant_id: "var_2", quantity: 4 }],
    })

    const quantityInput = collectElements(
      tree,
      (element) =>
        element.type === inputType &&
        element.props?.type === "number" &&
        typeof element.props?.onBlur === "function"
    )[0]

    quantityInput.props.onBlur({ target: { value: "5" } })
    expect(updateOriginalItem).toHaveBeenCalledWith({
      quantity: 5,
      unit_price: undefined,
      itemId: "item_2",
    })

    await actionMenu.props.groups[1].actions[0].onClick()
    expect(updateOriginalItem).toHaveBeenCalledWith({
      quantity: 1,
      itemId: "item_2",
    })

    const closeButton = collectElements(
      tree,
      (element) =>
        element.type === iconButtonType &&
        typeof element.props?.onClick === "function"
    )[0]
    closeButton.props.onClick()
    expect(setShowPriceForm).toHaveBeenCalledWith(false)

    const removedItemLoad = loadManageItem({
      undoActionImpl,
      item: {
        id: "item_3",
        variant_id: "var_3",
        variant_sku: "SKU-3",
        product_title: "Third Product",
        title: "Third Item",
        thumbnail: "thumb",
        unit_price: 100,
        quantity: 2,
        total: 200,
        detail: {
          fulfilled_quantity: 2,
        },
        actions: [{ id: "act_3", action: "ITEM_UPDATE" }],
      },
    })

    const undoMenu = collectElements(
      removedItemLoad.tree,
      (element) => element.type === removedItemLoad.actionMenuType
    )[0]

    await undoMenu.props.groups[1].actions[0].onClick()
    expect(undoAction).toHaveBeenCalledWith("act_3")

    expect(toastError).toHaveBeenCalledWith("duplicate failed")
    expect(toastError).toHaveBeenCalledWith("update failed")
    expect(removedItemLoad.toastError).toHaveBeenCalledWith("undo failed")
  })
})

export interface ProductDetailSelectionState {
  productKey: string
  quantity: number
  selectedVariantId: string | null
  selectedVolumeDiscountId: string | null
}

export const createSelectionKey = (
  productKey: string,
  initialSelectedVariantId: string | null,
) => JSON.stringify([productKey, initialSelectedVariantId])

export const createDefaultSelection = (
  selectionKey: string,
  defaultSelectedVariantId: string | null,
): ProductDetailSelectionState => ({
  productKey: selectionKey,
  quantity: 1,
  selectedVariantId: defaultSelectedVariantId,
  selectedVolumeDiscountId: null,
})

export const resolveCurrentSelection = (
  selection: ProductDetailSelectionState,
  selectionKey: string,
  defaultSelectedVariantId: string | null,
) =>
  selection.productKey === selectionKey
    ? selection
    : createDefaultSelection(selectionKey, defaultSelectedVariantId)

export const updateCurrentSelection = (
  selection: ProductDetailSelectionState,
  selectionKey: string,
  defaultSelectedVariantId: string | null,
  update: Partial<
    Pick<
      ProductDetailSelectionState,
      "quantity" | "selectedVariantId" | "selectedVolumeDiscountId"
    >
  >,
): ProductDetailSelectionState => ({
  ...resolveCurrentSelection(selection, selectionKey, defaultSelectedVariantId),
  ...update,
})

export const resolveAvailableQuantity = (
  requestedQuantity: number,
  availableQuantity: number | null,
) => {
  if (availableQuantity === null || availableQuantity < 1) {
    return requestedQuantity
  }
  return Math.min(requestedQuantity, availableQuantity)
}

import type { DataTableRowSelectionState } from "@medusajs/ui"
import type { Brand, BrandProductOption } from "../../lib/brands"

export const toRowSelection = (
  selectedIds: Iterable<string>
): DataTableRowSelectionState =>
  Object.fromEntries([...selectedIds].map((id) => [id, true]))

export const fromRowSelection = (selection: DataTableRowSelectionState) =>
  new Set(
    Object.entries(selection).flatMap(([id, selected]) =>
      selected ? [id] : []
    )
  )

export const buildProductSelectionDelta = (
  currentProductIds: Iterable<string>,
  selectedProductIds: Iterable<string>
) => {
  const current = new Set(currentProductIds)
  const selected = new Set(selectedProductIds)

  return {
    add: [...selected].filter((id) => !current.has(id)),
    remove: [...current].filter((id) => !selected.has(id)),
  }
}

export const isProductOptionSelectable = (
  option: BrandProductOption,
  currentBrandId: string
) => !option.assigned_brand || option.assigned_brand.id === currentBrandId

export const isBrandSelectable = (
  brand: Brand,
  selectedId: string | undefined,
  isPending: boolean
) => !(brand.deleted_at || isPending || brand.id === selectedId)

export const shouldSubmitProductBrandSelection = (
  currentBrand: Brand | undefined,
  selectedId: string | undefined
) => !(currentBrand?.deleted_at && selectedId === undefined)

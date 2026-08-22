import type {
  HerbaticaSupplementalManifest,
  HerbaticaSupplementalProduct,
} from "./manifest"
import { supplementalProductHandle, supplementalProductSku } from "./manifest"

export type PersistedSupplementalProductIdentity = Readonly<{
  externalId: null | string
  handle: null | string
  id: string
  variants: readonly Readonly<{
    ean: null | string
    sku: null | string
  }>[]
}>

export type PersistedSupplementalVariantIdentity = Readonly<{
  ean: null | string
  id: string
  productId: string
  sku: null | string
}>

type PreflightInput = Readonly<{
  manifest: HerbaticaSupplementalManifest
  products: readonly PersistedSupplementalProductIdentity[]
  variants: readonly PersistedSupplementalVariantIdentity[]
}>

const groupBy = <Value>(
  values: readonly Value[],
  key: (value: Value) => null | string
) => {
  const result = new Map<string, Value[]>()
  for (const value of values) {
    const resolvedKey = key(value)
    if (!resolvedKey) {
      continue
    }
    const matches = result.get(resolvedKey) ?? []
    matches.push(value)
    result.set(resolvedKey, matches)
  }
  return result
}

const exactlyZeroOrOne = <Value>(
  matches: readonly Value[] | undefined,
  label: string
): Value | undefined => {
  if ((matches?.length ?? 0) > 1) {
    throw new Error(`Multiple persisted owners for ${label}`)
  }
  return matches?.[0]
}

const assertExistingVariantShape = (
  source: HerbaticaSupplementalProduct,
  existing: PersistedSupplementalProductIdentity
) => {
  if (existing.variants.length !== 1) {
    throw new Error(
      `Existing product ${source.source_shopitem_id} must have exactly one variant`
    )
  }
  const variant = existing.variants[0]
  if (!variant) {
    throw new Error(
      `Existing product ${source.source_shopitem_id} lost its variant`
    )
  }
  const expectedSku = supplementalProductSku(source)
  if (variant.sku && variant.sku !== expectedSku) {
    throw new Error(
      `Existing product ${source.source_shopitem_id} has unexpected SKU ${variant.sku}`
    )
  }
  if (variant.ean && variant.ean !== source.ean) {
    throw new Error(
      `Existing product ${source.source_shopitem_id} has unexpected EAN ${variant.ean}`
    )
  }
}

export const assertSupplementalIdentityState = ({
  manifest,
  products,
  variants,
}: PreflightInput) => {
  const productsByExternalId = groupBy(products, ({ externalId }) => externalId)
  const productsByHandle = groupBy(products, ({ handle }) => handle)
  const variantsBySku = groupBy(variants, ({ sku }) => sku)
  const variantsByEan = groupBy(variants, ({ ean }) => ean)

  for (const source of manifest.products) {
    const expectedHandle = supplementalProductHandle(source)
    const expectedSku = supplementalProductSku(source)
    const byExternalId = exactlyZeroOrOne(
      productsByExternalId.get(source.source_shopitem_id),
      `external ID ${source.source_shopitem_id}`
    )
    const byHandle = exactlyZeroOrOne(
      productsByHandle.get(expectedHandle),
      `handle ${expectedHandle}`
    )
    if (byExternalId && byHandle && byExternalId.id !== byHandle.id) {
      throw new Error(
        `External ID ${source.source_shopitem_id} and handle ${expectedHandle} have different owners`
      )
    }
    const existing = byExternalId ?? byHandle
    if (existing) {
      if (existing.externalId !== source.source_shopitem_id) {
        throw new Error(`Handle collision for ${expectedHandle}`)
      }
      if (existing.handle !== expectedHandle) {
        throw new Error(
          `Existing product ${source.source_shopitem_id} has unexpected handle ${existing.handle}`
        )
      }
      assertExistingVariantShape(source, existing)
    }

    const skuOwner = exactlyZeroOrOne(
      variantsBySku.get(expectedSku),
      `SKU ${expectedSku}`
    )
    if (skuOwner && skuOwner.productId !== existing?.id) {
      throw new Error(`SKU collision for ${expectedSku}`)
    }
    if (source.ean) {
      const eanOwner = exactlyZeroOrOne(
        variantsByEan.get(source.ean),
        `EAN ${source.ean}`
      )
      if (eanOwner && eanOwner.productId !== existing?.id) {
        throw new Error(`EAN collision for ${source.ean}`)
      }
    }
  }
}

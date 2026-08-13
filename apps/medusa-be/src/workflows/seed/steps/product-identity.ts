export type ProductIdentity = {
  external_id?: string | null
  handle?: string | null
}

export type ProductIdentityIndex<T> = {
  byExternalId: Map<string, T>
  byHandle: Map<string, T>
}

export const normalizeProductIdentity = (value?: string | null) => {
  const normalized = value?.trim()
  return normalized || undefined
}

const addUniqueIdentity = <T extends ProductIdentity & { id: string }>(
  index: Map<string, T>,
  identity: string | undefined,
  product: T,
  field: "external_id" | "handle"
) => {
  if (!identity) {
    return
  }

  const existing = index.get(identity)
  if (existing && existing.id !== product.id) {
    throw new Error(
      `Multiple existing products use ${field} "${identity}": ${existing.id}, ${product.id}`
    )
  }
  index.set(identity, product)
}

export function createProductIdentityIndex<
  T extends ProductIdentity & { id: string },
>(existingProducts: T[]): ProductIdentityIndex<T> {
  const index: ProductIdentityIndex<T> = {
    byExternalId: new Map(),
    byHandle: new Map(),
  }

  for (const product of existingProducts) {
    addUniqueIdentity(
      index.byExternalId,
      normalizeProductIdentity(product.external_id),
      product,
      "external_id"
    )
    addUniqueIdentity(
      index.byHandle,
      normalizeProductIdentity(product.handle),
      product,
      "handle"
    )
  }

  return index
}

export function matchSeedProduct<T extends ProductIdentity & { id: string }>(
  inputProduct: ProductIdentity,
  index: ProductIdentityIndex<T>
): T | undefined {
  const externalId = normalizeProductIdentity(inputProduct.external_id)
  const handle = normalizeProductIdentity(inputProduct.handle)
  const productByExternalId = externalId
    ? index.byExternalId.get(externalId)
    : undefined
  const productByHandle = handle ? index.byHandle.get(handle) : undefined

  if (
    productByExternalId &&
    productByHandle &&
    productByExternalId.id !== productByHandle.id
  ) {
    throw new Error(
      `Product identity conflict: external_id "${externalId}" resolves to ${productByExternalId.id}, handle "${handle}" resolves to ${productByHandle.id}`
    )
  }

  return productByExternalId ?? productByHandle
}

import type { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { getSourceVariantId, type ProductInput } from "./create-products"

const RECONCILE_PRODUCT_VARIANT_EANS_STEP_ID =
  "reconcile-product-variant-eans-seed-step"
const EAN_QUERY_CHUNK_SIZE = 500

type ProductVariantInput = NonNullable<ProductInput["variants"]>[number]

type IncomingVariant = {
  ean: string | null
  productHandle: string
  productIndex: number
  sku: string
  sourceKey: string
  sourceVariantId?: string
  stableIdentity: string
  variantIndex: number
}

export type PersistedEanOwner = {
  ean: null | string
  id: string
  metadata?: null | Record<string, unknown>
  product?: null | { handle: string; id: string }
  product_id: null | string
  sku: null | string
}

export type ProductVariantEanClaimant = {
  product_handle: string
  sku: string
  source_key: string
  source_variant_id?: string
}

export type ProductVariantEanIssue = {
  ean: string
  owner: ProductVariantEanClaimant
  previous_owner?: ProductVariantEanClaimant
  resolution:
    | "kept_existing"
    | "preserved_out_of_scope"
    | "selected_stable_claimant"
    | "transferred"
  suppressed: ProductVariantEanClaimant[]
}

export type ProductVariantEanReconciliationSummary = {
  accepted: number
  collisions: number
  retained: number
  suppressed: number
  transferred: number
}

export type ReconcileProductVariantEansStepOutput = {
  issues: ProductVariantEanIssue[]
  products: ProductInput[]
  summary: ProductVariantEanReconciliationSummary
}

type ProductVariantEanTransferSnapshot = {
  ean: string
  id: string
}

type ProductVariantEanResolution = ReconcileProductVariantEansStepOutput & {
  transfers: ProductVariantEanTransferSnapshot[]
}

function chunkArray<T>(values: T[], size = EAN_QUERY_CHUNK_SIZE): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function normalizedEan(value: null | string | undefined): string | null {
  const normalized = value?.trim()
  return normalized || null
}

function sourceIdentity(params: {
  product: ProductInput
  variant: ProductVariantInput
}): Pick<IncomingVariant, "sourceKey" | "sourceVariantId" | "stableIdentity"> {
  const sourceKey = metadataString(params.product.metadata, "source") ?? "seed"
  const sourceVariantId = getSourceVariantId(params.variant)
  const sourceIdentityKey = sourceVariantId
    ? `${sourceKey}:${sourceVariantId}`
    : `${sourceKey}:${params.product.handle}:${params.variant.sku}`

  return {
    sourceKey,
    ...(sourceVariantId === undefined ? {} : { sourceVariantId }),
    stableIdentity: `${sourceIdentityKey}:${params.product.handle}:${params.variant.sku}`,
  }
}

function collectIncomingVariants(products: ProductInput[]): IncomingVariant[] {
  return products.flatMap((product, productIndex) =>
    (product.variants ?? []).map((variant, variantIndex) => ({
      ...sourceIdentity({ product, variant }),
      ean: normalizedEan(variant.ean),
      productHandle: product.handle,
      productIndex,
      sku: variant.sku,
      variantIndex,
    }))
  )
}

function toClaimant(variant: IncomingVariant): ProductVariantEanClaimant {
  return {
    product_handle: variant.productHandle,
    sku: variant.sku,
    source_key: variant.sourceKey,
    ...(variant.sourceVariantId === undefined
      ? {}
      : { source_variant_id: variant.sourceVariantId }),
  }
}

function persistedOwnerClaimant(
  owner: PersistedEanOwner
): ProductVariantEanClaimant {
  const sourceVariantId = getSourceVariantId(owner)
  return {
    product_handle:
      owner.product?.handle ??
      owner.product_id ??
      `unknown-product:${owner.id}`,
    sku: owner.sku ?? owner.id,
    source_key: "persisted",
    ...(sourceVariantId === undefined
      ? {}
      : { source_variant_id: sourceVariantId }),
  }
}

function findIncomingPersistedOwner(
  owner: PersistedEanOwner,
  incomingVariants: IncomingVariant[]
): IncomingVariant | undefined {
  const productHandle = owner.product?.handle
  if (!productHandle) {
    return
  }

  const productVariants = incomingVariants.filter(
    (variant) => variant.productHandle === productHandle
  )
  const sourceVariantId = getSourceVariantId(owner)

  if (sourceVariantId) {
    const sourceMatch = productVariants.find(
      (variant) => variant.sourceVariantId === sourceVariantId
    )
    if (sourceMatch) {
      return sourceMatch
    }
  }

  return productVariants.find((variant) => variant.sku === owner.sku)
}

function compareIncomingVariants(
  left: IncomingVariant,
  right: IncomingVariant
): number {
  return left.stableIdentity.localeCompare(right.stableIdentity, "en", {
    numeric: true,
  })
}

function cloneProductsWithNormalizedEans(
  products: ProductInput[]
): ProductInput[] {
  return products.map((product) => ({
    ...product,
    variants: product.variants?.map((variant) => ({
      ...variant,
      ean: normalizedEan(variant.ean),
    })),
  }))
}

function setReconciledEan(
  products: ProductInput[],
  variant: IncomingVariant,
  ean: string | null
): void {
  const target =
    products[variant.productIndex]?.variants?.[variant.variantIndex]
  if (!target) {
    throw new Error(
      `Unable to reconcile EAN for ${variant.productHandle}/${variant.sku}`
    )
  }
  target.ean = ean
}

type EanClaimGroupResolution = {
  issue?: ProductVariantEanIssue
  summary: ProductVariantEanReconciliationSummary
  transfer?: ProductVariantEanTransferSnapshot
}

function emptySummary(): ProductVariantEanReconciliationSummary {
  return {
    accepted: 0,
    collisions: 0,
    retained: 0,
    suppressed: 0,
    transferred: 0,
  }
}

function addSummary(
  target: ProductVariantEanReconciliationSummary,
  addition: ProductVariantEanReconciliationSummary
): void {
  target.accepted += addition.accepted
  target.collisions += addition.collisions
  target.retained += addition.retained
  target.suppressed += addition.suppressed
  target.transferred += addition.transferred
}

function resolveOutOfScopeClaimGroup(params: {
  claims: IncomingVariant[]
  ean: string
  persistedOwner: PersistedEanOwner
  products: ProductInput[]
}): EanClaimGroupResolution {
  for (const claim of params.claims) {
    setReconciledEan(params.products, claim, null)
  }
  return {
    issue: {
      ean: params.ean,
      owner: persistedOwnerClaimant(params.persistedOwner),
      resolution: "preserved_out_of_scope",
      suppressed: params.claims.map(toClaimant),
    },
    summary: {
      ...emptySummary(),
      collisions: 1,
      retained: 1,
      suppressed: params.claims.length,
    },
  }
}

function resolveClaimedGroup(params: {
  claims: IncomingVariant[]
  ean: string
  incomingOwner?: IncomingVariant
  persistedOwner?: PersistedEanOwner
  products: ProductInput[]
}): EanClaimGroupResolution {
  const { claims, ean, incomingOwner, persistedOwner, products } = params

  const ownerStillClaims = incomingOwner?.ean === ean
  const winner = ownerStillClaims ? incomingOwner : claims[0]
  if (!winner) {
    return { summary: emptySummary() }
  }

  const suppressed = claims.filter((claim) => claim !== winner)
  for (const claim of suppressed) {
    setReconciledEan(products, claim, null)
  }

  const transfersOwnership = Boolean(
    persistedOwner && incomingOwner && !ownerStillClaims
  )
  const summary = emptySummary()
  if (transfersOwnership) {
    summary.transferred = 1
  } else if (ownerStillClaims) {
    summary.retained = 1
  } else {
    summary.accepted = 1
  }
  summary.suppressed = suppressed.length

  const hasCollision = claims.length > 1 || transfersOwnership
  if (!hasCollision) {
    return { summary }
  }

  summary.collisions = 1
  let resolution: ProductVariantEanIssue["resolution"] =
    "selected_stable_claimant"
  if (transfersOwnership) {
    resolution = "transferred"
  } else if (ownerStillClaims) {
    resolution = "kept_existing"
  }

  const transferredOwner =
    transfersOwnership && persistedOwner ? persistedOwner : undefined

  return {
    issue: {
      ean,
      owner: toClaimant(winner),
      ...(transferredOwner === undefined
        ? {}
        : { previous_owner: persistedOwnerClaimant(transferredOwner) }),
      resolution,
      suppressed: suppressed.map(toClaimant),
    },
    summary,
    ...(transferredOwner === undefined
      ? {}
      : { transfer: { id: transferredOwner.id, ean } }),
  }
}

function resolveClaimGroup(params: {
  claims: IncomingVariant[]
  ean: string
  incomingVariants: IncomingVariant[]
  persistedOwner?: PersistedEanOwner
  products: ProductInput[]
}): EanClaimGroupResolution {
  const incomingOwner = params.persistedOwner
    ? findIncomingPersistedOwner(params.persistedOwner, params.incomingVariants)
    : undefined
  if (params.persistedOwner && !incomingOwner) {
    return resolveOutOfScopeClaimGroup({
      claims: params.claims,
      ean: params.ean,
      persistedOwner: params.persistedOwner,
      products: params.products,
    })
  }
  return resolveClaimedGroup({
    claims: params.claims,
    ean: params.ean,
    ...(incomingOwner === undefined ? {} : { incomingOwner }),
    ...(params.persistedOwner === undefined
      ? {}
      : { persistedOwner: params.persistedOwner }),
    products: params.products,
  })
}

export function resolveProductVariantEanClaims(params: {
  persistedOwners: PersistedEanOwner[]
  products: ProductInput[]
}): ProductVariantEanResolution {
  const products = cloneProductsWithNormalizedEans(params.products)
  const incomingVariants = collectIncomingVariants(params.products)
  const claimsByEan = new Map<string, IncomingVariant[]>()
  const persistedOwnerByEan = new Map<string, PersistedEanOwner>()

  for (const variant of incomingVariants) {
    if (!variant.ean) {
      continue
    }
    const claims = claimsByEan.get(variant.ean) ?? []
    claims.push(variant)
    claimsByEan.set(variant.ean, claims)
  }

  for (const owner of params.persistedOwners) {
    const ean = normalizedEan(owner.ean)
    if (ean) {
      persistedOwnerByEan.set(ean, owner)
    }
  }

  const issues: ProductVariantEanIssue[] = []
  const transfers: ProductVariantEanTransferSnapshot[] = []
  const summary = emptySummary()

  for (const ean of [...claimsByEan.keys()].sort()) {
    const claims = claimsByEan.get(ean)?.sort(compareIncomingVariants) ?? []
    const persistedOwner = persistedOwnerByEan.get(ean)
    const resolution = resolveClaimGroup({
      claims,
      ean,
      incomingVariants,
      ...(persistedOwner === undefined ? {} : { persistedOwner }),
      products,
    })
    addSummary(summary, resolution.summary)
    if (resolution.issue) {
      issues.push(resolution.issue)
    }
    if (resolution.transfer) {
      transfers.push(resolution.transfer)
    }
  }

  return { issues, products, summary, transfers }
}

async function listPersistedEanOwners(
  productService: IProductModuleService,
  eans: string[]
): Promise<PersistedEanOwner[]> {
  const owners: PersistedEanOwner[] = []
  for (const eanChunk of chunkArray(eans)) {
    const variants = await productService.listProductVariants(
      { ean: eanChunk },
      {
        relations: ["product"],
        select: [
          "id",
          "ean",
          "sku",
          "metadata",
          "product_id",
          "product.id",
          "product.handle",
        ],
        take: eanChunk.length,
      }
    )
    owners.push(...variants)
  }
  return owners
}

function collectDistinctIncomingEans(products: ProductInput[]): string[] {
  return [
    ...new Set(
      products.flatMap((product) =>
        (product.variants ?? []).flatMap((variant) => {
          const ean = normalizedEan(variant.ean)
          return ean ? [ean] : []
        })
      )
    ),
  ].sort()
}

export const reconcileProductVariantEansStep = createStep(
  RECONCILE_PRODUCT_VARIANT_EANS_STEP_ID,
  async (products: ProductInput[], { container }) => {
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT
    )
    const eans = collectDistinctIncomingEans(products)
    const persistedOwners = await listPersistedEanOwners(productService, eans)
    const { transfers, ...output } = resolveProductVariantEanClaims({
      persistedOwners,
      products,
    })

    if (transfers.length) {
      await productService.upsertProductVariants(
        transfers.map(({ id }) => ({ id, ean: null }))
      )
    }

    return new StepResponse(output, transfers)
  },
  async (transfers, { container }) => {
    if (!transfers?.length) {
      return
    }
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT
    )
    await productService.upsertProductVariants(transfers)
  }
)

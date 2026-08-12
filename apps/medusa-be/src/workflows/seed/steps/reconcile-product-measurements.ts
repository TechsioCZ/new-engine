import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Link } from "@medusajs/framework/modules-sdk"
import type {
  Context,
  ILockingModule,
  IProductModuleService,
  Logger,
  ProductDTO,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ProductMeasurementLink } from "../../../links/product-measurement"
import { ProductVariantMeasurementLink } from "../../../links/product-variant-measurement"
import { MEASUREMENT_UNIT_MODULE } from "../../../modules/measurement-unit"
import {
  getMeasurementUnitService,
  type MeasurementUnitRecord,
  type ProductMeasurementRecord,
  type ProductVariantMeasurementRecord,
  toNumber,
} from "../../../utils/measurement-units"
import {
  normalizeDescription,
  normalizeUnitCode,
  pickCanonicalRecord,
  productMeasurementLink,
  productVariantMeasurementLink,
} from "../../measurement-unit/steps/helpers"
import type {
  CreateProductsStepInput,
  ProductInput,
  SeedMeasurementUnitInput,
  SeedProductMeasurementInput,
  SeedVariantMeasurementInput,
} from "./create-products"
import { getSourceVariantId } from "./create-products"

const RECONCILIATION_BATCH_SIZE = 100

type CanonicalMeasurementUnit = {
  semanticKey: string
  source: SeedMeasurementUnitInput
}

type ExistingProductVariant = NonNullable<ProductDTO["variants"]>[number]

type ResolvedProductInput = {
  input: ProductInput
  product: ProductDTO
  variantInputById: Map<string, NonNullable<ProductInput["variants"]>[number]>
}

type ProductMeasurementLinkRecord = {
  deleted_at?: Date | string | null
  product_id: string
  product_measurement_id: string
}

type ProductVariantMeasurementLinkRecord = {
  deleted_at?: Date | string | null
  product_variant_id: string
  product_variant_measurement_id: string
}

type MeasurementLinkPlan = {
  productLinksToCreate: ProductMeasurementLinkRecord[]
  productLinksToDismiss: ProductMeasurementLinkRecord[]
  productMeasurementIdsToRestore: string[]
  variantLinksToCreate: ProductVariantMeasurementLinkRecord[]
  variantLinksToDismiss: ProductVariantMeasurementLinkRecord[]
  variantMeasurementIdsToRestore: string[]
}

type BatchReconciliationResult = {
  productTargetById: Map<string, ProductMeasurementRecord | null>
  variantTargetById: Map<string, ProductVariantMeasurementRecord | null>
}

type ProductRecordMutationPlan = {
  creates: Array<{ measurement_unit_id: string; product_id: string }>
  productIdsToRestore: Set<string>
  productIdsToSoftDelete: Set<string>
  productTargetById: Map<string, ProductMeasurementRecord | null>
  variantIdsToSoftDelete: Set<string>
}

type VariantRecordMutationPlan = {
  creates: Array<{
    product_measurement_id: string
    product_unit_quantity: number
    product_variant_id: string
  }>
  restoreIds: Set<string>
  softDeleteIds: Set<string>
  updates: Array<{
    id: string
    product_measurement_id: string
    product_unit_quantity: number
    product_variant_id: string
  }>
  variantTargetById: Map<string, ProductVariantMeasurementRecord | null>
}

type ReconciliationSummary = {
  products_cleared: number
  products_set: number
  units_created: number
  units_restored: number
  units_reused: number
  variants_cleared: number
  variants_set: number
}

const chunk = <T>(items: T[], size = RECONCILIATION_BATCH_SIZE) => {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

const normalizeUnitSymbol = (value: string) =>
  value.trim().normalize("NFKC").toLowerCase()

const normalizeQuantity = (value: number) => Number(value).toString()

const compareText = (left: string, right: string) => {
  if (left === right) {
    return 0
  }
  return left < right ? -1 : 1
}

function compareSeedMeasurementUnitSources(
  left: SeedMeasurementUnitInput,
  right: SeedMeasurementUnitInput
) {
  const comparisons = [
    compareText(left.code, right.code),
    compareText(left.name, right.name),
    compareText(left.symbol, right.symbol),
    left.base_quantity - right.base_quantity,
    compareText(left.description ?? "", right.description ?? ""),
  ]

  return comparisons.find((comparison) => comparison !== 0) ?? 0
}

export const getSeedMeasurementUnitSemanticKey = (
  unit: Pick<SeedMeasurementUnitInput, "base_quantity" | "symbol">
) =>
  `${normalizeUnitSymbol(unit.symbol)}:${normalizeQuantity(unit.base_quantity)}`

function validateSeedMeasurementUnit(unit: SeedMeasurementUnitInput) {
  if (
    !(
      unit.code.trim() &&
      unit.name.trim() &&
      unit.symbol.trim() &&
      Number.isFinite(unit.base_quantity) &&
      unit.base_quantity > 0
    )
  ) {
    throw new Error(
      "Seed measurement unit code, name, symbol, and positive base quantity are required"
    )
  }
}

export function validateSeedProductMeasurementInput(
  input: CreateProductsStepInput
) {
  for (const product of input) {
    for (const variant of product.variants ?? []) {
      const measurement = variant.measurement

      if (product.measurement === undefined && measurement !== undefined) {
        throw new Error(
          `Product "${product.handle}" cannot reconcile Variant measurements without owning Product measurement reconciliation`
        )
      }
      if (product.measurement === null && measurement) {
        throw new Error(
          `Product "${product.handle}" cannot assign a Variant measurement while clearing its Product measurement`
        )
      }
      if (measurement) {
        validateVariantQuantity(measurement, variant.sku)
      }
    }
  }
}

export function collectCanonicalSeedMeasurementUnits(
  input: CreateProductsStepInput
) {
  const canonical = new Map<string, CanonicalMeasurementUnit>()

  for (const product of input) {
    const measurement = product.measurement
    if (!measurement) {
      continue
    }
    validateSeedMeasurementUnit(measurement.unit)
    const semanticKey = getSeedMeasurementUnitSemanticKey(measurement.unit)
    const normalizedSource: SeedMeasurementUnitInput = {
      ...measurement.unit,
      code: normalizeUnitCode(measurement.unit.code),
      description: normalizeDescription(measurement.unit.description),
      name: measurement.unit.name.trim(),
      symbol: measurement.unit.symbol.trim(),
    }
    const current = canonical.get(semanticKey)

    if (!current) {
      canonical.set(semanticKey, { semanticKey, source: normalizedSource })
      continue
    }

    if (
      compareSeedMeasurementUnitSources(normalizedSource, current.source) < 0
    ) {
      canonical.set(semanticKey, { semanticKey, source: normalizedSource })
    }
  }

  return canonical
}

const hasMatchingUnitSemantics = (
  existing: MeasurementUnitRecord,
  desired: SeedMeasurementUnitInput
) =>
  normalizeUnitSymbol(existing.symbol) ===
    normalizeUnitSymbol(desired.symbol) &&
  toNumber(existing.base_quantity) === desired.base_quantity

export function findReusableSeedMeasurementUnit(
  existingUnits: MeasurementUnitRecord[],
  desired: SeedMeasurementUnitInput
) {
  const matching = existingUnits.filter((unit) =>
    hasMatchingUnitSemantics(unit, desired)
  )
  const active = matching.filter((unit) => !unit.deleted_at)
  if (active.length) {
    return pickCanonicalRecord(active)
  }

  const activeCodes = new Set(
    existingUnits
      .filter((unit) => !unit.deleted_at)
      .map((unit) => normalizeUnitCode(unit.code))
  )
  const restorable = matching.filter(
    (unit) => !activeCodes.has(normalizeUnitCode(unit.code))
  )

  return pickCanonicalRecord(restorable)
}

export function resolveAvailableSeedMeasurementUnitCode(
  preferredCode: string,
  reservedCodes: Set<string>
) {
  const normalized = normalizeUnitCode(preferredCode)
  let candidate = normalized
  let suffix = 2

  while (reservedCodes.has(candidate)) {
    candidate = `${normalized}_${suffix}`
    suffix += 1
  }

  return candidate
}

async function listAllMeasurementUnits(
  service: ReturnType<typeof getMeasurementUnitService>
) {
  const result: MeasurementUnitRecord[] = []
  let skip = 0

  while (true) {
    const [page, count] = await service.listAndCountMeasurementUnits(
      {},
      {
        order: { id: "ASC" },
        skip,
        take: RECONCILIATION_BATCH_SIZE,
        withDeleted: true,
      }
    )
    result.push(...page)
    if (page.length === 0 || result.length >= count) {
      return result
    }
    skip += page.length
  }
}

async function ensureMeasurementUnits(
  canonical: Map<string, CanonicalMeasurementUnit>,
  service: ReturnType<typeof getMeasurementUnitService>,
  locking: ILockingModule
) {
  const unitBySemanticKey = new Map<string, MeasurementUnitRecord>()
  let created = 0
  let restored = 0
  let reused = 0

  for (const { semanticKey, source } of [...canonical.values()].sort(
    (left, right) => compareText(left.semanticKey, right.semanticKey)
  )) {
    const ensured = await ensureMeasurementUnit(
      { semanticKey, source },
      service,
      locking
    )
    unitBySemanticKey.set(semanticKey, ensured.unit)
    created += Number(ensured.action === "created")
    restored += Number(ensured.action === "restored")
    reused += Number(ensured.action === "reused")
  }

  return { created, restored, reused, unitBySemanticKey }
}

type EnsuredMeasurementUnit = {
  action: "created" | "restored" | "reused"
  unit: MeasurementUnitRecord
}

async function restoreSeedMeasurementUnit(
  desired: CanonicalMeasurementUnit,
  candidate: MeasurementUnitRecord,
  service: ReturnType<typeof getMeasurementUnitService>,
  locking: ILockingModule
): Promise<EnsuredMeasurementUnit | null> {
  return await locking.execute(
    [
      `measurement-unit:${candidate.id}`,
      `measurement-unit-code:${normalizeUnitCode(candidate.code)}`,
    ].sort(),
    async () => {
      const latestUnits = await listAllMeasurementUnits(service)
      const latest = findReusableSeedMeasurementUnit(
        latestUnits,
        desired.source
      )
      if (latest?.id !== candidate.id || !latest.deleted_at) {
        return null
      }

      await service.restoreMeasurementUnits([latest.id])
      return {
        action: "restored",
        unit: { ...latest, deleted_at: null },
      }
    },
    { timeout: 30 }
  )
}

async function createSeedMeasurementUnit(
  desired: CanonicalMeasurementUnit,
  code: string,
  service: ReturnType<typeof getMeasurementUnitService>,
  locking: ILockingModule
): Promise<EnsuredMeasurementUnit | null> {
  return await locking.execute(
    [`measurement-unit-code:${code}`],
    async () => {
      const latestUnits = await listAllMeasurementUnits(service)
      const reusable = findReusableSeedMeasurementUnit(
        latestUnits,
        desired.source
      )
      const codeIsTaken = latestUnits.some(
        (current) => normalizeUnitCode(current.code) === code
      )
      if (reusable || codeIsTaken) {
        return null
      }

      const createdUnit = await service.createMeasurementUnits({
        ...desired.source,
        code,
      })
      return { action: "created", unit: createdUnit }
    },
    { timeout: 30 }
  )
}

async function tryEnsureMeasurementUnit(
  desired: CanonicalMeasurementUnit,
  service: ReturnType<typeof getMeasurementUnitService>,
  locking: ILockingModule
) {
  const existingUnits = await listAllMeasurementUnits(service)
  const reusable = findReusableSeedMeasurementUnit(
    existingUnits,
    desired.source
  )
  if (reusable && !reusable.deleted_at) {
    return { action: "reused", unit: reusable } satisfies EnsuredMeasurementUnit
  }
  if (reusable) {
    return await restoreSeedMeasurementUnit(desired, reusable, service, locking)
  }

  const code = resolveAvailableSeedMeasurementUnitCode(
    desired.source.code,
    new Set(existingUnits.map((unit) => normalizeUnitCode(unit.code)))
  )
  return await createSeedMeasurementUnit(desired, code, service, locking)
}

async function ensureMeasurementUnit(
  desired: CanonicalMeasurementUnit,
  service: ReturnType<typeof getMeasurementUnitService>,
  locking: ILockingModule
): Promise<EnsuredMeasurementUnit> {
  return await locking.execute(
    [`measurement-unit-seed:${desired.semanticKey}`],
    async () => {
      while (true) {
        const ensured = await tryEnsureMeasurementUnit(
          desired,
          service,
          locking
        )
        if (ensured) {
          return ensured
        }
      }
    },
    { timeout: 30 }
  )
}

function getMetadataText(
  record: { metadata?: Record<string, unknown> | null },
  key: string
) {
  const value = record.metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function findPersistedVariant(
  inputVariant: NonNullable<ProductInput["variants"]>[number],
  persistedVariants: ExistingProductVariant[],
  productHandle: string
) {
  const sourceVariantId = getSourceVariantId(inputVariant)
  const bySourceId = sourceVariantId
    ? persistedVariants.filter(
        (variant) => getSourceVariantId(variant) === sourceVariantId
      )
    : []
  const candidates = bySourceId.length
    ? bySourceId
    : persistedVariants.filter(
        (variant) =>
          variant.sku === inputVariant.sku ||
          getMetadataText(variant, "source_sku") === inputVariant.sku
      )

  if (candidates.length !== 1) {
    throw new Error(
      `Expected one persisted Variant for Product "${productHandle}" source Variant "${sourceVariantId ?? inputVariant.sku}", found ${candidates.length}`
    )
  }

  return candidates[0] as ExistingProductVariant
}

function resolveProductInput(
  input: ProductInput,
  product: ProductDTO
): ResolvedProductInput {
  const persistedVariants = product.variants ?? []
  const variantInputById = new Map<
    string,
    NonNullable<ProductInput["variants"]>[number]
  >()

  for (const inputVariant of input.variants ?? []) {
    const persisted = findPersistedVariant(
      inputVariant,
      persistedVariants,
      input.handle
    )
    if (variantInputById.has(persisted.id)) {
      throw new Error(
        `Product "${input.handle}" maps multiple seed Variants to persisted Variant "${persisted.id}"`
      )
    }
    variantInputById.set(persisted.id, inputVariant)
  }

  return { input, product, variantInputById }
}

async function resolveProducts(
  input: CreateProductsStepInput,
  productService: IProductModuleService
) {
  const owned = input.filter((product) => product.measurement !== undefined)
  const productByHandle = new Map<string, ProductDTO>()

  for (const inputChunk of chunk(owned)) {
    const handles = inputChunk.map((product) => product.handle)
    const products = await productService.listProducts(
      { handle: { $in: handles } },
      {
        relations: ["variants"],
        select: [
          "id",
          "handle",
          "variants.id",
          "variants.metadata",
          "variants.sku",
        ],
        take: handles.length,
      }
    )
    for (const product of products) {
      productByHandle.set(product.handle, product)
    }
  }

  const missing = owned
    .map((product) => product.handle)
    .filter((handle) => !productByHandle.has(handle))
  if (missing.length) {
    throw new Error(
      `Products were not found during measurement reconciliation: ${missing.join(", ")}`
    )
  }

  return owned.map((product) =>
    resolveProductInput(
      product,
      productByHandle.get(product.handle) as ProductDTO
    )
  )
}

async function listBatchProductMeasurements(
  productIds: string[],
  service: ReturnType<typeof getMeasurementUnitService>,
  context: Context<SqlEntityManager>
) {
  const result: ProductMeasurementRecord[] = []
  let skip = 0

  while (true) {
    const [page, count] = await service.listAndCountProductMeasurements(
      { product_id: { $in: productIds } },
      {
        order: { id: "ASC" },
        skip,
        take: RECONCILIATION_BATCH_SIZE,
        withDeleted: true,
      },
      context
    )
    result.push(...page)
    if (page.length === 0 || result.length >= count) {
      return result
    }
    skip += page.length
  }
}

async function listBatchVariantMeasurements(
  productMeasurementIds: string[],
  service: ReturnType<typeof getMeasurementUnitService>,
  context: Context<SqlEntityManager>
) {
  if (!productMeasurementIds.length) {
    return []
  }
  const result: ProductVariantMeasurementRecord[] = []
  let skip = 0

  while (true) {
    const [page, count] = await service.listAndCountProductVariantMeasurements(
      { product_measurement_id: { $in: productMeasurementIds } },
      {
        order: { id: "ASC" },
        skip,
        take: RECONCILIATION_BATCH_SIZE,
        withDeleted: true,
      },
      context
    )
    result.push(...page)
    if (page.length === 0 || result.length >= count) {
      return result
    }
    skip += page.length
  }
}

function getDesiredUnit(
  measurement: SeedProductMeasurementInput,
  unitBySemanticKey: Map<string, MeasurementUnitRecord>
) {
  const unit = unitBySemanticKey.get(
    getSeedMeasurementUnitSemanticKey(measurement.unit)
  )
  if (!unit) {
    throw new Error(
      `Measurement unit "${measurement.unit.symbol}" with base quantity ${measurement.unit.base_quantity} was not reconciled`
    )
  }
  return unit
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const result = new Map<string, T[]>()
  for (const item of items) {
    const key = getKey(item)
    const values = result.get(key) ?? []
    values.push(item)
    result.set(key, values)
  }
  return result
}

function addActiveVariantRecordsToSoftDelete(
  records: ProductVariantMeasurementRecord[],
  plan: ProductRecordMutationPlan
) {
  for (const record of records) {
    if (!record.deleted_at) {
      plan.variantIdsToSoftDelete.add(record.id)
    }
  }
}

function planProductMeasurementClear(
  productId: string,
  records: ProductMeasurementRecord[],
  variantsByProductMeasurementId: Map<
    string,
    ProductVariantMeasurementRecord[]
  >,
  plan: ProductRecordMutationPlan
) {
  for (const record of records) {
    if (!record.deleted_at) {
      plan.productIdsToSoftDelete.add(record.id)
    }
    addActiveVariantRecordsToSoftDelete(
      variantsByProductMeasurementId.get(record.id) ?? [],
      plan
    )
  }
  plan.productTargetById.set(productId, null)
}

function planProductMeasurementSet({
  current,
  desired,
  plan,
  records,
  unitBySemanticKey,
  variantsByProductMeasurementId,
}: {
  current: ResolvedProductInput
  desired: SeedProductMeasurementInput
  plan: ProductRecordMutationPlan
  records: ProductMeasurementRecord[]
  unitBySemanticKey: Map<string, MeasurementUnitRecord>
  variantsByProductMeasurementId: Map<string, ProductVariantMeasurementRecord[]>
}) {
  const unit = getDesiredUnit(desired, unitBySemanticKey)
  const target = pickCanonicalRecord(
    records.filter((record) => record.measurement_unit_id === unit.id)
  )
  for (const record of records) {
    if (record.id === target?.id) {
      continue
    }
    if (!record.deleted_at) {
      plan.productIdsToSoftDelete.add(record.id)
    }
    addActiveVariantRecordsToSoftDelete(
      variantsByProductMeasurementId.get(record.id) ?? [],
      plan
    )
  }
  if (!target) {
    plan.creates.push({
      measurement_unit_id: unit.id,
      product_id: current.product.id,
    })
    return
  }
  if (target.deleted_at) {
    plan.productIdsToRestore.add(target.id)
  }
  plan.productTargetById.set(current.product.id, {
    ...target,
    deleted_at: null,
  })
}

export function buildProductRecordMutationPlan(
  resolved: ResolvedProductInput[],
  productMeasurements: ProductMeasurementRecord[],
  variantMeasurements: ProductVariantMeasurementRecord[],
  unitBySemanticKey: Map<string, MeasurementUnitRecord>
) {
  const plan: ProductRecordMutationPlan = {
    creates: [],
    productIdsToRestore: new Set(),
    productIdsToSoftDelete: new Set(),
    productTargetById: new Map(),
    variantIdsToSoftDelete: new Set(),
  }
  const productsById = groupBy(
    productMeasurements,
    (record) => record.product_id
  )
  const variantsByProductMeasurementId = groupBy(
    variantMeasurements,
    (record) => record.product_measurement_id
  )

  for (const current of resolved) {
    const records = productsById.get(current.product.id) ?? []
    const desired = current.input.measurement
    if (desired === undefined) {
      throw new Error(
        `Product "${current.input.handle}" does not own measurement reconciliation`
      )
    }
    if (desired === null) {
      planProductMeasurementClear(
        current.product.id,
        records,
        variantsByProductMeasurementId,
        plan
      )
    } else {
      planProductMeasurementSet({
        current,
        desired,
        plan,
        records,
        unitBySemanticKey,
        variantsByProductMeasurementId,
      })
    }
  }

  return plan
}

async function applyProductRecordMutationPlan(
  plan: ProductRecordMutationPlan,
  productMeasurements: ProductMeasurementRecord[],
  service: ReturnType<typeof getMeasurementUnitService>,
  context: Context<SqlEntityManager>
) {
  if (plan.variantIdsToSoftDelete.size) {
    await service.softDeleteProductVariantMeasurements(
      [...plan.variantIdsToSoftDelete],
      {},
      context
    )
  }
  if (plan.productIdsToSoftDelete.size) {
    await service.softDeleteProductMeasurements(
      [...plan.productIdsToSoftDelete],
      {},
      context
    )
  }
  if (plan.productIdsToRestore.size) {
    await service.restoreProductMeasurements(
      [...plan.productIdsToRestore],
      {},
      context
    )
  }
  if (!plan.creates.length) {
    return
  }

  const created = await service.createProductMeasurements(plan.creates, context)
  for (const record of created) {
    plan.productTargetById.set(record.product_id, record)
    productMeasurements.push(record)
  }
}

async function reconcileProductMeasurementRecords(
  resolved: ResolvedProductInput[],
  service: ReturnType<typeof getMeasurementUnitService>,
  unitBySemanticKey: Map<string, MeasurementUnitRecord>,
  context: Context<SqlEntityManager>
) {
  const productMeasurements = await listBatchProductMeasurements(
    resolved.map(({ product }) => product.id),
    service,
    context
  )
  const variantMeasurements = await listBatchVariantMeasurements(
    productMeasurements.map((record) => record.id),
    service,
    context
  )
  const plan = buildProductRecordMutationPlan(
    resolved,
    productMeasurements,
    variantMeasurements,
    unitBySemanticKey
  )
  await applyProductRecordMutationPlan(
    plan,
    productMeasurements,
    service,
    context
  )

  return {
    productMeasurements,
    productTargetById: plan.productTargetById,
    variantIdsToSoftDelete: plan.variantIdsToSoftDelete,
    variantMeasurements,
  }
}

function getDesiredVariantMeasurement(
  input: NonNullable<ProductInput["variants"]>[number] | undefined
): SeedVariantMeasurementInput | null | undefined {
  return input?.measurement
}

function validateVariantQuantity(
  desired: SeedVariantMeasurementInput,
  variantId: string
) {
  if (
    !(
      Number.isFinite(desired.product_unit_quantity) &&
      desired.product_unit_quantity > 0
    )
  ) {
    throw new Error(
      `Product Variant "${variantId}" measurement quantity must be positive`
    )
  }
}

function planExplicitVariantMeasurement({
  desired,
  matching,
  plan,
  productTarget,
  variant,
}: {
  desired: SeedVariantMeasurementInput
  matching: ProductVariantMeasurementRecord[]
  plan: VariantRecordMutationPlan
  productTarget: ProductMeasurementRecord
  variant: ExistingProductVariant
}) {
  validateVariantQuantity(desired, variant.id)
  const target = pickCanonicalRecord(matching)
  if (!target) {
    plan.creates.push({
      product_measurement_id: productTarget.id,
      product_unit_quantity: desired.product_unit_quantity,
      product_variant_id: variant.id,
    })
    return
  }
  if (target.deleted_at) {
    plan.restoreIds.add(target.id)
  }
  const activeTarget = { ...target, deleted_at: null }
  if (
    toNumber(target.product_unit_quantity) !== desired.product_unit_quantity
  ) {
    plan.updates.push({
      id: target.id,
      product_measurement_id: productTarget.id,
      product_unit_quantity: desired.product_unit_quantity,
      product_variant_id: variant.id,
    })
    activeTarget.product_unit_quantity = desired.product_unit_quantity
  }
  plan.variantTargetById.set(variant.id, activeTarget)
}

function planOmittedVariantMeasurement({
  matching,
  plan,
  previousProductMeasurement,
  productTarget,
  recordsByVariantAndProductMeasurement,
  variant,
}: {
  matching: ProductVariantMeasurementRecord[]
  plan: VariantRecordMutationPlan
  previousProductMeasurement?: ProductMeasurementRecord
  productTarget: ProductMeasurementRecord
  recordsByVariantAndProductMeasurement: Map<
    string,
    ProductVariantMeasurementRecord[]
  >
  variant: ExistingProductVariant
}) {
  const active = matching.find(
    (record) => !(record.deleted_at || plan.softDeleteIds.has(record.id))
  )
  if (active) {
    plan.variantTargetById.set(variant.id, active)
    return
  }

  const previous = previousProductMeasurement
    ? pickCanonicalRecord(
        (
          recordsByVariantAndProductMeasurement.get(
            `${variant.id}:${previousProductMeasurement.id}`
          ) ?? []
        ).filter((record) => !record.deleted_at)
      )
    : undefined
  if (!previous) {
    plan.variantTargetById.set(variant.id, null)
    return
  }

  planExplicitVariantMeasurement({
    desired: {
      product_unit_quantity: toNumber(previous.product_unit_quantity),
    },
    matching,
    plan,
    productTarget,
    variant,
  })
}

function planVariantMeasurement({
  inputVariant,
  plan,
  previousProductMeasurement,
  productTarget,
  recordsByVariantAndProductMeasurement,
  variant,
}: {
  inputVariant: NonNullable<ProductInput["variants"]>[number] | undefined
  plan: VariantRecordMutationPlan
  previousProductMeasurement?: ProductMeasurementRecord
  productTarget: ProductMeasurementRecord | null | undefined
  recordsByVariantAndProductMeasurement: Map<
    string,
    ProductVariantMeasurementRecord[]
  >
  variant: ExistingProductVariant
}) {
  if (!productTarget) {
    plan.variantTargetById.set(variant.id, null)
    return
  }
  const desired = getDesiredVariantMeasurement(inputVariant)
  const matching =
    recordsByVariantAndProductMeasurement.get(
      `${variant.id}:${productTarget.id}`
    ) ?? []
  if (desired === null) {
    for (const record of matching) {
      if (!record.deleted_at) {
        plan.softDeleteIds.add(record.id)
      }
    }
    plan.variantTargetById.set(variant.id, null)
    return
  }
  if (desired === undefined) {
    planOmittedVariantMeasurement({
      matching,
      plan,
      previousProductMeasurement,
      productTarget,
      recordsByVariantAndProductMeasurement,
      variant,
    })
    return
  }
  planExplicitVariantMeasurement({
    desired,
    matching,
    plan,
    productTarget,
    variant,
  })
}

export function buildVariantRecordMutationPlan(
  resolved: ResolvedProductInput[],
  productState: Awaited<ReturnType<typeof reconcileProductMeasurementRecords>>
) {
  const plan: VariantRecordMutationPlan = {
    creates: [],
    restoreIds: new Set(),
    softDeleteIds: productState.variantIdsToSoftDelete,
    updates: [],
    variantTargetById: new Map(),
  }
  const recordsByVariantAndProductMeasurement = groupBy(
    productState.variantMeasurements,
    (record) => `${record.product_variant_id}:${record.product_measurement_id}`
  )
  const productMeasurementsByProductId = groupBy(
    productState.productMeasurements,
    (record) => record.product_id
  )

  for (const current of resolved) {
    const productTarget = productState.productTargetById.get(current.product.id)
    const previousProductMeasurement = pickCanonicalRecord(
      (productMeasurementsByProductId.get(current.product.id) ?? []).filter(
        (record) => !record.deleted_at && record.id !== productTarget?.id
      )
    )
    for (const variant of current.product.variants ?? []) {
      planVariantMeasurement({
        inputVariant: current.variantInputById.get(variant.id),
        plan,
        previousProductMeasurement,
        productTarget,
        recordsByVariantAndProductMeasurement,
        variant,
      })
    }
  }

  return plan
}

async function applyVariantRecordMutationPlan(
  plan: VariantRecordMutationPlan,
  service: ReturnType<typeof getMeasurementUnitService>,
  context: Context<SqlEntityManager>
) {
  if (plan.softDeleteIds.size) {
    await service.softDeleteProductVariantMeasurements(
      [...plan.softDeleteIds],
      {},
      context
    )
  }
  if (plan.restoreIds.size) {
    await service.restoreProductVariantMeasurements(
      [...plan.restoreIds],
      {},
      context
    )
  }
  if (plan.updates.length) {
    await service.updateProductVariantMeasurements(plan.updates, context)
  }
  if (!plan.creates.length) {
    return
  }

  const created = await service.createProductVariantMeasurements(
    plan.creates,
    context
  )
  for (const record of created) {
    plan.variantTargetById.set(record.product_variant_id, record)
  }
}

async function reconcileVariantMeasurementRecords(
  resolved: ResolvedProductInput[],
  productState: Awaited<ReturnType<typeof reconcileProductMeasurementRecords>>,
  service: ReturnType<typeof getMeasurementUnitService>,
  context: Context<SqlEntityManager>
) {
  const plan = buildVariantRecordMutationPlan(resolved, productState)
  await applyVariantRecordMutationPlan(plan, service, context)
  return plan.variantTargetById
}

async function reconcileBatchRecords(
  resolved: ResolvedProductInput[],
  service: ReturnType<typeof getMeasurementUnitService>,
  unitBySemanticKey: Map<string, MeasurementUnitRecord>
): Promise<BatchReconciliationResult> {
  return await service.runInTransaction(async (context) => {
    const productState = await reconcileProductMeasurementRecords(
      resolved,
      service,
      unitBySemanticKey,
      context
    )
    const variantTargetById = await reconcileVariantMeasurementRecords(
      resolved,
      productState,
      service,
      context
    )

    return {
      productTargetById: productState.productTargetById,
      variantTargetById,
    }
  })
}

function isProductMeasurementLinkRecord(
  value: unknown
): value is ProductMeasurementLinkRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "product_id" in value &&
    typeof value.product_id === "string" &&
    "product_measurement_id" in value &&
    typeof value.product_measurement_id === "string"
  )
}

function isVariantMeasurementLinkRecord(
  value: unknown
): value is ProductVariantMeasurementLinkRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "product_variant_id" in value &&
    typeof value.product_variant_id === "string" &&
    "product_variant_measurement_id" in value &&
    typeof value.product_variant_measurement_id === "string"
  )
}

async function listLinkRecords<T>({
  entity,
  fields,
  filters,
  isRecord,
  order,
  query,
}: {
  entity: string
  fields: string[]
  filters: Record<string, unknown>
  isRecord: (value: unknown) => value is T
  order: Record<string, "ASC">
  query: Query
}) {
  const records: T[] = []
  let skip = 0

  while (true) {
    const { data, metadata } = await query.graph({
      entity,
      fields,
      filters,
      pagination: {
        order,
        skip,
        take: RECONCILIATION_BATCH_SIZE,
      },
      withDeleted: true,
    })
    if (!(Array.isArray(data) && data.every(isRecord))) {
      throw new Error(
        `Measurement link query for "${entity}" returned invalid data`
      )
    }
    records.push(...data)
    const exhausted =
      metadata?.count === undefined
        ? data.length < RECONCILIATION_BATCH_SIZE
        : records.length >= metadata.count
    if (data.length === 0 || exhausted) {
      return records
    }
    skip += data.length
  }
}

function planProductLinks(
  productLinks: ProductMeasurementLinkRecord[],
  targets: BatchReconciliationResult["productTargetById"],
  plan: MeasurementLinkPlan
) {
  const linksByProductId = groupBy(productLinks, (link) => link.product_id)
  for (const [productId, target] of targets) {
    const links = linksByProductId.get(productId) ?? []
    plan.productLinksToDismiss.push(
      ...links.filter(
        (link) => !link.deleted_at && link.product_measurement_id !== target?.id
      )
    )
    if (!target) {
      continue
    }
    const targetLink = links.find(
      (link) => link.product_measurement_id === target.id
    )
    if (!targetLink) {
      plan.productLinksToCreate.push({
        product_id: productId,
        product_measurement_id: target.id,
      })
    } else if (targetLink.deleted_at) {
      plan.productMeasurementIdsToRestore.push(target.id)
    }
  }
}

function planVariantLinks(
  variantLinks: ProductVariantMeasurementLinkRecord[],
  targets: BatchReconciliationResult["variantTargetById"],
  plan: MeasurementLinkPlan
) {
  const linksByVariantId = groupBy(
    variantLinks,
    (link) => link.product_variant_id
  )
  for (const [variantId, target] of targets) {
    const links = linksByVariantId.get(variantId) ?? []
    plan.variantLinksToDismiss.push(
      ...links.filter(
        (link) =>
          !link.deleted_at && link.product_variant_measurement_id !== target?.id
      )
    )
    if (!target) {
      continue
    }
    const targetLink = links.find(
      (link) => link.product_variant_measurement_id === target.id
    )
    if (!targetLink) {
      plan.variantLinksToCreate.push({
        product_variant_id: variantId,
        product_variant_measurement_id: target.id,
      })
    } else if (targetLink.deleted_at) {
      plan.variantMeasurementIdsToRestore.push(target.id)
    }
  }
}

export function buildLinkPlan(
  productLinks: ProductMeasurementLinkRecord[],
  variantLinks: ProductVariantMeasurementLinkRecord[],
  targets: BatchReconciliationResult
): MeasurementLinkPlan {
  const plan: MeasurementLinkPlan = {
    productLinksToCreate: [],
    productLinksToDismiss: [],
    productMeasurementIdsToRestore: [],
    variantLinksToCreate: [],
    variantLinksToDismiss: [],
    variantMeasurementIdsToRestore: [],
  }
  planProductLinks(productLinks, targets.productTargetById, plan)
  planVariantLinks(variantLinks, targets.variantTargetById, plan)
  return plan
}

async function reconcileBatchLinks(
  resolved: ResolvedProductInput[],
  targets: BatchReconciliationResult,
  query: Query,
  link: Link
) {
  const productIds = resolved.map(({ product }) => product.id)
  const variantIds = resolved.flatMap(({ product }) =>
    (product.variants ?? []).map((variant) => variant.id)
  )
  const productLinks = await listLinkRecords({
    entity: ProductMeasurementLink.entryPoint,
    fields: ["deleted_at", "product_id", "product_measurement_id"],
    filters: { product_id: { $in: productIds } },
    isRecord: isProductMeasurementLinkRecord,
    order: { product_id: "ASC", product_measurement_id: "ASC" },
    query,
  })
  const variantLinks = variantIds.length
    ? await listLinkRecords({
        entity: ProductVariantMeasurementLink.entryPoint,
        fields: [
          "deleted_at",
          "product_variant_id",
          "product_variant_measurement_id",
        ],
        filters: { product_variant_id: { $in: variantIds } },
        isRecord: isVariantMeasurementLinkRecord,
        order: {
          product_variant_id: "ASC",
          product_variant_measurement_id: "ASC",
        },
        query,
      })
    : []
  const plan = buildLinkPlan(productLinks, variantLinks, targets)
  const linksToDismiss = [
    ...plan.productLinksToDismiss.map((current) =>
      productMeasurementLink(current.product_id, current.product_measurement_id)
    ),
    ...plan.variantLinksToDismiss.map((current) =>
      productVariantMeasurementLink(
        current.product_variant_id,
        current.product_variant_measurement_id
      )
    ),
  ]
  if (linksToDismiss.length) {
    await link.dismiss(linksToDismiss)
  }
  if (plan.productMeasurementIdsToRestore.length) {
    await link.restore({
      [MEASUREMENT_UNIT_MODULE]: {
        product_measurement_id: plan.productMeasurementIdsToRestore,
      },
    })
  }
  if (plan.variantMeasurementIdsToRestore.length) {
    await link.restore({
      [MEASUREMENT_UNIT_MODULE]: {
        product_variant_measurement_id: plan.variantMeasurementIdsToRestore,
      },
    })
  }
  const linksToCreate = [
    ...plan.productLinksToCreate.map((current) =>
      productMeasurementLink(current.product_id, current.product_measurement_id)
    ),
    ...plan.variantLinksToCreate.map((current) =>
      productVariantMeasurementLink(
        current.product_variant_id,
        current.product_variant_measurement_id
      )
    ),
  ]
  if (linksToCreate.length) {
    await link.create(linksToCreate)
  }
}

function summarizeInput(
  resolved: ResolvedProductInput[]
): ReconciliationSummary {
  const summary: ReconciliationSummary = {
    products_cleared: 0,
    products_set: 0,
    units_created: 0,
    units_restored: 0,
    units_reused: 0,
    variants_cleared: 0,
    variants_set: 0,
  }
  for (const current of resolved) {
    if (current.input.measurement === null) {
      summary.products_cleared += 1
    } else {
      summary.products_set += 1
    }
    for (const variant of current.variantInputById.values()) {
      if (variant.measurement === null) {
        summary.variants_cleared += 1
      } else if (variant.measurement) {
        summary.variants_set += 1
      }
    }
  }
  return summary
}

function getRequiredBatchMeasurementUnits(
  resolved: ResolvedProductInput[],
  unitBySemanticKey: Map<string, MeasurementUnitRecord>
) {
  const required = new Map<string, MeasurementUnitRecord>()

  for (const current of resolved) {
    if (current.input.measurement) {
      const semanticKey = getSeedMeasurementUnitSemanticKey(
        current.input.measurement.unit
      )
      required.set(
        semanticKey,
        getDesiredUnit(current.input.measurement, unitBySemanticKey)
      )
    }
  }

  return required
}

async function assertBatchMeasurementUnitsAreActive(
  required: Map<string, MeasurementUnitRecord>,
  service: ReturnType<typeof getMeasurementUnitService>
) {
  if (!required.size) {
    return
  }

  const ids = [...new Set([...required.values()].map((unit) => unit.id))]
  const activeUnits = await service.listMeasurementUnits(
    { id: { $in: ids } },
    { take: ids.length }
  )
  const activeById = new Map(activeUnits.map((unit) => [unit.id, unit]))

  for (const [semanticKey, expected] of required) {
    const active = activeById.get(expected.id)
    if (!active || getSeedMeasurementUnitSemanticKey(active) !== semanticKey) {
      throw new Error(
        `Measurement unit "${expected.id}" changed during seed reconciliation; rerun the seed`
      )
    }
  }
}

export const reconcileProductMeasurementsStep = createStep(
  "reconcile-product-measurements",
  async (input: CreateProductsStepInput, { container }) => {
    validateSeedProductMeasurementInput(input)
    const canonical = collectCanonicalSeedMeasurementUnits(input)
    const ownedCount = input.filter(
      (product) => product.measurement !== undefined
    ).length
    if (!ownedCount) {
      return new StepResponse({
        products_cleared: 0,
        products_set: 0,
        units_created: 0,
        units_restored: 0,
        units_reused: 0,
        variants_cleared: 0,
        variants_set: 0,
      } satisfies ReconciliationSummary)
    }

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const locking = container.resolve<ILockingModule>(Modules.LOCKING)
    const productService = container.resolve<IProductModuleService>(
      Modules.PRODUCT
    )
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const service = getMeasurementUnitService(container)
    const resolved = await resolveProducts(input, productService)
    const ensured = await ensureMeasurementUnits(canonical, service, locking)
    const summary = summarizeInput(resolved)
    summary.units_created = ensured.created
    summary.units_restored = ensured.restored
    summary.units_reused = ensured.reused

    for (const currentBatch of chunk(resolved)) {
      const requiredUnits = getRequiredBatchMeasurementUnits(
        currentBatch,
        ensured.unitBySemanticKey
      )
      const lockKeys = [
        ...new Set([
          ...currentBatch.map(
            ({ product }) => `measurement-product:${product.id}`
          ),
          ...[...requiredUnits.values()].map(
            (unit) => `measurement-unit:${unit.id}`
          ),
        ]),
      ].sort()
      await locking.execute(
        lockKeys,
        async () => {
          await assertBatchMeasurementUnitsAreActive(requiredUnits, service)
          const targets = await reconcileBatchRecords(
            currentBatch,
            service,
            ensured.unitBySemanticKey
          )
          await reconcileBatchLinks(currentBatch, targets, query, link)
        },
        { timeout: 30 }
      )
    }

    logger.info(
      `Reconciled Product measurements: products_set=${summary.products_set}, products_cleared=${summary.products_cleared}, variants_set=${summary.variants_set}, variants_cleared=${summary.variants_cleared}, units_created=${summary.units_created}, units_restored=${summary.units_restored}, units_reused=${summary.units_reused}`
    )
    return new StepResponse(summary)
  }
)

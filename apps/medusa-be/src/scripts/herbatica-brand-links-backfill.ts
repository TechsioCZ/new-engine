import { readFileSync } from "node:fs"
import type { ExecArgs, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import { ProductBrandLink } from "../links/product-brand"
import { batchLinkProductsToBrandWorkflow } from "../workflows/brand/workflows"

// Herbatika SK brand->product membership backfill.
// Input: JSON object shaped { "<brand_id>": ["prod_...", ...], ... } produced by
// scraping the official herbatica.sk brand pages with full pagination (the
// original seed only captured page 1 of each brand, capping big brands at ~60).
//
// Default = DRY RUN. Apply only with HERBATICA_BRAND_LINKS_APPLY=1 (medusa exec
// swallows bare CLI flags, so env vars are the unambiguous switch).
//
// Safety contract:
//  - ADD-only. Never deletes or reassigns an existing product<->brand link.
//  - A product with a current link to a DIFFERENT brand than the input target
//    is treated as a conflict and skipped (never reassigned).
//  - A product listed under two different brand_ids in the input itself is an
//    input error: logged and skipped entirely (added to neither brand).
//  - Idempotent: links already present are skipped; re-running after a partial
//    apply only adds what's still missing.

const CHUNK = 200

type LinksFile = Record<string, string[]>

type ProductLinkRow = Readonly<{ brand_id?: string; product_id?: string }>

const parseApply = (): boolean =>
  process.env.HERBATICA_BRAND_LINKS_APPLY === "1"

const loadLinksFile = (): LinksFile => {
  const file = process.env.HERBATICA_BRAND_LINKS_FILE
  if (!file) {
    throw new Error("HERBATICA_BRAND_LINKS_FILE env var is required")
  }
  const raw: unknown = JSON.parse(readFileSync(file, "utf8"))
  if (!(raw && typeof raw === "object" && !Array.isArray(raw))) {
    throw new Error(
      "links file must be a JSON object of brand_id -> product_id[]"
    )
  }
  const record = raw as Record<string, unknown>
  const result: LinksFile = {}
  for (const [brandId, value] of Object.entries(record)) {
    if (typeof brandId !== "string" || brandId.trim() === "") {
      throw new Error(`invalid brand_id key: ${JSON.stringify(brandId)}`)
    }
    if (
      !Array.isArray(value) ||
      value.some((entry) => typeof entry !== "string")
    ) {
      throw new Error(
        `brand ${brandId} must map to an array of product id strings`
      )
    }
    result[brandId] = [...new Set(value as string[])]
  }
  return result
}

const chunk = <Value>(values: Value[], size: number): Value[][] => {
  const result: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

// Detect products claimed by two or more different brand_ids in the input
// itself. This is an input error (a product can only belong to one brand):
// log and exclude the product from every brand's candidate set.
const findCrossBrandInputConflicts = (
  links: LinksFile
): { productToBrands: Map<string, Set<string>>; conflicted: Set<string> } => {
  const productToBrands = new Map<string, Set<string>>()
  for (const [brandId, productIds] of Object.entries(links)) {
    for (const productId of productIds) {
      const set = productToBrands.get(productId) ?? new Set<string>()
      set.add(brandId)
      productToBrands.set(productId, set)
    }
  }
  const conflicted = new Set<string>()
  for (const [productId, brandIds] of productToBrands) {
    if (brandIds.size > 1) {
      conflicted.add(productId)
    }
  }
  return { productToBrands, conflicted }
}

const readProductBrandLinks = async (
  query: Query,
  productIds: string[]
): Promise<ProductLinkRow[]> => {
  const rows: ProductLinkRow[] = []
  for (const idChunk of chunk(productIds, CHUNK)) {
    if (idChunk.length === 0) {
      continue
    }
    const { data } = await query.graph({
      entity: ProductBrandLink.entryPoint,
      fields: ["product_id", "brand_id"],
      filters: { product_id: { $in: idChunk } },
    })
    rows.push(...(data as ProductLinkRow[]))
  }
  return rows
}

const readCurrentByProduct = async (
  query: Query,
  productIds: string[]
): Promise<Map<string, Set<string>>> => {
  const currentByProduct = new Map<string, Set<string>>()
  for (const row of await readProductBrandLinks(query, productIds)) {
    if (row.product_id && row.brand_id) {
      const set = currentByProduct.get(row.product_id) ?? new Set<string>()
      set.add(row.brand_id)
      currentByProduct.set(row.product_id, set)
    }
  }
  return currentByProduct
}

const readExistingProductIds = async (
  query: Query,
  productIds: string[]
): Promise<Set<string>> => {
  const existing = new Set<string>()
  for (const idChunk of chunk(productIds, CHUNK)) {
    if (idChunk.length === 0) {
      continue
    }
    const { data } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { id: { $in: idChunk } },
    })
    for (const row of data as Array<{ id: string }>) {
      existing.add(row.id)
    }
  }
  return existing
}

type LinkDecision = "add" | "already-same" | "conflict"

const classifyLink = (
  targetBrandId: string,
  currentBrandIds: Set<string> | undefined
): LinkDecision => {
  const current = currentBrandIds ?? new Set<string>()
  if (current.has(targetBrandId)) {
    return "already-same"
  }
  if (current.size > 0) {
    return "conflict"
  }
  return "add"
}

type BackfillPlan = {
  conflictExamples: string[]
  inputConflicted: Set<string>
  missingProductIds: string[]
  perBrandAdd: Map<string, string[]>
  totalAdd: number
  totalAlreadySame: number
  totalConflict: number
}

const skipReasonFor = (
  productId: string,
  inputConflicted: Set<string>,
  missingProductIds: Set<string>
): boolean => inputConflicted.has(productId) || missingProductIds.has(productId)

type PlanBrandAdditionsInput = {
  brandId: string
  conflictExamples: string[]
  currentByProduct: Map<string, Set<string>>
  inputConflicted: Set<string>
  missingProductIds: Set<string>
  productIds: string[]
}

const planBrandAdditions = (
  input: PlanBrandAdditionsInput
): { add: string[]; alreadySame: number; conflict: number } => {
  const {
    brandId,
    conflictExamples,
    currentByProduct,
    inputConflicted,
    missingProductIds,
    productIds,
  } = input
  const add: string[] = []
  let alreadySame = 0
  let conflict = 0
  for (const productId of productIds) {
    if (skipReasonFor(productId, inputConflicted, missingProductIds)) {
      continue
    }
    const decision = classifyLink(brandId, currentByProduct.get(productId))
    if (decision === "add") {
      add.push(productId)
    } else if (decision === "already-same") {
      alreadySame += 1
    } else {
      conflict += 1
      if (conflictExamples.length < 12) {
        const owner = [...(currentByProduct.get(productId) ?? [])][0]
        conflictExamples.push(
          `${productId}->brand=${brandId} currentOwner=${owner}`
        )
      }
    }
  }
  return { add, alreadySame, conflict }
}

const buildPlan = (
  links: LinksFile,
  inputConflicted: Set<string>,
  missingProductIds: string[],
  currentByProduct: Map<string, Set<string>>
): BackfillPlan => {
  const missingSet = new Set(missingProductIds)
  const conflictExamples: string[] = []
  const perBrandAdd = new Map<string, string[]>()
  let totalAdd = 0
  let totalAlreadySame = 0
  let totalConflict = 0

  for (const [brandId, productIds] of Object.entries(links)) {
    const result = planBrandAdditions({
      brandId,
      conflictExamples,
      currentByProduct,
      inputConflicted,
      missingProductIds: missingSet,
      productIds,
    })
    if (result.add.length > 0) {
      perBrandAdd.set(brandId, result.add)
    }
    totalAdd += result.add.length
    totalAlreadySame += result.alreadySame
    totalConflict += result.conflict
  }

  return {
    conflictExamples,
    inputConflicted,
    missingProductIds,
    perBrandAdd,
    totalAdd,
    totalAlreadySame,
    totalConflict,
  }
}

const logPlan = (
  logger: Logger,
  apply: boolean,
  links: LinksFile,
  plan: BackfillPlan
): void => {
  logger.info("=== Herbatika brand links backfill plan ===")
  logger.info(`mode: ${apply ? "APPLY" : "DRY-RUN"}`)
  logger.info(`brands in input: ${Object.keys(links).length}`)
  logger.info(
    `product links: to-add=${plan.totalAdd} | already-present(skip)=${plan.totalAlreadySame} | conflict-other-brand(skip)=${plan.totalConflict} | cross-brand-input-error(skip)=${plan.inputConflicted.size} | missing-product(skip)=${plan.missingProductIds.length}`
  )
  logger.info(`conflict examples: ${JSON.stringify(plan.conflictExamples)}`)
}

const applyPlan = async (
  container: ExecArgs["container"],
  logger: Logger,
  perBrandAdd: Map<string, string[]>
): Promise<{ brandsTouched: number; linkedTotal: number }> => {
  logger.info("Applying brand links backfill...")
  let linkedTotal = 0
  let brandsTouched = 0
  for (const [brandId, add] of perBrandAdd) {
    let addedForBrand = 0
    for (const addChunk of chunk(add, CHUNK)) {
      const result = await batchLinkProductsToBrandWorkflow(container).run({
        input: { add: addChunk, brand_id: brandId, remove: [] },
      })
      addedForBrand += result.result.added.length
    }
    linkedTotal += addedForBrand
    brandsTouched += 1
    logger.info(`brand ${brandId}: linked ${addedForBrand} products`)
  }
  logger.info(
    `Applied: touched ${brandsTouched} brands, linked ${linkedTotal} products`
  )
  return { brandsTouched, linkedTotal }
}

export default async function herbaticaBrandLinksBackfill({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const apply = parseApply()
  const links = loadLinksFile()

  const { conflicted: inputConflicted } = findCrossBrandInputConflicts(links)
  if (inputConflicted.size > 0) {
    logger.info(
      `input error: ${inputConflicted.size} product id(s) listed under 2+ brands in the input file; excluded from all brands. examples: ${JSON.stringify(
        [...inputConflicted].slice(0, 12)
      )}`
    )
  }

  const allProductIds = [...new Set(Object.values(links).flat())].filter(
    (productId) => !inputConflicted.has(productId)
  )

  const existingProductIds = await readExistingProductIds(query, allProductIds)
  const missingProductIds = allProductIds.filter(
    (productId) => !existingProductIds.has(productId)
  )
  if (missingProductIds.length > 0) {
    logger.info(
      `warning: ${missingProductIds.length} product id(s) from the input do not resolve to a live product; skipped. examples: ${JSON.stringify(
        missingProductIds.slice(0, 12)
      )}`
    )
  }

  const currentByProduct = await readCurrentByProduct(query, allProductIds)
  const plan = buildPlan(
    links,
    inputConflicted,
    missingProductIds,
    currentByProduct
  )
  logPlan(logger, apply, links, plan)

  if (!apply) {
    logger.info("Dry-run complete; no data was written")
    return {
      brandsWithAdditions: plan.perBrandAdd.size,
      conflictSkipped: plan.totalConflict,
      crossBrandInputSkipped: plan.inputConflicted.size,
      linksToAdd: plan.totalAdd,
      missingProductSkipped: plan.missingProductIds.length,
    }
  }

  return await applyPlan(container, logger, plan.perBrandAdd)
}

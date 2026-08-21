import { lstat, mkdir, readFile, realpath } from "node:fs/promises"
import { dirname, isAbsolute, join, resolve } from "node:path"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  ExecArgs,
  IPricingModuleService,
  Logger,
  MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { writePrivateCommerceArtifactNoClobber } from "../market-commerce-readiness/writer"
import { canonicalJson, canonicalJsonLine, sha256Bytes } from "./canonical"
import { collectMarketPriceDatabaseSnapshot } from "./collector"
import { hashMarketPriceDatabaseSnapshot } from "./planner"
import {
  buildTestPriceConversionPlan,
  buildTestPriceConversionPlanArtifact,
  hashTestPriceConversionPlan,
  serializeTestPriceConversionPlan,
  serializeTestPriceConversionPlanArtifact,
  type TestPriceConversionBinding,
  type TestPriceConversionPlan,
  type TestPriceConversionPlanArtifact,
} from "./test-conversion"
import type {
  MarketPriceDatabasePrice,
  MarketPriceDatabaseSnapshot,
} from "./types"

type QueryService = Readonly<{
  graph: <Value>(input: {
    entity: string
    fields: readonly string[]
    pagination: { skip: number; take: number }
  }) => Promise<Readonly<{ data?: Value[] }>>
}>

type TestPriceConversionInventorySnapshot = Readonly<{
  levels: readonly Readonly<{
    id: string
    incomingQuantity: string
    inventoryItemId: string
    locationId: string
    reservedQuantity: string
    stockedQuantity: string
  }>[]
  variantLinks: readonly Readonly<{
    inventoryItemId: string
    requiredQuantity: string
    variantId: string
  }>[]
}>

type TestPriceConversionBackup = Readonly<{
  databaseSnapshot: MarketPriceDatabaseSnapshot
  inventorySnapshot: TestPriceConversionInventorySnapshot
  kind: "test-market-price-conversion-backup"
  plan: TestPriceConversionPlan
  planSha256: string
  schemaVersion: 1
}>

type TestPriceConversionReceipt = Readonly<{
  backupSha256: string
  binding: TestPriceConversionBinding
  createdPrices: readonly Readonly<{
    amount: number
    currencyCode: string
    priceId: string
    priceSetId: string
    productId: string
    variantId: string
  }>[]
  databaseSnapshotSha256After: string
  databaseSnapshotSha256Before: string
  inventoryFingerprintSha256After: string
  inventoryFingerprintSha256Before: string
  kind: "test-market-price-conversion-apply-receipt"
  planSha256: string
  schemaVersion: 1
  writeScope: readonly ["pricing.price"]
}>

type CliOptions =
  | Readonly<{ mode: "dry-run"; planOutputPath: string }>
  | Readonly<{
      artifactDirectory: string
      expectedPlanArtifactSha256: string
      expectedPlanSha256: string
      mode: "apply"
      planPath: string
    }>

const PAGE_SIZE = 500
const RELEASE_SHA = /^[a-f0-9]{40}$/
const SHA_256 = /^[a-f0-9]{64}$/
const DATABASE_INSTANCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const CANONICAL_DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/
const APPLY_LOCK_KEY = "test-price-conversion:test-engine"

const text = (value: unknown, label: string) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim()
  ) {
    throw new Error(`${label} must be a non-empty trimmed string`)
  }
  return value
}

const quantity = (value: unknown, label: string) => {
  const candidate =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>).value
      : value
  if (
    !(
      (typeof candidate === "string" && candidate.length > 0) ||
      (typeof candidate === "number" && Number.isFinite(candidate))
    )
  ) {
    throw new Error(`${label} must be an exact numeric value`)
  }
  const normalized = String(candidate)
  if (!CANONICAL_DECIMAL.test(normalized)) {
    throw new Error(`${label} must use canonical decimal notation`)
  }
  return normalized
}

const compareText = (left: string, right: string) => {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

const readPaged = async <Value>(
  query: QueryService,
  entity: string,
  fields: readonly string[]
) => {
  const rows: Value[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<Value>({
      entity,
      fields,
      pagination: { skip, take: PAGE_SIZE },
    })
    rows.push(...data)
    if (data.length < PAGE_SIZE) {
      return rows
    }
  }
}

const row = (value: unknown, label: string) => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

export const collectTestPriceConversionInventorySnapshot = async (
  container: MedusaContainer
): Promise<TestPriceConversionInventorySnapshot> => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const [rawLevels, rawLinks] = await Promise.all([
    readPaged<unknown>(query, "inventory_level", [
      "id",
      "inventory_item_id",
      "location_id",
      "stocked_quantity",
      "reserved_quantity",
      "incoming_quantity",
    ]),
    readPaged<unknown>(query, "product_variant_inventory_item", [
      "variant_id",
      "inventory_item_id",
      "required_quantity",
    ]),
  ])
  const levels = rawLevels
    .map((value, index) => {
      const level = row(value, `inventory level ${index}`)
      return {
        id: text(level.id, `inventory level ${index}.id`),
        incomingQuantity: quantity(
          level.incoming_quantity,
          `inventory level ${index}.incoming_quantity`
        ),
        inventoryItemId: text(
          level.inventory_item_id,
          `inventory level ${index}.inventory_item_id`
        ),
        locationId: text(
          level.location_id,
          `inventory level ${index}.location_id`
        ),
        reservedQuantity: quantity(
          level.reserved_quantity,
          `inventory level ${index}.reserved_quantity`
        ),
        stockedQuantity: quantity(
          level.stocked_quantity,
          `inventory level ${index}.stocked_quantity`
        ),
      }
    })
    .sort((left, right) => compareText(left.id, right.id))
  const variantLinks = rawLinks
    .map((value, index) => {
      const link = row(value, `inventory link ${index}`)
      return {
        inventoryItemId: text(
          link.inventory_item_id,
          `inventory link ${index}.inventory_item_id`
        ),
        requiredQuantity: quantity(
          link.required_quantity,
          `inventory link ${index}.required_quantity`
        ),
        variantId: text(link.variant_id, `inventory link ${index}.variant_id`),
      }
    })
    .sort((left, right) =>
      compareText(
        `${left.variantId}\u0000${left.inventoryItemId}`,
        `${right.variantId}\u0000${right.inventoryItemId}`
      )
    )
  return { levels, variantLinks }
}

export const hashTestPriceConversionInventorySnapshot = (
  snapshot: TestPriceConversionInventorySnapshot
) => sha256Bytes(canonicalJsonLine(snapshot))

export const buildTestPriceConversionDatabaseInstanceFingerprint = (
  environment: NodeJS.ProcessEnv
) => {
  const instanceId = text(
    environment.TEST_PRICE_CONVERSION_DATABASE_INSTANCE_ID,
    "TEST_PRICE_CONVERSION_DATABASE_INSTANCE_ID"
  )
  if (!DATABASE_INSTANCE_ID.test(instanceId)) {
    throw new Error("TEST_PRICE_CONVERSION_DATABASE_INSTANCE_ID is invalid")
  }
  let databaseUrl: URL
  try {
    databaseUrl = new URL(text(environment.DATABASE_URL, "DATABASE_URL"))
  } catch {
    throw new Error("DATABASE_URL is invalid")
  }
  if (
    !(
      ["postgres:", "postgresql:"].includes(databaseUrl.protocol) &&
      databaseUrl.hostname
    )
  ) {
    throw new Error("DATABASE_URL must identify PostgreSQL")
  }
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1))
  if (!databaseName || databaseName.includes("/")) {
    throw new Error("DATABASE_URL database name is invalid")
  }
  return sha256Bytes(
    canonicalJsonLine({
      databaseInstanceId: instanceId,
      databaseName,
      host: databaseUrl.hostname.toLowerCase(),
      port: databaseUrl.port || "5432",
      protocol: "postgresql",
    })
  )
}

export const buildTestPriceConversionBinding = (
  environment: NodeJS.ProcessEnv,
  inventorySnapshot: TestPriceConversionInventorySnapshot
): TestPriceConversionBinding => {
  if (environment.TEST_PRICE_CONVERSION_ENVIRONMENT_ID !== "test-engine") {
    throw new Error(
      "TEST_PRICE_CONVERSION_ENVIRONMENT_ID must be exactly test-engine"
    )
  }
  const backendReleaseSha = text(environment.RELEASE_SHA, "RELEASE_SHA")
  if (!RELEASE_SHA.test(backendReleaseSha)) {
    throw new Error("RELEASE_SHA must be a lowercase 40-character SHA")
  }
  return {
    backendBuildHash: text(
      environment.BACKEND_BUILD_HASH,
      "BACKEND_BUILD_HASH"
    ),
    backendDeploymentId: text(
      environment.ZANE_DEPLOYMENT_ID,
      "ZANE_DEPLOYMENT_ID"
    ),
    backendDeploymentSlot: (() => {
      const slot = text(
        environment.ZANE_DEPLOYMENT_SLOT,
        "ZANE_DEPLOYMENT_SLOT"
      )
      if (slot !== "blue" && slot !== "green") {
        throw new Error("ZANE_DEPLOYMENT_SLOT must be blue or green")
      }
      return slot
    })(),
    backendReleaseSha,
    databaseInstanceFingerprint:
      buildTestPriceConversionDatabaseInstanceFingerprint(environment),
    environmentId: "test-engine",
    inventoryFingerprintSha256:
      hashTestPriceConversionInventorySnapshot(inventorySnapshot),
    marketSalesChannels: [
      {
        marketCode: "cz",
        salesChannelId: text(
          environment.MARKET_SALES_CHANNEL_ID_CZ,
          "MARKET_SALES_CHANNEL_ID_CZ"
        ),
      },
      {
        marketCode: "hu",
        salesChannelId: text(
          environment.MARKET_SALES_CHANNEL_ID_HU,
          "MARKET_SALES_CHANNEL_ID_HU"
        ),
      },
      {
        marketCode: "ro",
        salesChannelId: text(
          environment.MARKET_SALES_CHANNEL_ID_RO,
          "MARKET_SALES_CHANNEL_ID_RO"
        ),
      },
      {
        marketCode: "sk",
        salesChannelId: text(
          environment.MARKET_SALES_CHANNEL_ID_SK,
          "MARKET_SALES_CHANNEL_ID_SK"
        ),
      },
    ],
  }
}

const canonicalAbsolutePath = (value: string, label: string) => {
  if (!isAbsolute(value) || resolve(value) !== value) {
    throw new Error(`${label} must be a canonical absolute path`)
  }
  return value
}

const parseValues = (args: readonly string[]) => {
  const values = new Map<string, string>()
  const flags = args.filter(
    (argument) => argument === "--dry-run" || argument === "--apply"
  )
  if (flags.length !== 1) {
    throw new Error("specify exactly one of --dry-run or --apply")
  }
  const valueArguments = args.filter(
    (argument) => argument !== "--dry-run" && argument !== "--apply"
  )
  if (valueArguments.length % 2 !== 0) {
    throw new Error("every price conversion option requires a value")
  }
  for (let index = 0; index < valueArguments.length; index += 2) {
    const flag = valueArguments[index] as string
    const value = valueArguments[index + 1] as string
    if (!flag.startsWith("--") || value.startsWith("--") || values.has(flag)) {
      throw new Error(`invalid or duplicate price conversion option ${flag}`)
    }
    values.set(flag, value)
  }
  return { flag: flags[0] as "--apply" | "--dry-run", values }
}

const exactOptions = (
  values: ReadonlyMap<string, string>,
  expected: readonly string[]
) => {
  const actual = [...values.keys()].sort(compareText)
  const wanted = [...expected].sort(compareText)
  if (
    actual.length !== wanted.length ||
    actual.some((value, index) => value !== wanted[index])
  ) {
    throw new Error(`options must be exactly ${wanted.join(", ")}`)
  }
}

export const parseTestPriceConversionCliOptions = (
  args: readonly string[]
): CliOptions => {
  const { flag, values } = parseValues(args)
  if (flag === "--dry-run") {
    exactOptions(values, ["--plan-output"])
    return {
      mode: "dry-run",
      planOutputPath: canonicalAbsolutePath(
        values.get("--plan-output") as string,
        "--plan-output"
      ),
    }
  }
  exactOptions(values, [
    "--artifact-directory",
    "--expected-plan-artifact-sha256",
    "--expected-plan-sha256",
    "--plan",
  ])
  const expectedPlanArtifactSha256 = values.get(
    "--expected-plan-artifact-sha256"
  ) as string
  const expectedPlanSha256 = values.get("--expected-plan-sha256") as string
  if (
    !(
      SHA_256.test(expectedPlanArtifactSha256) &&
      SHA_256.test(expectedPlanSha256)
    )
  ) {
    throw new Error("expected plan hashes must be lowercase SHA-256 values")
  }
  return {
    artifactDirectory: canonicalAbsolutePath(
      values.get("--artifact-directory") as string,
      "--artifact-directory"
    ),
    expectedPlanArtifactSha256,
    expectedPlanSha256,
    mode: "apply",
    planPath: canonicalAbsolutePath(values.get("--plan") as string, "--plan"),
  }
}

const assertRegularInput = async (path: string) => {
  const [entry, physicalPath, physicalParent] = await Promise.all([
    lstat(path),
    realpath(path),
    realpath(dirname(path)),
  ])
  if (
    entry.isSymbolicLink() ||
    !entry.isFile() ||
    physicalPath !== path ||
    physicalParent !== dirname(path)
  ) {
    throw new Error("plan input must be a canonical non-symlink regular file")
  }
}

const parsePlanArtifact = (
  bytes: string,
  expectedArtifactSha256: string,
  expectedPlanSha256: string
): TestPriceConversionPlanArtifact => {
  if (sha256Bytes(bytes) !== expectedArtifactSha256) {
    throw new Error("plan artifact bytes do not match the reviewed SHA-256")
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes)
  } catch {
    throw new Error("plan artifact must be valid JSON")
  }
  if (canonicalJsonLine(parsed) !== bytes) {
    throw new Error("plan artifact must be canonical JSON followed by one LF")
  }
  const artifact = row(parsed, "plan artifact")
  if (
    artifact.kind !== "test-market-price-conversion-plan-artifact" ||
    artifact.schemaVersion !== 1 ||
    artifact.planSha256 !== expectedPlanSha256
  ) {
    throw new Error("plan artifact identity or reviewed plan hash is invalid")
  }
  const plan = row(artifact.plan, "plan") as unknown as TestPriceConversionPlan
  if (hashTestPriceConversionPlan(plan) !== expectedPlanSha256) {
    throw new Error("plan content does not match the reviewed plan SHA-256")
  }
  return artifact as unknown as TestPriceConversionPlanArtifact
}

const createArtifactDirectory = async (path: string) => {
  const parent = dirname(path)
  if ((await realpath(parent)) !== parent) {
    throw new Error("artifact directory parent must not be a symlink")
  }
  await mkdir(path, { mode: 0o700 })
  if ((await realpath(path)) !== path) {
    throw new Error("artifact directory must not be a symlink")
  }
}

const buildBackup = (
  plan: TestPriceConversionPlan,
  databaseSnapshot: MarketPriceDatabaseSnapshot,
  inventorySnapshot: TestPriceConversionInventorySnapshot
): TestPriceConversionBackup => ({
  databaseSnapshot,
  inventorySnapshot,
  kind: "test-market-price-conversion-backup",
  plan,
  planSha256: hashTestPriceConversionPlan(plan),
  schemaVersion: 1,
})

const priceIdentity = (price: MarketPriceDatabasePrice) => price.id

const flattenPrices = (snapshot: MarketPriceDatabaseSnapshot) =>
  snapshot.products.flatMap((product) =>
    product.variants.flatMap((variant) =>
      variant.prices.map((price) => ({
        price,
        priceSetId: variant.priceSetId,
        productId: product.id,
        variantId: variant.id,
      }))
    )
  )

const catalogStructure = (snapshot: MarketPriceDatabaseSnapshot) =>
  snapshot.products.map((product) => ({
    id: product.id,
    salesChannelIds: product.salesChannelIds,
    status: product.status,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      priceSetId: variant.priceSetId,
    })),
  }))

export const assertTestPriceConversionApplied = (
  before: MarketPriceDatabaseSnapshot,
  after: MarketPriceDatabaseSnapshot,
  plan: TestPriceConversionPlan
) => {
  if (
    canonicalJson(catalogStructure(before)) !==
    canonicalJson(catalogStructure(after))
  ) {
    throw new Error(
      "product, variant, sales-channel, or price-set identity changed"
    )
  }
  const beforePrices = flattenPrices(before)
  const afterPrices = flattenPrices(after)
  const afterById = new Map(
    afterPrices.map((entry) => [priceIdentity(entry.price), entry] as const)
  )
  for (const entry of beforePrices) {
    const observed = afterById.get(entry.price.id)
    if (!observed || canonicalJson(observed) !== canonicalJson(entry)) {
      throw new Error(
        `pre-existing price ${entry.price.id} changed or disappeared`
      )
    }
  }
  const beforeIds = new Set(beforePrices.map(({ price }) => price.id))
  const created = afterPrices.filter(({ price }) => !beforeIds.has(price.id))
  const expected = plan.mutations.filter(({ action }) => action === "create")
  if (created.length !== expected.length) {
    throw new Error(
      `created price count mismatch: expected ${expected.length}, observed ${created.length}`
    )
  }
  const createdByTarget = new Map(
    created.map((entry) => [
      `${entry.variantId}\u0000${entry.price.currencyCode}`,
      entry,
    ])
  )
  return expected.map((mutation) => {
    const entry = createdByTarget.get(
      `${mutation.variantId}\u0000${mutation.currencyCode}`
    )
    if (
      !entry ||
      entry.productId !== mutation.productId ||
      entry.priceSetId !== mutation.priceSetId ||
      entry.price.amount !== mutation.desiredAmount ||
      entry.price.priceListId !== null ||
      entry.price.minQuantity !== null ||
      entry.price.maxQuantity !== null ||
      entry.price.rules.length !== 0
    ) {
      throw new Error(
        `created ${mutation.currencyCode} price for variant ${mutation.variantId} does not match the plan`
      )
    }
    return {
      amount: entry.price.amount,
      currencyCode: entry.price.currencyCode,
      priceId: entry.price.id,
      priceSetId: entry.priceSetId,
      productId: entry.productId,
      variantId: entry.variantId,
    }
  })
}

export const buildTestPriceConversionPriceAdds = (
  plan: TestPriceConversionPlan
) => {
  const byPriceSet = new Map<
    string,
    Array<{
      amount: number
      currency_code: string
      rules: Record<string, never>
    }>
  >()
  for (const mutation of plan.mutations) {
    if (mutation.action !== "create") {
      continue
    }
    if (mutation.desiredAmount === null || mutation.desiredAmount <= 0) {
      throw new Error("create mutation must have a positive desired amount")
    }
    const prices = byPriceSet.get(mutation.priceSetId) ?? []
    prices.push({
      amount: mutation.desiredAmount,
      currency_code: mutation.currencyCode,
      rules: {},
    })
    byPriceSet.set(mutation.priceSetId, prices)
  }
  return [...byPriceSet.entries()].map(([priceSetId, prices]) => ({
    priceSetId,
    prices,
  }))
}

export const addTestPriceConversionPrices = async (
  pricing: IPricingModuleService,
  plan: TestPriceConversionPlan
) => {
  const additions = buildTestPriceConversionPriceAdds(plan)
  if (additions.length > 0) {
    await pricing.addPrices(additions)
  }
}

export const applyTestPriceConversion = async (
  input: Readonly<{
    artifactDirectory: string
    before: MarketPriceDatabaseSnapshot
    container: MedusaContainer
    inventoryBefore: TestPriceConversionInventorySnapshot
    plan: TestPriceConversionPlan
  }>
): Promise<TestPriceConversionReceipt> => {
  const { artifactDirectory, before, container, inventoryBefore, plan } = input
  const pricing = container.resolve<IPricingModuleService>(Modules.PRICING)
  const collectSnapshot = () => collectMarketPriceDatabaseSnapshot(container)
  const planSha256 = hashTestPriceConversionPlan(plan)
  const backup = buildBackup(plan, before, inventoryBefore)
  const backupBytes = canonicalJsonLine(backup)
  const backupPath = join(artifactDirectory, "backup.json")
  const receiptPath = join(artifactDirectory, "receipt.json")
  await writePrivateCommerceArtifactNoClobber(backupPath, backupBytes)

  await addTestPriceConversionPrices(pricing, plan)
  const [after, inventoryAfter] = await Promise.all([
    collectSnapshot(),
    collectTestPriceConversionInventorySnapshot(container),
  ])
  const inventoryFingerprintSha256After =
    hashTestPriceConversionInventorySnapshot(inventoryAfter)
  if (
    inventoryFingerprintSha256After !== plan.binding.inventoryFingerprintSha256
  ) {
    throw new Error(
      `shared inventory changed during price conversion; stop price writers and perform a reviewed manual restore from ${backupPath}`
    )
  }
  const createdPrices = assertTestPriceConversionApplied(before, after, plan)
  const receipt: TestPriceConversionReceipt = {
    backupSha256: sha256Bytes(backupBytes),
    binding: plan.binding,
    createdPrices,
    databaseSnapshotSha256After: hashMarketPriceDatabaseSnapshot(after),
    databaseSnapshotSha256Before: plan.databaseSnapshotSha256,
    inventoryFingerprintSha256After,
    inventoryFingerprintSha256Before: plan.binding.inventoryFingerprintSha256,
    kind: "test-market-price-conversion-apply-receipt",
    planSha256,
    schemaVersion: 1,
    writeScope: ["pricing.price"],
  }
  await writePrivateCommerceArtifactNoClobber(
    receiptPath,
    canonicalJsonLine(receipt)
  )
  return receipt
}

const collectCurrentPlan = async (
  container: MedusaContainer,
  environment: NodeJS.ProcessEnv
) => {
  const [databaseSnapshot, inventorySnapshot] = await Promise.all([
    collectMarketPriceDatabaseSnapshot(container),
    collectTestPriceConversionInventorySnapshot(container),
  ])
  const binding = buildTestPriceConversionBinding(
    environment,
    inventorySnapshot
  )
  return {
    databaseSnapshot,
    inventorySnapshot,
    plan: buildTestPriceConversionPlan(databaseSnapshot, binding),
  }
}

export const withTestPriceConversionApplyLock = async <Value>(
  container: MedusaContainer,
  task: () => Promise<Value>
): Promise<Value> => {
  const manager = container.resolve<SqlEntityManager>(
    ContainerRegistrationKeys.MANAGER
  )
  return await manager.transactional(async (transactionManager) => {
    await transactionManager.execute(
      "select pg_advisory_xact_lock(hashtextextended(?, 0))",
      [APPLY_LOCK_KEY]
    )
    return await task()
  })
}

export const runTestPriceConversion = async (
  container: MedusaContainer,
  options: CliOptions,
  environment: NodeJS.ProcessEnv = process.env
) => {
  if (options.mode === "dry-run") {
    const current = await collectCurrentPlan(container, environment)
    const artifact = buildTestPriceConversionPlanArtifact(current.plan)
    const bytes = serializeTestPriceConversionPlanArtifact(artifact)
    await writePrivateCommerceArtifactNoClobber(options.planOutputPath, bytes)
    return {
      artifactSha256: sha256Bytes(bytes),
      mode: options.mode,
      planSha256: artifact.planSha256,
      summary: current.plan.summary,
    } as const
  }

  await assertRegularInput(options.planPath)
  const artifact = parsePlanArtifact(
    await readFile(options.planPath, "utf8"),
    options.expectedPlanArtifactSha256,
    options.expectedPlanSha256
  )
  const receipt = await withTestPriceConversionApplyLock(
    container,
    async () => {
      const current = await collectCurrentPlan(container, environment)
      if (
        serializeTestPriceConversionPlan(artifact.plan) !==
        serializeTestPriceConversionPlan(current.plan)
      ) {
        throw new Error(
          "current release, database, prices, or inventory do not match the reviewed dry-run plan"
        )
      }
      await createArtifactDirectory(options.artifactDirectory)
      return await applyTestPriceConversion({
        artifactDirectory: options.artifactDirectory,
        before: current.databaseSnapshot,
        container,
        inventoryBefore: current.inventorySnapshot,
        plan: current.plan,
      })
    }
  )
  return { mode: options.mode, receipt } as const
}

export default async function testPriceConversion({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const result = await runTestPriceConversion(
    container,
    parseTestPriceConversionCliOptions(args)
  )
  logger.info(JSON.stringify(result))
  if (result.mode === "dry-run") {
    logger.info("Dry-run complete; no database data was changed")
  } else {
    logger.info("Test-only price conversion applied with backup and receipt")
  }
  return result
}

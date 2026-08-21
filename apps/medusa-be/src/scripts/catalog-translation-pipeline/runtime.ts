import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  CreateTranslationDTO,
  ExecArgs,
  ITranslationModuleService,
  UpdateTranslationDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getProductContentService } from "../../utils/product-content-service"
import { inspectSharedInventoryFingerprint } from "../ro-demo-localization/postcommerce-envelope"
import { hashCatalogTranslationValue } from "./canonical"
import type { CatalogTranslationSnapshot } from "./planner"
import type {
  CatalogTranslationInput,
  CatalogTranslationPlan,
  CatalogTranslationPlanItem,
  CatalogTranslationReference,
  ExistingCatalogTranslation,
} from "./types"
import { CATALOG_TRANSLATION_EXACT_INVENTORY } from "./types"

type QueryService = Readonly<{
  graph: <Value>(
    input: Readonly<{
      entity: string
      fields: readonly string[]
      filters?: Readonly<Record<string, unknown>>
      pagination?: Readonly<{ take: number }>
    }>
  ) => Promise<Readonly<{ data?: Value[] }>>
}>

const PAGE_SIZE = 500
const DATABASE_INSTANCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const ENVIRONMENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const FORBIDDEN_TEST_ENVIRONMENTS =
  /(?:^|[-_.])(live|prod|production)(?:$|[-_.])/i
const REFERENCES = new Set<string>([
  "brand",
  "product",
  "product_category",
  "product_content",
])
const TRANSLATION_APPLY_LOCK_KEY = "catalog-translation-pipeline:exact-apply:v1"

const chunk = <Value>(values: readonly Value[], size: number) => {
  const chunks: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

const stringValue = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value) {
    throw new Error(`${label} is invalid`)
  }
  return value
}

export const buildCatalogTranslationDatabaseInstanceFingerprint = (
  environment: NodeJS.ProcessEnv
) => {
  try {
    const databaseUrl = environment.DATABASE_URL
    const databaseInstanceId =
      environment.CATALOG_TRANSLATION_DATABASE_INSTANCE_ID
    if (!(databaseUrl && databaseInstanceId)) {
      throw new Error("missing database identity")
    }
    if (!DATABASE_INSTANCE_ID.test(databaseInstanceId)) {
      throw new Error("invalid database instance id")
    }
    const parsed = new URL(databaseUrl)
    if (
      (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") ||
      !parsed.hostname
    ) {
      throw new Error("invalid database endpoint")
    }
    const encodedDatabaseName = parsed.pathname.slice(1)
    if (!encodedDatabaseName || encodedDatabaseName.includes("/")) {
      throw new Error("invalid database name")
    }
    const databaseName = decodeURIComponent(encodedDatabaseName)
    if (!databaseName) {
      throw new Error("invalid database name")
    }
    return hashCatalogTranslationValue({
      databaseInstanceId,
      databaseName,
      host: parsed.hostname.toLowerCase(),
      port: parsed.port || "5432",
      protocol: "postgresql",
    })
  } catch {
    throw new Error(
      "catalog translation database identity is missing or invalid"
    )
  }
}

export const assertCatalogTranslationTestEnvironment = (
  input: CatalogTranslationInput,
  environment: NodeJS.ProcessEnv = process.env
) => {
  const observed = {
    databaseInstanceFingerprint:
      buildCatalogTranslationDatabaseInstanceFingerprint(environment),
    environmentId: environment.CATALOG_TRANSLATION_PIPELINE_ENVIRONMENT_ID,
    kind: environment.CATALOG_TRANSLATION_PIPELINE_ENVIRONMENT_KIND,
  }
  if (
    observed.kind !== "test" ||
    observed.environmentId !== input.environment.environmentId ||
    observed.databaseInstanceFingerprint !==
      input.environment.databaseInstanceFingerprint
  ) {
    throw new Error(
      "catalog translation pipeline is bound to a different or non-test environment"
    )
  }
  return input.environment
}

export const readCatalogTranslationTestEnvironment = (
  environment: NodeJS.ProcessEnv = process.env
): CatalogTranslationInput["environment"] => {
  const environmentId = environment.CATALOG_TRANSLATION_PIPELINE_ENVIRONMENT_ID
  if (
    environment.CATALOG_TRANSLATION_PIPELINE_ENVIRONMENT_KIND !== "test" ||
    !environmentId ||
    !ENVIRONMENT_ID.test(environmentId) ||
    FORBIDDEN_TEST_ENVIRONMENTS.test(environmentId)
  ) {
    throw new Error(
      "source generation requires an explicit non-production test environment"
    )
  }
  return {
    databaseInstanceFingerprint:
      buildCatalogTranslationDatabaseInstanceFingerprint(environment),
    environmentId,
    kind: "test",
  }
}

const readCatalogTranslations = async (
  service: ITranslationModuleService,
  referenceIds: readonly string[],
  localeCodes: readonly string[],
  sharedContext?: Context<SqlEntityManager>
): Promise<ExistingCatalogTranslation[]> => {
  const records: ExistingCatalogTranslation[] = []
  for (const ids of chunk([...new Set(referenceIds)], PAGE_SIZE)) {
    if (ids.length === 0) {
      continue
    }
    const page = await service.listTranslations(
      { locale_code: [...localeCodes], reference_id: ids },
      {
        select: [
          "id",
          "locale_code",
          "reference",
          "reference_id",
          "translations",
          "deleted_at",
        ],
        take: ids.length * localeCodes.length * 3 + 1,
      },
      sharedContext
    )
    for (const translation of page) {
      if (
        translation.deleted_at ||
        !localeCodes.includes(translation.locale_code) ||
        !REFERENCES.has(translation.reference) ||
        !ids.includes(translation.reference_id) ||
        !(
          translation.translations &&
          typeof translation.translations === "object" &&
          !Array.isArray(translation.translations)
        )
      ) {
        throw new Error("translation module returned invalid catalog state")
      }
      records.push({
        id: translation.id,
        localeCode: translation.locale_code,
        reference: translation.reference as CatalogTranslationReference,
        referenceId: translation.reference_id,
        translations: translation.translations,
      })
    }
  }
  return records
}

const readCompleteCatalogTranslations = async (
  service: ITranslationModuleService,
  localeCodes: readonly string[],
  sharedContext?: Context<SqlEntityManager>
): Promise<ExistingCatalogTranslation[]> => {
  const expectedByReference: Readonly<
    Record<CatalogTranslationReference, number>
  > = {
    brand: CATALOG_TRANSLATION_EXACT_INVENTORY.brands,
    product: CATALOG_TRANSLATION_EXACT_INVENTORY.products,
    product_category: CATALOG_TRANSLATION_EXACT_INVENTORY.categories,
    product_content: CATALOG_TRANSLATION_EXACT_INVENTORY.productContents,
  }
  const records: ExistingCatalogTranslation[] = []
  for (const localeCode of localeCodes) {
    for (const reference of REFERENCES as Set<CatalogTranslationReference>) {
      const page = await service.listTranslations(
        { locale_code: localeCode, reference },
        {
          select: [
            "id",
            "locale_code",
            "reference",
            "reference_id",
            "translations",
            "deleted_at",
          ],
          take: expectedByReference[reference] + 1,
        },
        sharedContext
      )
      for (const translation of page) {
        if (
          translation.deleted_at ||
          translation.locale_code !== localeCode ||
          translation.reference !== reference ||
          !(
            translation.translations &&
            typeof translation.translations === "object" &&
            !Array.isArray(translation.translations)
          )
        ) {
          throw new Error(
            "translation module returned invalid full-locale state"
          )
        }
        records.push({
          id: translation.id,
          localeCode: translation.locale_code,
          reference,
          referenceId: translation.reference_id,
          translations: translation.translations,
        })
      }
    }
  }
  return records
}

const readEntityIdentity = async (
  container: ExecArgs["container"],
  input: Pick<CatalogTranslationInput, "entries">
) => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const productIds = [
    ...new Set(
      input.entries.flatMap((entry) =>
        entry.reference === "product" ? [entry.referenceId] : []
      )
    ),
  ].sort()
  const categoryIds = [
    ...new Set(
      input.entries.flatMap((entry) =>
        entry.reference === "product_category" ? [entry.referenceId] : []
      )
    ),
  ].sort()
  const brandIds = [
    ...new Set(
      input.entries.flatMap((entry) =>
        entry.reference === "brand" ? [entry.referenceId] : []
      )
    ),
  ].sort()
  const productContentIds = [
    ...new Set(
      input.entries.flatMap((entry) =>
        entry.reference === "product_content" ? [entry.referenceId] : []
      )
    ),
  ].sort()
  const [productsResult, categoriesResult, brandsResult] = await Promise.all([
    productIds.length
      ? query.graph<{
          description?: unknown
          id?: unknown
          subtitle?: unknown
          title?: unknown
          variants?: readonly Readonly<{
            id?: unknown
            inventory_items?: readonly Readonly<{
              inventory_item_id?: unknown
              required_quantity?: unknown
            }>[]
          }>[]
        }>({
          entity: "product",
          fields: [
            "id",
            "description",
            "subtitle",
            "title",
            "variants.id",
            "variants.inventory_items.inventory_item_id",
            "variants.inventory_items.required_quantity",
          ],
          filters: { id: productIds },
          pagination: { take: productIds.length + 1 },
        })
      : Promise.resolve({ data: [] }),
    categoryIds.length
      ? query.graph<{
          description?: unknown
          id?: unknown
          metadata?: unknown
          name?: unknown
          parent_category_id?: unknown
        }>({
          entity: "product_category",
          fields: [
            "id",
            "description",
            "metadata",
            "name",
            "parent_category_id",
          ],
          filters: { id: categoryIds },
          pagination: { take: categoryIds.length + 1 },
        })
      : Promise.resolve({ data: [] }),
    brandIds.length
      ? query.graph<{ id?: unknown; title?: unknown }>({
          entity: "brand",
          fields: ["id", "title"],
          filters: { id: brandIds },
          pagination: { take: brandIds.length + 1 },
        })
      : Promise.resolve({ data: [] }),
  ])
  const products = (productsResult.data ?? [])
    .map((product, productIndex) => ({
      description: product.description ?? null,
      id: stringValue(product.id, `product ${productIndex}.id`),
      subtitle: product.subtitle ?? null,
      title: stringValue(product.title, `product ${productIndex}.title`),
      variants: (product.variants ?? [])
        .map((variant, variantIndex) => ({
          id: stringValue(
            variant.id,
            `product ${productIndex}.variant ${variantIndex}.id`
          ),
          inventoryItems: (variant.inventory_items ?? [])
            .map((item, itemIndex) => ({
              inventoryItemId: stringValue(
                item.inventory_item_id,
                `product ${productIndex}.variant ${variantIndex}.inventory ${itemIndex}.id`
              ),
              requiredQuantity: item.required_quantity,
            }))
            .sort((left, right) =>
              left.inventoryItemId.localeCompare(right.inventoryItemId, "en")
            ),
        }))
        .sort((left, right) => left.id.localeCompare(right.id, "en")),
    }))
    .sort((left, right) => left.id.localeCompare(right.id, "en"))
  const categories = (categoriesResult.data ?? [])
    .map((category, index) => {
      const metadata =
        category.metadata &&
        typeof category.metadata === "object" &&
        !Array.isArray(category.metadata)
          ? (category.metadata as Record<string, unknown>)
          : {}
      return {
        bottomDescriptionHtml: metadata.bottom_description_html ?? null,
        description: category.description ?? null,
        id: stringValue(category.id, `category ${index}.id`),
        metaDescription: metadata.meta_description ?? null,
        metaTitle: metadata.meta_title ?? null,
        name: stringValue(category.name, `category ${index}.name`),
        parentId:
          category.parent_category_id === null
            ? null
            : stringValue(
                category.parent_category_id,
                `category ${index}.parentId`
              ),
        topDescriptionHtml: metadata.top_description_html ?? null,
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id, "en"))
  const brands = (brandsResult.data ?? [])
    .map((brand, index) => ({
      id: stringValue(brand.id, `brand ${index}.id`),
      title: stringValue(brand.title, `brand ${index}.title`),
    }))
    .sort((left, right) => left.id.localeCompare(right.id, "en"))
  const contentService = getProductContentService(container)
  const productContents = [] as Array<{
    composition: unknown
    id: string
    other: unknown
    productId: string
    usage: unknown
    warning: unknown
  }>
  for (const ids of chunk(productContentIds, PAGE_SIZE)) {
    const rows = (await contentService.listProductContents(
      { id: ids },
      { take: ids.length + 1 }
    )) as Record<string, unknown>[]
    productContents.push(
      ...rows.map((row, index) => ({
        composition: row.composition ?? "",
        id: stringValue(row.id, `product content ${index}.id`),
        other: row.other ?? "",
        productId: stringValue(
          row.product_id,
          `product content ${index}.productId`
        ),
        usage: row.usage ?? "",
        warning: row.warning ?? "",
      }))
    )
  }
  productContents.sort((left, right) => left.id.localeCompare(right.id, "en"))
  const assertIds = (
    expected: readonly string[],
    actual: readonly { id: string }[],
    label: string
  ) => {
    const actualIds = actual.map(({ id }) => id)
    if (
      hashCatalogTranslationValue(expected) !==
      hashCatalogTranslationValue(actualIds)
    ) {
      throw new Error(`${label} IDs do not resolve to an exact set`)
    }
  }
  assertIds(productIds, products, "product")
  assertIds(categoryIds, categories, "category")
  assertIds(brandIds, brands, "brand")
  assertIds(productContentIds, productContents, "product content")
  const contentProductIds = productContents
    .map(({ productId }) => productId)
    .sort((left, right) => left.localeCompare(right, "en"))
  if (!same(productIds, contentProductIds)) {
    throw new Error(
      "product content ownership does not match the exact product inventory"
    )
  }
  const sourceRecords = [
    ...products.map(({ variants: _variants, ...product }) => ({
      reference: "product" as const,
      referenceId: product.id,
      values: {
        description: product.description,
        subtitle: product.subtitle,
        title: product.title,
      },
    })),
    ...categories.map((category) => ({
      reference: "product_category" as const,
      referenceId: category.id,
      values: {
        bottom_description_html: category.bottomDescriptionHtml,
        description: category.description,
        meta_description: category.metaDescription,
        meta_title: category.metaTitle,
        name: category.name,
        top_description_html: category.topDescriptionHtml,
      },
    })),
    ...brands.map((brand) => ({
      reference: "brand" as const,
      referenceId: brand.id,
      values: { title: brand.title },
    })),
    ...productContents.map((content) => ({
      reference: "product_content" as const,
      referenceId: content.id,
      values: {
        composition: content.composition,
        other: content.other,
        usage: content.usage,
        warning: content.warning,
      },
    })),
  ]
  return {
    identity: { brands, categories, productContents, products },
    sourceRecords,
  }
}

const emptyTranslationsByReference: Readonly<
  Record<CatalogTranslationReference, Readonly<Record<string, string>>>
> = {
  brand: { title: "" },
  product: { description: "", subtitle: "", title: "" },
  product_category: {
    bottom_description_html: "",
    description: "",
    meta_description: "",
    meta_title: "",
    name: "",
    top_description_html: "",
  },
  product_content: { composition: "", other: "", usage: "", warning: "" },
}

export const inspectCanonicalCatalogTranslationSource = async (
  container: ExecArgs["container"]
) => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const [productsResult, categoriesResult, brandsResult] = await Promise.all([
    query.graph<{ id?: unknown }>({
      entity: "product",
      fields: ["id"],
      pagination: {
        take: CATALOG_TRANSLATION_EXACT_INVENTORY.products + 1,
      },
    }),
    query.graph<{ id?: unknown }>({
      entity: "product_category",
      fields: ["id"],
      pagination: {
        take: CATALOG_TRANSLATION_EXACT_INVENTORY.categories + 1,
      },
    }),
    query.graph<{ id?: unknown }>({
      entity: "brand",
      fields: ["id"],
      pagination: { take: CATALOG_TRANSLATION_EXACT_INVENTORY.brands + 1 },
    }),
  ])
  const exactIds = (
    values: readonly Readonly<{ id?: unknown }>[],
    expected: number,
    label: string
  ) => {
    const ids = values
      .map((value, index) => stringValue(value.id, `${label} ${index}.id`))
      .sort((left, right) => left.localeCompare(right, "en"))
    if (ids.length !== expected || new Set(ids).size !== expected) {
      throw new Error(`${label} discovery does not match exact inventory`)
    }
    return ids
  }
  const productIds = exactIds(
    productsResult.data ?? [],
    CATALOG_TRANSLATION_EXACT_INVENTORY.products,
    "product"
  )
  const categoryIds = exactIds(
    categoriesResult.data ?? [],
    CATALOG_TRANSLATION_EXACT_INVENTORY.categories,
    "category"
  )
  const brandIds = exactIds(
    brandsResult.data ?? [],
    CATALOG_TRANSLATION_EXACT_INVENTORY.brands,
    "brand"
  )
  const contentService = getProductContentService(container)
  const productContents: Array<{ id: string; productId: string }> = []
  for (const ids of chunk(productIds, PAGE_SIZE)) {
    const rows = (await contentService.listProductContents(
      { product_id: ids },
      { take: ids.length + 1 }
    )) as Record<string, unknown>[]
    productContents.push(
      ...rows.map((row, index) => ({
        id: stringValue(row.id, `product content ${index}.id`),
        productId: stringValue(
          row.product_id,
          `product content ${index}.productId`
        ),
      }))
    )
  }
  productContents.sort((left, right) => left.id.localeCompare(right.id, "en"))
  if (
    productContents.length !==
      CATALOG_TRANSLATION_EXACT_INVENTORY.productContents ||
    new Set(productContents.map(({ id }) => id)).size !==
      CATALOG_TRANSLATION_EXACT_INVENTORY.productContents ||
    !same(
      productIds,
      productContents
        .map(({ productId }) => productId)
        .sort((left, right) => left.localeCompare(right, "en"))
    )
  ) {
    throw new Error("product content discovery does not match exact ownership")
  }
  const entrySeeds = [
    ...productIds.map((referenceId) => ({
      reference: "product" as const,
      referenceId,
    })),
    ...productContents.map(({ id: referenceId }) => ({
      reference: "product_content" as const,
      referenceId,
    })),
    ...categoryIds.map((referenceId) => ({
      reference: "product_category" as const,
      referenceId,
    })),
    ...brandIds.map((referenceId) => ({
      reference: "brand" as const,
      referenceId,
    })),
  ]
  const provisionalInput = {
    entries: entrySeeds.map(({ reference, referenceId }) => ({
      localeCode: "sk-SK" as const,
      provenance: {
        artifactSha256: "0".repeat(64),
        method: "canonical-source" as const,
        sourceReference: "generated-live-canonical-source",
      },
      reference,
      referenceId,
      translations: emptyTranslationsByReference[reference],
    })),
  }
  const state = await readEntityIdentity(container, provisionalInput)
  return {
    identity: state.identity,
    inventory: CATALOG_TRANSLATION_EXACT_INVENTORY,
    sourceRecords: state.sourceRecords,
  }
}

export const inspectCatalogTranslationSnapshot = async (
  container: ExecArgs["container"],
  input: CatalogTranslationInput
): Promise<CatalogTranslationSnapshot> => {
  const service = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const localeCodes = [
    ...new Set(input.entries.map(({ localeCode }) => localeCode)),
  ]
  const locales = await service.listLocales(
    { code: localeCodes },
    { select: ["code"], take: localeCodes.length + 1 }
  )
  if (
    hashCatalogTranslationValue(localeCodes.slice().sort()) !==
    hashCatalogTranslationValue(locales.map(({ code }) => code).sort())
  ) {
    throw new Error(
      "required catalog translation locales are missing or ambiguous"
    )
  }
  const [existingTranslations, canonicalSource, sharedInventory] =
    await Promise.all([
      readCompleteCatalogTranslations(service, localeCodes),
      inspectCanonicalCatalogTranslationSource(container),
      inspectSharedInventoryFingerprint(container),
    ])
  const manifestIdentity = input.entries
    .map(({ reference, referenceId }) => ({ reference, referenceId }))
    .sort((left, right) =>
      `${left.reference}\u0000${left.referenceId}`.localeCompare(
        `${right.reference}\u0000${right.referenceId}`,
        "en"
      )
    )
  const canonicalIdentity = canonicalSource.sourceRecords
    .map(({ reference, referenceId }) => ({ reference, referenceId }))
    .sort((left, right) =>
      `${left.reference}\u0000${left.referenceId}`.localeCompare(
        `${right.reference}\u0000${right.referenceId}`,
        "en"
      )
    )
  if (!same(manifestIdentity, canonicalIdentity)) {
    throw new Error(
      "manifest IDs do not match the authoritative catalog inventory"
    )
  }
  const manifestTranslationIdentities = new Set(
    input.entries.map(
      ({ localeCode, reference, referenceId }) =>
        `${localeCode}\u0000${reference}\u0000${referenceId}`
    )
  )
  if (
    existingTranslations.some(
      ({ localeCode, reference, referenceId }) =>
        !manifestTranslationIdentities.has(
          `${localeCode}\u0000${reference}\u0000${referenceId}`
        )
    )
  ) {
    throw new Error("target locale contains out-of-scope catalog translations")
  }
  return {
    existingTranslations,
    protectedState: {
      entityIdentitySha256: hashCatalogTranslationValue(
        canonicalSource.identity
      ),
      sharedInventory,
      sourceStateSha256: hashCatalogTranslationValue(
        canonicalSource.sourceRecords
      ),
    },
    sourceRecords: canonicalSource.sourceRecords,
  }
}

const same = (left: unknown, right: unknown) =>
  hashCatalogTranslationValue(left) === hashCatalogTranslationValue(right)

const assertChunkPreconditions = (
  items: readonly CatalogTranslationPlanItem[],
  current: readonly ExistingCatalogTranslation[]
) => {
  for (const item of items) {
    const matches = current.filter(
      (translation) =>
        translation.localeCode === item.localeCode &&
        translation.reference === item.reference &&
        translation.referenceId === item.referenceId
    )
    if (item.previousTranslations === null) {
      if (matches.length !== 0) {
        throw new Error(
          `${item.localeCode} ${item.reference}:${item.referenceId} appeared after preflight`
        )
      }
      continue
    }
    if (
      matches.length !== 1 ||
      matches[0]?.id !== item.existingId ||
      !same(matches[0]?.translations, item.previousTranslations)
    ) {
      throw new Error(
        `${item.localeCode} ${item.reference}:${item.referenceId} changed after preflight`
      )
    }
  }
}

const assertChunkApplied = (
  items: readonly CatalogTranslationPlanItem[],
  current: readonly ExistingCatalogTranslation[]
) => {
  for (const item of items) {
    const matches = current.filter(
      (translation) =>
        translation.localeCode === item.localeCode &&
        translation.reference === item.reference &&
        translation.referenceId === item.referenceId
    )
    if (
      matches.length !== 1 ||
      !same(matches[0]?.translations, item.resultingTranslations)
    ) {
      throw new Error(
        `${item.localeCode} ${item.reference}:${item.referenceId} was not applied exactly`
      )
    }
  }
}

export const applyCatalogTranslationPlan = async (
  container: ExecArgs["container"],
  _input: CatalogTranslationInput,
  plan: CatalogTranslationPlan,
  chunkSize: number
) => {
  const service = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const manager = container.resolve<SqlEntityManager>(
    ContainerRegistrationKeys.MANAGER
  )
  const targetState = await manager.transactional(
    async (transactionManager) => {
      await transactionManager.execute(
        "select pg_advisory_xact_lock(hashtextextended(?, 0))",
        [TRANSLATION_APPLY_LOCK_KEY]
      )
      const sharedContext: Context<SqlEntityManager> = { transactionManager }
      for (const items of chunk(plan.items, chunkSize)) {
        const referenceIds = items.map(({ referenceId }) => referenceId)
        const localeCodes = [
          ...new Set(items.map(({ localeCode }) => localeCode)),
        ]
        const before = await readCatalogTranslations(
          service,
          referenceIds,
          localeCodes,
          sharedContext
        )
        assertChunkPreconditions(items, before)
        const creates: CreateTranslationDTO[] = items.flatMap((item) =>
          item.action === "create"
            ? [
                {
                  locale_code: item.localeCode,
                  reference: item.reference,
                  reference_id: item.referenceId,
                  translations: { ...item.resultingTranslations },
                },
              ]
            : []
        )
        const updates: UpdateTranslationDTO[] = items.flatMap((item) =>
          item.action === "update" && item.existingId
            ? [
                {
                  id: item.existingId,
                  translations: { ...item.resultingTranslations },
                },
              ]
            : []
        )
        if (creates.length) {
          await service.createTranslations(creates, sharedContext)
        }
        if (updates.length) {
          await service.updateTranslations(updates, sharedContext)
        }
        const after = await readCatalogTranslations(
          service,
          referenceIds,
          localeCodes,
          sharedContext
        )
        assertChunkApplied(items, after)
      }
      const localeCodes = [
        ...new Set(plan.items.map(({ localeCode }) => localeCode)),
      ]
      const finalTranslations = await readCompleteCatalogTranslations(
        service,
        localeCodes,
        sharedContext
      )
      if (finalTranslations.length !== plan.items.length) {
        throw new Error("final target translation inventory is not exact")
      }
      return plan.items.map((item) => {
        const matches = finalTranslations.filter(
          (translation) =>
            translation.localeCode === item.localeCode &&
            translation.reference === item.reference &&
            translation.referenceId === item.referenceId
        )
        if (
          matches.length !== 1 ||
          !same(matches[0]?.translations, item.resultingTranslations)
        ) {
          throw new Error(
            "final target translation state does not match the plan"
          )
        }
        return {
          localeCode: item.localeCode,
          reference: item.reference,
          referenceId: item.referenceId,
          translations: matches[0]?.translations,
        }
      })
    }
  )
  return {
    protectedState: plan.protectedState,
    targetStateSha256: hashCatalogTranslationValue(targetState),
  }
}

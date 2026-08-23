import { randomUUID } from "node:crypto"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  ExecArgs,
  ITranslationModuleService,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import {
  batchLinkProductsToCategoryWorkflow,
  createTranslationsWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../modules/storefront-url-assignment"
import { enqueueCatalogAssignmentLifecycle } from "../modules/storefront-url-assignment/catalog-lifecycle"
import type StorefrontUrlAssignmentModuleService from "../modules/storefront-url-assignment/service"
import { URL_REGISTRY_OUTBOX_MODULE } from "../modules/url-registry-outbox"
import type UrlRegistryOutboxModuleService from "../modules/url-registry-outbox/service"
import { dispatchUrlRegistryOutboxWorkflow } from "../workflows/url-registry-outbox/dispatch-workflow"

// Herbatika round-3 verified gap fill (2026-08-23). Three surgical fixes, all
// URL-verified against the official market shops in the driving session:
//  1. Link the 18 products officially listed at herbatica.hu/haj/ to the
//     `ine-vlasy` hub (published as hu:haj, ro:par, cz:vlasy, sk:vlasy) whose
//     grid is empty in every market.
//  2. Publish the existing `akne` category (62 products, exact product-set
//     match with official herbatica.cz/akne-2/) to the CZ market under the
//     official slug `akne-2`, creating the missing cs-CZ demo translation.
//  3. Replace the Czech tagline in the aroma-saules-2 brand ro-RO translation
//     title with the official Romanian wording scraped from herbatica.ro.
// Default = DRY RUN. HERBATICA_GAPFILL_R3_APPLY=1 (or --apply) guards writes.

const CZ_SALES_CHANNEL = "sc_01M0J13TWT6GDNSZC9MV31AT44"

const VLASY_HANDLE = "ine-vlasy"
// herbatica.hu/haj/ official listing (18 unique products, pages 1-2), mapped
// through the session's hu slug->id table with 0 unmapped remainders.
const VLASY_ADD_PRODUCT_IDS = [
  "prod_01KTAZ36W2XTGH2VAWBT19MQZJ",
  "prod_01KTAZ3CANG1WRDM8SGB0PSWKM",
  "prod_01KTAZ3CANPYZ7R9B7HRQ7FR97",
  "prod_01KTAZ3CANQGPCXS7SDMRQ3A3R",
  "prod_01KTAZ3CANS2N0X7WF41CGEFD8",
  "prod_01KTAZ3DJJ1VAZP66F4NF6GGGP",
  "prod_01KTAZ3DJJF7QFXQ6NJ46HJ22K",
  "prod_01KTAZ3EGPARCFNMJE6KJ34X7C",
  "prod_01KTAZ3NV48S1RR9HNVSB4MAV2",
  "prod_01KTAZ3NV4C9A0DXX7E7K5HZZ3",
  "prod_01KTAZ3P75GEC9KBSAN1Z6WFVZ",
  "prod_01KTAZ3QCWXKFN588F29D2GRDN",
  "prod_01KTAZ3QCX0FE3M6CEGQRXQ16Q",
  "prod_01KTAZ3QMXMCT9DKPH51NSFVT1",
  "prod_01KTAZ3QMYYK1SP38ANP7PRY5C",
  "prod_01KTAZ3R1THQE9FFK9HP32YKRD",
  "prod_01KTAZ3R1TVQFQYM8X095NQ7K0",
  "prod_01KTAZ3R1V4H3J4GQ8M2A5N69R",
]

const AKNE_HANDLE = "akne"
const AKNE_CZ_SLUG = "akne-2"
const AKNE_CZ_LOCALE = "cs-CZ"
const CATEGORY_REFERENCE = "product_category"
// Demo-grade cs-CZ copy per the recorded operator authorization; the category
// name matches the official herbatica.cz/akne-2/ H1.
const AKNE_CZ_TRANSLATION: Record<string, string> = {
  bottom_description_html:
    "<p>Máte otázku k produktům v kategorii Akné? Kontaktujte nás.</p>",
  description:
    "Produkty v kategorii Akné v nabídce Herbatica. Demo text, finální popis doplní provozovatel.",
  meta_description: "Objevte produkty v kategorii Akné v e-shopu Herbatica.",
  meta_title: "Akné | Herbatica",
  name: "Akné",
  top_description_html:
    "<p>V této kategorii jsme shromáždili produkty související s tématem Akné.</p>",
}

const BRAND_TRANSLATION_ID = "trans_01M0NRGX5TYV49W1WBWK0TZ3PW"
const BRAND_TITLE_OLD = "Aroma'Saules - Zdraví. Krása. Příroda."
// Official wording served by herbatica.ro (title tag, verbatim incl. their
// diacritics), matching the sibling horakyne brand title already stored.
const BRAND_TITLE_NEW = "Aroma'Saules - Sãnãtate. Frumusete. Natura."

type CategorySnapshot = { id: string; productIds: Set<string> }

const readCategoryByHandle = async (
  query: Query,
  handle: string
): Promise<CategorySnapshot | null> => {
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "products.id"],
    filters: { handle },
  })
  const rows = data as Array<{
    id: string
    products?: Array<{ id: string } | null> | null
  }>
  const row = rows[0]
  if (!row) {
    return null
  }
  return {
    id: row.id,
    productIds: new Set(
      (row.products ?? [])
        .filter((product): product is { id: string } => Boolean(product?.id))
        .map((product) => product.id)
    ),
  }
}

export default async function herbaticaGapfillRound3({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  const outboxService = container.resolve<UrlRegistryOutboxModuleService>(
    URL_REGISTRY_OUTBOX_MODULE
  )

  const apply =
    process.env.HERBATICA_GAPFILL_R3_APPLY === "1" || args.includes("--apply")

  // --- Plan step 1: ine-vlasy links ---
  const vlasy = await readCategoryByHandle(query, VLASY_HANDLE)
  if (!vlasy) {
    throw new Error(`category ${VLASY_HANDLE} not found`)
  }
  const vlasyAdd = VLASY_ADD_PRODUCT_IDS.filter(
    (productId) => !vlasy.productIds.has(productId)
  )

  // --- Plan step 2: akne -> cz publication ---
  const akne = await readCategoryByHandle(query, AKNE_HANDLE)
  if (!akne) {
    throw new Error(`category ${AKNE_HANDLE} not found`)
  }
  const slugOwners = await assignmentService.listStorefrontUrlAssignments(
    { entity_kind: "category", market_code: "cz", public_slug: AKNE_CZ_SLUG },
    { take: 2 }
  )
  const foreignOwner = slugOwners.find((record) => record.entity_id !== akne.id)
  if (foreignOwner) {
    throw new Error(
      `cz slug ${AKNE_CZ_SLUG} is already owned by ${foreignOwner.entity_id}; aborting`
    )
  }
  const czAssignmentRows = await assignmentService.listStorefrontUrlAssignments(
    { entity_id: akne.id, entity_kind: "category", market_code: "cz" },
    { take: 2 }
  )
  const czPublished =
    czAssignmentRows[0] &&
    czAssignmentRows[0].public_slug === AKNE_CZ_SLUG &&
    czAssignmentRows[0].publication_status === "published"
  const existingCzTranslations = await translationService.listTranslations(
    {
      locale_code: AKNE_CZ_LOCALE,
      reference: CATEGORY_REFERENCE,
      reference_id: akne.id,
    },
    { select: ["id"], take: 1 }
  )
  const needsCzTranslation = existingCzTranslations.length === 0

  // --- Plan step 3: brand ro-RO tagline ---
  const brandTranslations = await translationService.listTranslations(
    { id: BRAND_TRANSLATION_ID },
    { take: 1 }
  )
  const brandTranslation = brandTranslations[0]
  if (!brandTranslation) {
    throw new Error(`translation ${BRAND_TRANSLATION_ID} not found`)
  }
  const storedTranslations = (brandTranslation.translations ?? {}) as Record<
    string,
    unknown
  >
  const storedTitle = storedTranslations.title
  const taglineActions: string[] = []
  let taglineUpdate: Record<string, unknown> | null = null
  if (storedTitle === BRAND_TITLE_NEW) {
    taglineActions.push("already fixed; skip")
  } else if (storedTitle === BRAND_TITLE_OLD) {
    taglineUpdate = { ...storedTranslations, title: BRAND_TITLE_NEW }
    taglineActions.push(`update title -> "${BRAND_TITLE_NEW}"`)
  } else {
    taglineActions.push(
      `UNEXPECTED stored title ${JSON.stringify(storedTitle)}; skipping (fail closed)`
    )
  }

  logger.info("=== Herbatika gapfill round 3 plan ===")
  logger.info(`mode: ${apply ? "APPLY" : "DRY-RUN"}`)
  logger.info(
    `1) ${VLASY_HANDLE} (${vlasy.id}): current members=${vlasy.productIds.size}, links to add=${vlasyAdd.length} of ${VLASY_ADD_PRODUCT_IDS.length}`
  )
  logger.info(
    `2) ${AKNE_HANDLE} (${akne.id}): cz assignment ${czPublished ? "already published (skip)" : `create/publish slug ${AKNE_CZ_SLUG}`}; cs-CZ translation ${needsCzTranslation ? "create" : "exists (skip)"}`
  )
  logger.info(`3) brand ro-RO tagline: ${taglineActions.join("; ")}`)

  if (!apply) {
    logger.info("Dry-run complete; no data was written")
    return {
      czAssignmentNeeded: !czPublished,
      czTranslationNeeded: needsCzTranslation,
      taglineUpdateNeeded: taglineUpdate !== null,
      vlasyLinksToAdd: vlasyAdd.length,
    }
  }

  logger.info("Applying gapfill round 3...")

  if (vlasyAdd.length > 0) {
    await batchLinkProductsToCategoryWorkflow(container).run({
      input: { add: vlasyAdd, id: vlasy.id, remove: [] },
    })
  }

  if (needsCzTranslation) {
    await createTranslationsWorkflow(container).run({
      input: {
        translations: [
          {
            locale_code: AKNE_CZ_LOCALE,
            reference: CATEGORY_REFERENCE,
            reference_id: akne.id,
            translations: AKNE_CZ_TRANSLATION,
          },
        ],
      },
    })
  }

  let assignmentWritten = false
  if (!czPublished) {
    await assignmentService.runInTransaction(async (sharedContext) => {
      await assignmentService.lockCatalogEntityAssignments(
        "category",
        akne.id,
        sharedContext
      )
      const identityRows = await assignmentService.listStorefrontUrlAssignments(
        { entity_id: akne.id, entity_kind: "category", market_code: "cz" },
        { take: 2 },
        sharedContext
      )
      if (identityRows.length > 1) {
        throw new Error("cz akne assignment identity is ambiguous")
      }
      const existing = identityRows[0]
      const desired = {
        publication_status: "published" as const,
        public_slug: AKNE_CZ_SLUG,
        sales_channel_id: CZ_SALES_CHANNEL,
      }
      const persisted = existing
        ? await assignmentService.updateStorefrontUrlAssignments(
            {
              id: existing.id,
              source_version: Number(existing.source_version) + 1,
              ...desired,
            },
            sharedContext
          )
        : await assignmentService.createStorefrontUrlAssignments(
            {
              entity_id: akne.id,
              entity_kind: "category",
              market_code: "cz",
              schema_version: 1,
              source_version: 1,
              ...desired,
            },
            sharedContext
          )
      await enqueueCatalogAssignmentLifecycle(
        outboxService,
        persisted,
        sharedContext as Context<SqlEntityManager>
      )
      assignmentWritten = true
    })
  }

  if (taglineUpdate) {
    await updateTranslationsWorkflow(container).run({
      input: {
        translations: [
          { id: BRAND_TRANSLATION_ID, translations: taglineUpdate },
        ],
      },
    })
  }

  await dispatchUrlRegistryOutboxWorkflow(container).run({
    input: { workerId: `herbatica-gapfill-r3-${process.pid}-${randomUUID()}` },
  })

  logger.info(
    `Applied: linked ${vlasyAdd.length} products to ${VLASY_HANDLE}, cs-CZ translation ${needsCzTranslation ? "created" : "kept"}, cz assignment ${assignmentWritten ? "written" : "kept"}, tagline ${taglineUpdate ? "updated" : "kept"}, drained outbox`
  )
  return {
    assignmentWritten,
    czTranslationCreated: needsCzTranslation,
    taglineUpdated: taglineUpdate !== null,
    vlasyLinked: vlasyAdd.length,
  }
}

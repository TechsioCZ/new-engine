import type { ExecArgs, IProductModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

// Official herbatica.* lists these 12 products in the shared
// "Chudnutie a krásna línia" category family (sk chudnutie-a-krasna-linia /
// cz hubnuti-a-krasna-linie / hu fogyas-es-szep-alak / ro
// produse-pentru-slabire-2, official ro alias slabire-si-silueta). They were
// imported in a later gap-fill batch and never linked, leaving the local
// grids at 40/52. Links are market-agnostic; per-market visibility stays
// governed by sales-channel publication, matching official membership
// (verified on official sk + ro on 2026-08-23). Idempotent, dry-run by
// default; apply with HERBATICA_SLABIRE_LINKS_APPLY=1.
const CATEGORY_ID = "pcat_01KTAYSKPZEQM90JH7T99FY6HT"

const PRODUCT_IDS = [
  "prod_01M0K8E73NT9DG6QT1K63VRMWT",
  "prod_01M0K8E73M28J1CKBAK28AKJ3V",
  "prod_01M0K8E73PZZ258Z88JZQF2WFP",
  "prod_01M0K8E73PH9PSNFR1ZR8SSDXB",
  "prod_01M0K8E73R7QVMRGVKWPQ0AEF6",
  "prod_01M0K8E73NWSG2F7Z60MXJ7TVS",
  "prod_01M0K8E73MBTM2KSNKHDNH6GZY",
  "prod_01M0K8E73QM53RT60TSGW0VNM8",
  "prod_01M0K8E73QE0VHV33QY9526S83",
  "prod_01M0K8E73PS0WPXZV0EB35QWP6",
  "prod_01M0K8E73NDP71V7GVK8BKDKVW",
  "prod_01M0K8E73P43KB2PHQ00AQ2ZSA",
] as const

export default async function herbaticaSlabireCategoryLinks({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const apply = process.env.HERBATICA_SLABIRE_LINKS_APPLY === "1"
  const productService = container.resolve<IProductModuleService>(
    Modules.PRODUCT
  )

  const categories = await productService.listProductCategories(
    { id: CATEGORY_ID },
    { select: ["id", "name"], take: 2 }
  )
  if (categories.length !== 1) {
    throw new Error(`Category ${CATEGORY_ID} not found`)
  }

  const products = (await productService.listProducts(
    { id: [...PRODUCT_IDS] },
    {
      relations: ["categories"],
      select: ["id", "handle", "categories.id"],
      take: PRODUCT_IDS.length + 1,
    }
  )) as Array<{
    categories?: Array<{ id: string }>
    handle: string
    id: string
  }>
  if (products.length !== PRODUCT_IDS.length) {
    const found = new Set(products.map((product) => product.id))
    const missing = PRODUCT_IDS.filter((id) => !found.has(id))
    throw new Error(`Products not found: ${missing.join(", ")}`)
  }

  const updates = products.flatMap((product) => {
    const currentIds = (product.categories ?? []).map(
      (category) => category.id
    )
    if (currentIds.includes(CATEGORY_ID)) {
      return []
    }
    return [
      {
        category_ids: [...currentIds, CATEGORY_ID],
        handle: product.handle,
        id: product.id,
      },
    ]
  })

  logger.info(
    `slabire category links: products=${products.length} to-link=${updates.length} mode=${apply ? "APPLY" : "DRY-RUN"}`
  )
  for (const update of updates) {
    logger.info(`  link ${update.id} (${update.handle})`)
  }
  if (!apply || updates.length === 0) {
    return { linked: 0, toLink: updates.length }
  }
  await updateProductsWorkflow(container).run({
    input: {
      products: updates.map(({ category_ids, id }) => ({ category_ids, id })),
    },
  })
  logger.info(`linked ${updates.length} products to ${CATEGORY_ID}`)
  return { linked: updates.length, toLink: updates.length }
}

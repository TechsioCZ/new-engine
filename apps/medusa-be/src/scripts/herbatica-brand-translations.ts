import type {
  ExecArgs,
  ITranslationModuleService,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"
import { BRAND_MODULE } from "../modules/brand"
import type BrandModuleService from "../modules/brand/service"

// Brand titles are proper nouns shared across markets. The catalog-lifecycle
// source proof requires an exact Translation row (reference='brand', field
// `title`) per market locale before a brand route can publish, so mirror the
// brand title into every market locale. Idempotent: existing rows are skipped.
const LOCALES = ["sk-SK", "cs-CZ", "hu-HU", "ro-RO"] as const

export default async function herbaticaBrandTranslations({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const apply =
    args.includes("--apply") || process.env.HERBATICA_BRAND_FILL_APPLY === "1"
  const brandService = container.resolve<BrandModuleService>(BRAND_MODULE)
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )

  const brands = (await brandService.listBrands({}, { take: 1001 })) as Array<{
    id: string
    title: string
  }>
  if (brands.length > 1000) {
    throw new Error("more than 1000 brands; paginate this script before rerun")
  }
  const brandIds = brands.map((brand) => brand.id)

  const existing = await translationService.listTranslations(
    { reference: "brand", reference_id: brandIds },
    { select: ["id", "reference_id", "locale_code"], take: 10_000 }
  )
  const existingKeys = new Set(
    existing.map((row) => `${row.reference_id} ${row.locale_code}`)
  )

  const toCreate = brands.flatMap((brand) =>
    LOCALES.filter((locale) => !existingKeys.has(`${brand.id} ${locale}`)).map(
      (locale) => ({
        locale_code: locale,
        reference: "brand",
        reference_id: brand.id,
        translations: { title: brand.title },
      })
    )
  )

  logger.info(
    `brand translations: brands=${brands.length} existing-rows=${existing.length} to-create=${toCreate.length} mode=${apply ? "APPLY" : "DRY-RUN"}`
  )
  if (!apply || toCreate.length === 0) {
    return { created: 0, toCreate: toCreate.length }
  }
  await translationService.createTranslations(toCreate)
  logger.info(`created ${toCreate.length} brand translation rows`)
  return { created: toCreate.length, toCreate: toCreate.length }
}

import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"

// The `brand` entry in translation_settings shipped with is_active=false, unlike
// product / product_category / product_collection which are active. While
// inactive, the Translation module strips every brand translation field on read
// (filterTranslationFields) and stores translated_field_count=0, so the catalog
// source-proof (readExactCatalogTranslations) can never confirm a brand title
// translation. That makes /store/url-registry/catalog/sources answer 503
// (unavailable) and the herbatika catalog-lifecycle consumer retry every brand
// outbox event forever with `source-unavailable`.
//
// Activating the setting via the module service both flips is_active=true AND
// recomputes translated_field_count for all existing brand translation rows, so
// the title becomes readable again. Idempotent. Default = DRY RUN; `--apply` writes.

export default async function activateBrandTranslationSetting({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const apply =
    args.includes("--apply") || process.env.HERBATICA_BRAND_FILL_APPLY === "1"
  const translationService = container.resolve<{
    listTranslationSettings: (filters: Record<string, unknown>) => Promise<
      Array<{
        id: string
        entity_type: string
        is_active: boolean
        fields: string[]
      }>
    >
    updateTranslationSettings: (data: {
      id: string
      is_active: boolean
    }) => Promise<unknown>
    listTranslations: (
      filters: Record<string, unknown>,
      config: Record<string, unknown>
    ) => Promise<Array<{ id: string; translations: Record<string, unknown> }>>
  }>(Modules.TRANSLATION)

  const [setting] = await translationService.listTranslationSettings({
    entity_type: "brand",
  })
  if (!setting) {
    throw new Error("brand translation setting not found")
  }
  logger.info(
    `brand translation setting BEFORE: id=${setting.id} is_active=${setting.is_active} fields=${JSON.stringify(setting.fields)}`
  )

  if (setting.is_active) {
    logger.info("brand setting already active; nothing to do")
    return { alreadyActive: true }
  }
  if (!apply) {
    logger.info("DRY-RUN: would activate brand translation setting")
    return { wouldActivate: true }
  }

  await translationService.updateTranslationSettings({
    id: setting.id,
    is_active: true,
  })

  const [after] = await translationService.listTranslationSettings({
    entity_type: "brand",
  })
  logger.info(
    `brand translation setting AFTER: is_active=${after?.is_active} fields=${JSON.stringify(after?.fields)}`
  )

  // Verify a brand translation now reads back its title.
  const sample = await translationService.listTranslations(
    { reference: "brand", locale_code: "cs-CZ" },
    {
      select: [
        "id",
        "reference",
        "reference_id",
        "locale_code",
        "translations",
      ],
      take: 1,
    }
  )
  logger.info(
    `sample brand cs-CZ translation after activation: ${JSON.stringify(sample[0]?.translations)}`
  )
  return { activated: true }
}

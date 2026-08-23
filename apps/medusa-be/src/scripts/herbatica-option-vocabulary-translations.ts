import type {
  CreateTranslationDTO,
  ExecArgs,
  ITranslationModuleService,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/medusa"

/**
 * Variant titles and shipping option names are stored in the Slovak source
 * catalog, so CZ/HU/RO carts and checkouts render Slovak (or English seed)
 * strings even though product titles are localized.
 *
 * Medusa v2 already localizes both at read time when exact Translation rows
 * exist:
 *   - `getTranslatedLineItemsStep` (add-to-cart / create-cart / create-order)
 *     applies `product_variant.title` translations onto `item.variant_title`.
 *   - `listShippingOptionsForCartWorkflow` ends in
 *     `getTranslatedShippingOptionsStep`, which applies `shipping_option.name`.
 * Both resolve translations from `cart.locale`, and `translation_settings`
 * already enables `product_variant.title` and `shipping_option.name`.
 *
 * So the whole fix is data: exact Translation rows per market locale. This
 * script only translates the short option vocabulary (unit counts, flavours,
 * colours, shapes) and the shipping option names - never free text.
 *
 * Dry-run by default; pass `--apply` (or HERBATICA_OPTION_VOCABULARY_APPLY=1)
 * to create missing rows, and add `--refresh`
 * (HERBATICA_OPTION_VOCABULARY_REFRESH=1) to also overwrite stored rows that
 * have drifted from the vocabulary below. Without `--refresh` drift is only
 * reported, so manual admin edits survive a rerun.
 */

export const OPTION_VOCABULARY_LOCALES = [
  "sk-SK",
  "cs-CZ",
  "hu-HU",
  "ro-RO",
] as const

export type OptionVocabularyLocale = (typeof OPTION_VOCABULARY_LOCALES)[number]

/**
 * sk-SK is the source language of the catalog: Medusa falls back to the stored
 * value when no row exists, so writing sk-SK rows would be a no-op at best and
 * an unreviewed rewrite of the Slovak storefront at worst. Only the derived
 * markets get rows.
 */
export const OPTION_VOCABULARY_TARGET_LOCALES = [
  "cs-CZ",
  "hu-HU",
  "ro-RO",
] as const satisfies readonly OptionVocabularyLocale[]

const PRODUCT_VARIANT_REFERENCE = "product_variant"
const SHIPPING_OPTION_REFERENCE = "shipping_option"

// Medusa placeholder titles for single-option products. They are hidden by the
// storefront, never shown to a customer, and must not be translated.
const PLACEHOLDER_VARIANT_TITLES = new Set([
  "Default",
  "Default option value",
  "Default variant",
])

type LocalizedTerm = Readonly<Record<OptionVocabularyLocale, string>>

/**
 * Countable units that appear inside variant titles such as "20 tabliet".
 * Each locale gets the grammatically correct form for the given count.
 */
const COUNTABLE_UNITS: ReadonlyArray<{
  readonly pattern: RegExp
  readonly render: Readonly<
    Record<OptionVocabularyLocale, (count: number) => string>
  >
}> = [
  {
    // tableta / tablety / tabliet
    pattern: /^(\d+)\s+(?:tableta|tablety|tabliet)$/iu,
    render: {
      "sk-SK": (count) =>
        `${count} ${slavicForm(count, "tableta", "tablety", "tabliet")}`,
      "cs-CZ": (count) =>
        `${count} ${slavicForm(count, "tableta", "tablety", "tablet")}`,
      "hu-HU": (count) => `${count} tabletta`,
      "ro-RO": (count) => `${count} ${romanianDe(count)}comprimate`,
    },
  },
  {
    // kapsula / kapsuly / kapsúl
    pattern: /^(\d+)\s+(?:kapsula|kapsuly|kaps[uú]l)$/iu,
    render: {
      "sk-SK": (count) =>
        `${count} ${slavicForm(count, "kapsula", "kapsuly", "kapsúl")}`,
      "cs-CZ": (count) =>
        `${count} ${slavicForm(count, "kapsle", "kapsle", "kapslí")}`,
      "hu-HU": (count) => `${count} kapszula`,
      "ro-RO": (count) => `${count} ${romanianDe(count)}capsule`,
    },
  },
  {
    // kus / kusy / kusov / ks
    pattern: /^(\d+)\s+(?:ks|kus|kusy|kusov)$/iu,
    render: {
      "sk-SK": (count) => `${count} ks`,
      "cs-CZ": (count) => `${count} ks`,
      "hu-HU": (count) => `${count} db`,
      "ro-RO": (count) => `${count} buc.`,
    },
  },
  {
    // vrecko / vrecká / vreciek
    pattern: /^(\d+)\s+(?:vrecko|vreck[aá]|vreciek)$/iu,
    render: {
      "sk-SK": (count) =>
        `${count} ${slavicForm(count, "vrecko", "vrecká", "vreciek")}`,
      "cs-CZ": (count) =>
        `${count} ${slavicForm(count, "sáček", "sáčky", "sáčků")}`,
      "hu-HU": (count) => `${count} filter`,
      "ro-RO": (count) => `${count} ${romanianDe(count)}plicuri`,
    },
  },
]

/** Czech/Slovak count-driven noun form: 1 / 2-4 / 5+. */
function slavicForm(
  count: number,
  one: string,
  few: string,
  many: string
): string {
  if (count === 1) {
    return one
  }
  if (count >= 2 && count <= 4) {
    return few
  }
  return many
}

/**
 * Romanian inserts "de" between the numeral and the noun when the last two
 * digits are 0 or fall between 20 and 99 (20 de comprimate, 100 de comprimate,
 * but 10 comprimate).
 */
function romanianDe(count: number): string {
  const lastTwoDigits = count % 100
  return lastTwoDigits === 0 || lastTwoDigits >= 20 ? "de " : ""
}

/**
 * Exact short option values. Keys are the Slovak (or English seed) source
 * titles as stored on `product_variant.title` / on an option value inside a
 * composite title.
 */
const OPTION_VALUE_VOCABULARY: Readonly<Record<string, LocalizedTerm>> = {
  // Flavours
  "Bez príchute": {
    "sk-SK": "Bez príchute",
    "cs-CZ": "Bez příchuti",
    "hu-HU": "Íz nélkül",
    "ro-RO": "Fără aromă",
  },
  Citrón: {
    "sk-SK": "Citrón",
    "cs-CZ": "Citron",
    "hu-HU": "Citrom",
    "ro-RO": "Lămâie",
  },
  Jahoda: {
    "sk-SK": "Jahoda",
    "cs-CZ": "Jahoda",
    "hu-HU": "Eper",
    "ro-RO": "Căpșuni",
  },
  Malina: {
    "sk-SK": "Malina",
    "cs-CZ": "Malina",
    "hu-HU": "Málna",
    "ro-RO": "Zmeură",
  },
  Mäta: {
    "sk-SK": "Mäta",
    "cs-CZ": "Máta",
    "hu-HU": "Menta",
    "ro-RO": "Mentă",
  },
  Škorica: {
    "sk-SK": "Škorica",
    "cs-CZ": "Skořice",
    "hu-HU": "Fahéj",
    "ro-RO": "Scorțișoară",
  },
  // Colours
  Biela: {
    "sk-SK": "Biela",
    "cs-CZ": "Bílá",
    "hu-HU": "Fehér",
    "ro-RO": "Alb",
  },
  Čierna: {
    "sk-SK": "Čierna",
    "cs-CZ": "Černá",
    "hu-HU": "Fekete",
    "ro-RO": "Negru",
  },
  Šedá: {
    "sk-SK": "Šedá",
    "cs-CZ": "Šedá",
    "hu-HU": "Szürke",
    "ro-RO": "Gri",
  },
  Black: {
    "sk-SK": "Čierna",
    "cs-CZ": "Černá",
    "hu-HU": "Fekete",
    "ro-RO": "Negru",
  },
  White: {
    "sk-SK": "Biela",
    "cs-CZ": "Bílá",
    "hu-HU": "Fehér",
    "ro-RO": "Alb",
  },
  // Shapes
  Kruh: {
    "sk-SK": "Kruh",
    "cs-CZ": "Kruh",
    "hu-HU": "Kör",
    "ro-RO": "Cerc",
  },
  Obdĺžnik: {
    "sk-SK": "Obdĺžnik",
    "cs-CZ": "Obdélník",
    "hu-HU": "Téglalap",
    "ro-RO": "Dreptunghi",
  },
  // Strengths
  Normál: {
    "sk-SK": "Normál",
    "cs-CZ": "Normální",
    "hu-HU": "Normál",
    "ro-RO": "Normal",
  },
  // Hair colour shades: the numeric shade code is an international standard and
  // is preserved verbatim; only the colour name is localized.
  "Čierna 1.0": {
    "sk-SK": "Čierna 1.0",
    "cs-CZ": "Černá 1.0",
    "hu-HU": "Fekete 1.0",
    "ro-RO": "Negru 1.0",
  },
  "Gaštan 4": {
    "sk-SK": "Gaštan 4",
    "cs-CZ": "Kaštanová 4",
    "hu-HU": "Gesztenye 4",
    "ro-RO": "Castaniu 4",
  },
  "Svetlá blond 8.0": {
    "sk-SK": "Svetlá blond 8.0",
    "cs-CZ": "Světlá blond 8.0",
    "hu-HU": "Világosszőke 8.0",
    "ro-RO": "Blond deschis 8.0",
  },
  "Svetlý gaštan-mahagón 5.5": {
    "sk-SK": "Svetlý gaštan-mahagón 5.5",
    "cs-CZ": "Světlý kaštan-mahagon 5.5",
    "hu-HU": "Világos gesztenye-mahagóni 5.5",
    "ro-RO": "Castaniu deschis-mahon 5.5",
  },
  "Veľmi svetlá blond 9.0": {
    "sk-SK": "Veľmi svetlá blond 9.0",
    "cs-CZ": "Velmi světlá blond 9.0",
    "hu-HU": "Nagyon világosszőke 9.0",
    "ro-RO": "Blond foarte deschis 9.0",
  },
  "Zlatá blond 7.3": {
    "sk-SK": "Zlatá blond 7.3",
    "cs-CZ": "Zlatá blond 7.3",
    "hu-HU": "Aranyszőke 7.3",
    "ro-RO": "Blond auriu 7.3",
  },
  "Zlatá medená tmavá blond 6.43": {
    "sk-SK": "Zlatá medená tmavá blond 6.43",
    "cs-CZ": "Zlatá měděná tmavá blond 6.43",
    "hu-HU": "Arany rezes sötétszőke 6.43",
    "ro-RO": "Blond închis aramiu auriu 6.43",
  },
}

const COMPOSITE_SEPARATOR = " / "

function translateSegment(
  segment: string,
  locale: OptionVocabularyLocale
): string | null {
  const trimmed = segment.trim()
  if (!trimmed) {
    return null
  }

  const exact = OPTION_VALUE_VOCABULARY[trimmed]
  if (exact) {
    return exact[locale]
  }

  for (const unit of COUNTABLE_UNITS) {
    const match = unit.pattern.exec(trimmed)
    if (match) {
      const count = Number.parseInt(match[1] as string, 10)
      if (Number.isFinite(count)) {
        return unit.render[locale](count)
      }
    }
  }

  return null
}

/**
 * Returns the localized variant title, or null when the title carries no
 * translatable vocabulary (pure sizes such as "100 ml", "XL", "27-28" and
 * Medusa placeholders are locale-neutral and must stay untouched).
 */
export function translateVariantTitle(
  title: string,
  locale: OptionVocabularyLocale
): string | null {
  const trimmed = title.trim()
  if (!trimmed || PLACEHOLDER_VARIANT_TITLES.has(trimmed)) {
    return null
  }

  const segments = trimmed.split(COMPOSITE_SEPARATOR)
  let translatedAny = false
  const localizedSegments = segments.map((segment) => {
    const localized = translateSegment(segment, locale)
    if (localized === null) {
      return segment.trim()
    }
    translatedAny = true
    return localized
  })

  if (!translatedAny) {
    return null
  }

  return localizedSegments.join(COMPOSITE_SEPARATOR)
}

/**
 * Shipping option names as configured in Medusa. Keys are the stored
 * `shipping_option.name` values.
 */
export const SHIPPING_OPTION_NAME_VOCABULARY: Readonly<
  Record<string, LocalizedTerm>
> = {
  "Herbatika Standard Shipping": {
    "sk-SK": "Kuriér na adresu",
    "cs-CZ": "Kurýr na adresu",
    "hu-HU": "Futárszolgálat címre",
    "ro-RO": "Curier la adresă",
  },
  "Herbatika Express Shipping": {
    "sk-SK": "Expresné doručenie",
    "cs-CZ": "Expresní doručení",
    "hu-HU": "Expressz kézbesítés",
    "ro-RO": "Livrare expres",
  },
  // Legacy options that live in the "European Warehouse delivery" fulfillment
  // set. CZ and SK sit in both that service zone and the Herbatika one, so
  // their labels must stay distinguishable from the Herbatika options above -
  // otherwise checkout renders three identical radio labels. The qualifier
  // names the fulfillment set they actually belong to.
  "Standard Shipping": {
    "sk-SK": "Štandardná doprava (európsky sklad)",
    "cs-CZ": "Standardní doprava (evropský sklad)",
    "hu-HU": "Standard szállítás (európai raktár)",
    "ro-RO": "Livrare standard (depozit european)",
  },
  "Express Shipping": {
    "sk-SK": "Expresná doprava (európsky sklad)",
    "cs-CZ": "Expresní doprava (evropský sklad)",
    "hu-HU": "Expressz szállítás (európai raktár)",
    "ro-RO": "Livrare rapidă (depozit european)",
  },
  "Kuriér na adresu": {
    "sk-SK": "Kuriér na adresu (európsky sklad)",
    "cs-CZ": "Kurýr na adresu (evropský sklad)",
    "hu-HU": "Futár a címre (európai raktár)",
    "ro-RO": "Curier la adresă (depozit european)",
  },
  Dobierka: {
    "sk-SK": "Dobierka",
    "cs-CZ": "Dobírka",
    "hu-HU": "Utánvét",
    "ro-RO": "Ramburs la livrare",
  },
  "Cash on Delivery": {
    "sk-SK": "Dobierka",
    "cs-CZ": "Dobírka",
    "hu-HU": "Utánvét",
    "ro-RO": "Ramburs la livrare",
  },
  "Osobný odber": {
    "sk-SK": "Osobný odber",
    "cs-CZ": "Osobní odběr",
    "hu-HU": "Személyes átvétel",
    "ro-RO": "Ridicare personală",
  },
  "Výdajné miesto": {
    "sk-SK": "Výdajné miesto",
    "cs-CZ": "Výdejní místo",
    "hu-HU": "Átvevőpont",
    "ro-RO": "Punct de ridicare",
  },
}

export function translateShippingOptionName(
  name: string,
  locale: OptionVocabularyLocale
): string | null {
  return SHIPPING_OPTION_NAME_VOCABULARY[name.trim()]?.[locale] ?? null
}

type TranslatableRow = { id: string; title: string }

export type ExistingVocabularyRow = {
  readonly id: string
  readonly locale_code: string
  readonly reference_id: string
  readonly value: string | null
}

type VocabularyUpdate = {
  readonly id: string
  readonly translations: Record<string, string>
}

export type VocabularyPlan = {
  readonly toCreate: CreateTranslationDTO[]
  readonly toUpdate: VocabularyUpdate[]
}

type PlanVocabularyInput = {
  readonly availableLocaleCodes: readonly string[]
  readonly existingRows: readonly ExistingVocabularyRow[]
  readonly reference: string
  readonly rows: readonly TranslatableRow[]
  readonly translate: (
    source: string,
    locale: OptionVocabularyLocale
  ) => string | null
  readonly field: "name" | "title"
}

type DesiredTranslation = {
  readonly localeCode: OptionVocabularyLocale
  readonly localized: string
  readonly referenceId: string
}

const collectDesiredTranslations = ({
  availableLocaleCodes,
  rows,
  translate,
}: Pick<
  PlanVocabularyInput,
  "availableLocaleCodes" | "rows" | "translate"
>): DesiredTranslation[] => {
  const available = new Set(availableLocaleCodes)

  return rows.flatMap((row) =>
    OPTION_VOCABULARY_TARGET_LOCALES.flatMap((locale) => {
      if (!available.has(locale)) {
        return []
      }

      const localized = translate(row.title, locale)
      if (localized === null || localized === row.title) {
        return []
      }

      return [{ localeCode: locale, localized, referenceId: row.id }]
    })
  )
}

/**
 * Splits the desired vocabulary into rows that do not exist yet and rows whose
 * stored value has drifted from the vocabulary in this file. Drift is only
 * reported; the caller decides whether to correct it.
 */
export function planVocabularyTranslations({
  availableLocaleCodes,
  existingRows,
  reference,
  rows,
  translate,
  field,
}: PlanVocabularyInput): VocabularyPlan {
  const existingByKey = new Map(
    existingRows.map((row) => [`${row.reference_id} ${row.locale_code}`, row])
  )
  const toCreate: CreateTranslationDTO[] = []
  const toUpdate: VocabularyUpdate[] = []

  for (const desired of collectDesiredTranslations({
    availableLocaleCodes,
    rows,
    translate,
  })) {
    const existing = existingByKey.get(
      `${desired.referenceId} ${desired.localeCode}`
    )

    if (!existing) {
      toCreate.push({
        locale_code: desired.localeCode,
        reference,
        reference_id: desired.referenceId,
        translations: { [field]: desired.localized },
      })
    } else if (existing.value !== desired.localized) {
      toUpdate.push({
        id: existing.id,
        translations: { [field]: desired.localized },
      })
    }
  }

  return { toCreate, toUpdate }
}

const listExistingRows = async (
  translationService: ITranslationModuleService,
  reference: string,
  referenceIds: readonly string[],
  field: "name" | "title"
): Promise<ExistingVocabularyRow[]> => {
  if (referenceIds.length === 0) {
    return []
  }

  const existing = await translationService.listTranslations(
    { reference, reference_id: [...referenceIds] },
    {
      select: ["id", "reference_id", "locale_code", "translations"],
      take: 100_000,
    }
  )

  return existing.map((row) => ({
    id: row.id,
    locale_code: row.locale_code,
    reference_id: row.reference_id,
    value:
      typeof row.translations?.[field] === "string"
        ? (row.translations[field] as string)
        : null,
  }))
}

export default async function herbaticaOptionVocabularyTranslations({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const apply =
    args.includes("--apply") ||
    process.env.HERBATICA_OPTION_VOCABULARY_APPLY === "1"
  const refresh =
    args.includes("--refresh") ||
    process.env.HERBATICA_OPTION_VOCABULARY_REFRESH === "1"

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )

  const locales = await translationService.listLocales(
    { code: [...OPTION_VOCABULARY_TARGET_LOCALES] },
    { select: ["code"], take: OPTION_VOCABULARY_TARGET_LOCALES.length }
  )
  const availableLocaleCodes = locales.map((locale) => locale.code)
  const missingLocales = OPTION_VOCABULARY_TARGET_LOCALES.filter(
    (locale) => !availableLocaleCodes.includes(locale)
  )
  if (missingLocales.length) {
    logger.warn(
      `option vocabulary: missing locales ${missingLocales.join(", ")}; those rows are skipped`
    )
  }

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "title"],
    pagination: { take: 100_000 },
  })
  const translatableVariants = (variants as TranslatableRow[]).filter(
    (variant) =>
      typeof variant.title === "string" &&
      OPTION_VOCABULARY_TARGET_LOCALES.some(
        (locale) => translateVariantTitle(variant.title, locale) !== null
      )
  )

  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
    pagination: { take: 1000 },
  })
  const translatableShippingOptions = (
    shippingOptions as Array<{ id: string; name: string }>
  )
    .map((option) => ({ id: option.id, title: option.name }))
    .filter((option) =>
      OPTION_VOCABULARY_TARGET_LOCALES.some(
        (locale) => translateShippingOptionName(option.title, locale) !== null
      )
    )

  const unmappedShippingOptions = (
    shippingOptions as Array<{ id: string; name: string }>
  )
    .filter(
      (option) => !SHIPPING_OPTION_NAME_VOCABULARY[option.name?.trim() ?? ""]
    )
    .map((option) => option.name)

  const variantPlan = planVocabularyTranslations({
    availableLocaleCodes,
    existingRows: await listExistingRows(
      translationService,
      PRODUCT_VARIANT_REFERENCE,
      translatableVariants.map((variant) => variant.id),
      "title"
    ),
    field: "title",
    reference: PRODUCT_VARIANT_REFERENCE,
    rows: translatableVariants,
    translate: translateVariantTitle,
  })

  const shippingPlan = planVocabularyTranslations({
    availableLocaleCodes,
    existingRows: await listExistingRows(
      translationService,
      SHIPPING_OPTION_REFERENCE,
      translatableShippingOptions.map((option) => option.id),
      "name"
    ),
    field: "name",
    reference: SHIPPING_OPTION_REFERENCE,
    rows: translatableShippingOptions,
    translate: translateShippingOptionName,
  })

  const toCreate = [...variantPlan.toCreate, ...shippingPlan.toCreate]
  const drifted = [...variantPlan.toUpdate, ...shippingPlan.toUpdate]

  logger.info(
    [
      "option vocabulary translations:",
      `variants-matched=${translatableVariants.length}`,
      `variant-rows=${variantPlan.toCreate.length}`,
      `shipping-options-matched=${translatableShippingOptions.length}`,
      `shipping-rows=${shippingPlan.toCreate.length}`,
      `drifted-rows=${drifted.length}`,
      `mode=${apply ? "APPLY" : "DRY-RUN"}${refresh ? "+REFRESH" : ""}`,
    ].join(" ")
  )
  if (unmappedShippingOptions.length) {
    logger.warn(
      `option vocabulary: shipping options without a mapping: ${unmappedShippingOptions.join(" | ")}`
    )
  }
  if (drifted.length && !refresh) {
    logger.warn(
      `option vocabulary: ${drifted.length} stored rows differ from this vocabulary; rerun with --refresh to overwrite them`
    )
  }

  if (!apply) {
    return { created: 0, drifted: drifted.length, toCreate: toCreate.length }
  }

  if (toCreate.length) {
    await translationService.createTranslations(toCreate)
    logger.info(`created ${toCreate.length} option vocabulary translation rows`)
  }
  if (refresh && drifted.length) {
    await translationService.updateTranslations(drifted)
    logger.info(`refreshed ${drifted.length} drifted translation rows`)
  }

  return {
    created: toCreate.length,
    drifted: drifted.length,
    refreshed: refresh ? drifted.length : 0,
    toCreate: toCreate.length,
  }
}

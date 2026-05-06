import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import type {
  ExecArgs,
  IFulfillmentModuleService,
  IRegionModuleService,
  Logger,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import seedDatabaseWorkflow, {
  type SeedDatabaseWorkflowInput,
} from "../workflows/seed/workflows/seed-database"
import {
  excerptPlainText,
  type HerbaticaCategoryExport,
  parseHerbaticaCategoriesXmlSource,
  readXmlSource,
} from "./herbatica-category-export"

type ProductSeedInput = SeedDatabaseWorkflowInput["products"][number]
type VariantSeedInput = NonNullable<ProductSeedInput["variants"]>[number]
type ProductOptionSeedInput = NonNullable<ProductSeedInput["options"]>[number]
type CategorySeedInput = SeedDatabaseWorkflowInput["productCategories"][number]

type XmlElement = {
  attributes: Record<string, string>
  inner: string
}

type ParsedParameter = {
  name: string
  value: string
}

type ParsedCategoryRef = {
  id?: string
  path: string
  isDefault: boolean
}

type ParsedFlag = {
  code?: string
  active?: boolean
  validFrom?: string
  validUntil?: string
}

type ParsedSetItem = {
  code?: string
  amount?: number
}

type ParsedPricelist = {
  title?: string
  priceVat?: number
  vat?: number
  standardPrice?: number
  actionPrice?: number
  actionPriceFrom?: string
  actionPriceUntil?: string
  purchasePrice?: number
}

type ParsedOssTaxRate = {
  country?: string
  level?: string
}

type ParsedRelatedFile = {
  url?: string
  title?: string
  text?: string
}

type ParsedRelatedVideo = {
  youtubeCode?: string
  url?: string
  text?: string
}

type ParsedOfferData = {
  variantId?: string
  code?: string
  ean?: string
  partNumber?: string
  productNumber?: string
  plu?: string
  unit?: string
  currency?: string
  vat?: number
  priceVat?: number
  standardPrice?: number
  actionPrice?: number
  actionPriceFrom?: string
  actionPriceUntil?: string
  purchasePrice?: number
  purchaseVat?: number
  purchasePriceInclVat?: boolean
  stockAmount?: number
  stockAmountRaw?: number
  stockLocation?: string
  stockMinimalAmount?: number
  stockMaximalAmount?: number
  stockMinSupply?: number
  availabilityOutOfStock?: string
  availabilityInStock?: string
  imageRef?: string
  visible?: boolean
  freeShipping?: boolean
  freeBilling?: boolean
  decimalCount?: number
  negativeAmount?: boolean
  priceRatio?: number
  minPriceRatio?: number
  applyLoyaltyDiscount?: boolean
  applyVolumeDiscount?: boolean
  applyQuantityDiscount?: boolean
  applyDiscountCoupon?: boolean
  weightKg?: number
  atypicalShipping?: boolean
  atypicalBilling?: boolean
  packageAmount?: number
  packageAmountUnit?: string
  measureAmount?: number
  measureAmountUnit?: string
  parameters: ParsedParameter[]
  pricelists: ParsedPricelist[]
  ossTaxRates: ParsedOssTaxRate[]
}

type ParsedShopItem = {
  id: string
  importCode?: string
  name: string
  guid?: string
  shortDescription?: string
  description?: string
  warranty?: string
  appendix?: string
  manufacturer?: string
  supplier?: string
  adult?: boolean
  itemType?: string
  categoryRefs: ParsedCategoryRef[]
  categoryPaths: string[]
  images: string[]
  textProperties: ParsedParameter[]
  relatedProducts: string[]
  alternativeProducts: string[]
  relatedFiles: ParsedRelatedFile[]
  relatedVideos: ParsedRelatedVideo[]
  flags: ParsedFlag[]
  visibility?: string
  seoTitle?: string
  metaDescription?: string
  allowsIplatba?: boolean
  allowsPayOnline?: boolean
  internalNote?: string
  heurekaCategoryId?: string
  zboziCategoryId?: string
  googleCategoryId?: string
  glamiCategoryId?: string
  xmlFeedName?: string
  setItems: ParsedSetItem[]
  topOffer: ParsedOfferData
  variants: ParsedOfferData[]
}

type ResolvedProductReference = {
  source_shopitem_id: string
  handle: string
}

type ResolvedProductReferences = {
  relatedProductHandles: string[]
  relatedProductRefs: ResolvedProductReference[]
  alternativeProductHandles: string[]
  alternativeProductRefs: ResolvedProductReference[]
}

type ProductContentSectionKey =
  | "description"
  | "usage"
  | "composition"
  | "warning"
  | "other"

type ProductContentSection = {
  key: ProductContentSectionKey
  title: string
  html: string
}

type ProductCardCopySource = "description" | "usage" | "short_description"
type ProductCardCopyMode = "list_items" | "sentences"

type ProductCardCopyConfig = {
  source: ProductCardCopySource
  mode: ProductCardCopyMode
  skip: number
  take: number
}

type CategoryNode = {
  key: string
  title: string
  parentKey?: string
  depth: number
}

type CategoryBuildResult = {
  categories: CategorySeedInput[]
  pathToHandle: Map<string, string>
  categoryIdToHandle: Map<string, string>
}

type BuildResult = {
  categories: CategorySeedInput[]
  products: ProductSeedInput[]
  stats: {
    shopItems: number
    categories: number
    products: number
    variants: number
    hiddenProducts: number
  }
}

type ResolvedFeedPaths = {
  productsXmlPath: string
  categoriesXmlPath?: string
}

type SeedBuildOptions = {
  referenceDate?: Date
  promoRebaseDays?: number
}

type ResolvedSeedBuildOptions = {
  referenceDate: Date
  promoRebaseDays?: number
}

type BuildProductMetadataOptions = {
  item: ParsedShopItem
  topOffer: ParsedOfferData
  categoryPaths: string[]
  categoryRefs: ParsedCategoryRef[]
  resolvedProductReferences: ResolvedProductReferences
  referenceDate?: Date
}

type BuildVariantsForProductOptions = {
  item: ParsedShopItem
  handle: string
  usedSkus: Set<string>
  usedEans: Set<string>
  referenceDate?: Date
}

const DEFAULT_PRODUCTS_XML_PATHS = [
  resolve(__dirname, "seed-files/productsComplete.xml"),
] as const

const DEFAULT_CATEGORIES_XML_PATHS = [
  resolve(__dirname, "seed-files/categories.xml"),
] as const

const DEFAULT_COUNTRIES = [
  "cz",
  "gb",
  "de",
  "dk",
  "se",
  "fr",
  "es",
  "it",
  "pl",
  "at",
  "sk",
] as const

const MAX_HANDLE_LENGTH = 180
const DEFAULT_OPTION_TITLE = "Variant"
const DEFAULT_OPTION_VALUE = "Default"
const PRODUCT_CONTENT_SECTION_ORDER: ProductContentSectionKey[] = [
  "description",
  "usage",
  "composition",
  "warning",
  "other",
]
const PRODUCT_CONTENT_SECTION_TITLES: Record<ProductContentSectionKey, string> =
  {
    description: "Popis",
    usage: "Použitie",
    composition: "Zloženie",
    warning: "Upozornenie",
    other: "Ostatné informácie",
  }
type ClassifiedProductContentSectionKey = Exclude<
  ProductContentSectionKey,
  "description"
>
type ProductContentLabelRule = {
  key: ClassifiedProductContentSectionKey
  patterns: RegExp[]
}
type ProductContentTextLabelDefinition = {
  key: ClassifiedProductContentSectionKey
  label: string
  pattern: RegExp
}
type ProductContentTextAnchor = {
  end: number
  key: ClassifiedProductContentSectionKey
  label: string
  start: number
}

const PRODUCT_CONTENT_LABEL_RULES: ProductContentLabelRule[] = [
  {
    key: "usage",
    patterns: [
      /^sposob (?:pouzitia|uzivania)(?: a (?:odporucane )?davkovanie)?$/,
      /^davkovanie(?: a (?:pouzitie|sposob (?:pouzitia|uzivania)))?$/,
      /^odporucane davkovanie$/,
      /^pouzitie(?: a (?:davkovanie|odporucane davkovanie))?$/,
      /^navod na pouzitie$/,
      /^(?:vnutorne|vonkajsie|na vonkajsie|pre vnutorne) (?:pouzitie|uzivanie)$/,
    ],
  },
  {
    key: "composition",
    patterns: [
      /^zlozenie(?: .*)?$/,
      /^ingrediencie$/,
      /^zlozky$/,
      /^ucinne latky$/,
      /^aktivne latky$/,
      /^obsah ucin(?:nej latky|nych latok)(?: .*)?$/,
      /^materialove zlozenie$/,
    ],
  },
  {
    key: "warning",
    patterns: [
      /^(?:zdravotne )?(?:upozornenie|upozornenia)$/,
      /^bezpecnostne upozornenia$/,
      /^vseobecne upozornenia$/,
      /^kontraindikacie$/,
    ],
  },
  {
    key: "other",
    patterns: [
      /^skladovanie(?: .*)?$/,
      /^obsah$/,
      /^obsah balenia(?:\/objem)?$/,
      /^obsah balenia a povod$/,
      /^obsah a povod$/,
      /^objem(?: .*)?$/,
      /^krajina (?:povodu|vyroby)$/,
      /^nas tip$/,
      /^vyzivove udaje(?: .*)?$/,
      /^rozmer$/,
      /^rozmery balenia$/,
      /^zaruka$/,
      /^appendix$/,
    ],
  },
]

const PRODUCT_CONTENT_TEXT_LABEL_DEFINITIONS: ProductContentTextLabelDefinition[] =
  [
    {
      key: "usage",
      label: "Spôsob užívania a odporúčané dávkovanie",
      pattern: /Spôsob\s+užívania\s+a\s+o\s*dporúčané\s+dávkovanie\s*:/gi,
    },
    {
      key: "usage",
      label: "Spôsob užívania a odporúčané dávkovanie",
      pattern: /Spôsob\s+užívania\s+a\s+odporúčané\s+dávkovanie\s*:/gi,
    },
    {
      key: "usage",
      label: "Spôsob použitia a odporúčané dávkovanie",
      pattern: /Spôsob\s+použitia\s+a\s+odporúčané\s+dávkovanie\s*:/gi,
    },
    {
      key: "usage",
      label: "Spôsob použitia",
      pattern: /Spôsob\s+použitia\s*:/gi,
    },
    {
      key: "usage",
      label: "Spôsob užívania",
      pattern: /Spôsob\s+užívania\s*:/gi,
    },
    {
      key: "usage",
      label: "Odporúčané dávkovanie",
      pattern: /Odporúčané\s+dávkovanie\s*:/gi,
    },
    {
      key: "usage",
      label: "Dávkovanie",
      pattern: /Dávkovanie\s*:/gi,
    },
    {
      key: "usage",
      label: "Použitie",
      pattern: /Použitie\s*:/gi,
    },
    {
      key: "usage",
      label: "Vnútorné použitie",
      pattern: /Vnútorné\s+použitie\s*:/gi,
    },
    {
      key: "usage",
      label: "Vnútorné užívanie",
      pattern: /Vnútorné\s+užívanie\s*:/gi,
    },
    {
      key: "usage",
      label: "Vonkajšie použitie",
      pattern: /Vonkajšie\s+použitie\s*:/gi,
    },
    {
      key: "usage",
      label: "Na vonkajšie použitie",
      pattern: /Na\s+vonkajšie\s+použitie\s*:/gi,
    },
    {
      key: "warning",
      label: "Zdravotné upozornenia",
      pattern: /Zdravotné\s+upozornenia\s*:/gi,
    },
    {
      key: "warning",
      label: "Bezpečnostné upozornenia",
      pattern: /Bezpečnostné\s+upozornenia\s*:/gi,
    },
    {
      key: "warning",
      label: "Všeobecné upozornenia",
      pattern: /Všeobecné\s+upozornenia\s*:/gi,
    },
    {
      key: "warning",
      label: "Upozornenia",
      pattern: /Upozornenia\s*:/gi,
    },
    {
      key: "warning",
      label: "Upozornenie",
      pattern: /Upozornenie\s*:/gi,
    },
    {
      key: "composition",
      label: "Zloženie",
      pattern: /Zloženie(?:\s+\(INCI\))?\s*:/gi,
    },
    {
      key: "composition",
      label: "Ingrediencie",
      pattern: /Ingrediencie\s*:/gi,
    },
    {
      key: "composition",
      label: "Účinné látky",
      pattern: /Účinné\s+látky\s*:/gi,
    },
    {
      key: "composition",
      label: "Aktívne látky",
      pattern: /Aktívne\s+látky\s*:/gi,
    },
    {
      key: "other",
      label: "Výživové údaje na 100 g",
      pattern: /Výživové\s+údaje\s+na\s+100\s+g\s*:/gi,
    },
    {
      key: "other",
      label: "Výživové údaje",
      pattern: /Výživové\s+údaje\s*:/gi,
    },
    {
      key: "other",
      label: "Skladovanie",
      pattern: /Skladovanie\s*:/gi,
    },
    {
      key: "other",
      label: "Obsah balenia/Objem",
      pattern: /Obsah\s+balenia\/Objem\s*:/gi,
    },
    {
      key: "other",
      label: "Obsah balenia",
      pattern: /Obsah\s+balenia\s*:/gi,
    },
    {
      key: "other",
      label: "Krajina pôvodu",
      pattern: /Krajina\s+pôvodu\s*:/gi,
    },
    {
      key: "other",
      label: "Krajina výroby",
      pattern: /Krajina\s+výroby\s*:/gi,
    },
    {
      key: "other",
      label: "Objem",
      pattern: /Objem\s*:/gi,
    },
    {
      key: "other",
      label: "Obsah",
      pattern: /Obsah\s*:/gi,
    },
    {
      key: "other",
      label: "Rozmer",
      pattern: /Rozmer\s*:/gi,
    },
    {
      key: "other",
      label: "NÁŠ TIP",
      pattern: /NÁŠ\s+TIP\s*:/gi,
    },
  ]

const PRODUCT_CONTENT_BLOCK_REGEX =
  /<(h[1-6]|p|div|ul|ol|table|blockquote)[^>]*>[\s\S]*?<\/\1>/gi

const ENTITY_MAP: Record<string, string> = {
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&nbsp;": " ",
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      const parsed = Number.parseInt(hex, 16)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replace(/&#([0-9]+);/g, (match, num) => {
      const parsed = Number.parseInt(num, 10)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replace(
      /&quot;|&apos;|&lt;|&gt;|&amp;|&nbsp;/g,
      (entity) => ENTITY_MAP[entity] ?? entity
    )
}

function normalizeText(value?: string): string | undefined {
  if (value === undefined) {
    return
  }
  const decoded = decodeXml(value).replace(/\r\n/g, "\n").trim()
  return decoded === "" ? undefined : decoded
}

function normalizeInlineText(value?: string): string | undefined {
  const normalized = normalizeText(value)
  if (normalized === undefined) {
    return
  }
  return normalized.replace(/\s+/g, " ").trim()
}

function stripHtmlTags(value?: string): string | undefined {
  if (!value) {
    return
  }
  const withoutTags = value.replace(/<[^>]+>/g, " ")
  return normalizeInlineText(withoutTags)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function hasHtmlTags(value: string): boolean {
  return /<[a-z][\s\S]*?>/i.test(value)
}

function normalizeComparableText(value?: string): string | undefined {
  const normalized = normalizeInlineText(value)
  if (!normalized) {
    return
  }
  return normalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function trimHtmlFragment(value?: string): string | undefined {
  const normalized = normalizeText(value)
  if (!normalized) {
    return
  }
  const trimmed = normalized.replace(/^\s+|\s+$/g, "")
  return trimmed === "" ? undefined : trimmed
}

function dedupeHtmlFragments(values: Array<string | undefined>): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const fragment = trimHtmlFragment(value)
    if (!fragment) {
      continue
    }

    const fingerprint =
      normalizeInlineText(fragment.replace(/>\s+</g, "><")) ?? fragment
    if (seen.has(fingerprint)) {
      continue
    }

    seen.add(fingerprint)
    result.push(fragment)
  }

  return result
}

function normalizeProductContentLabel(value?: string): string | undefined {
  const normalized = normalizeComparableText(value)
  if (!normalized) {
    return
  }

  const cleaned = normalized
    .replace(/^[^a-z0-9]+/g, "")
    .replace(/\bo\s+dporucane\b/g, "odporucane")
    .replace(/[:-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()

  return cleaned === "" ? undefined : cleaned
}

function classifyProductContentLabel(
  label?: string
): ProductContentSectionKey | undefined {
  const normalizedLabel = normalizeProductContentLabel(label)
  if (!normalizedLabel) {
    return
  }

  for (const rule of PRODUCT_CONTENT_LABEL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalizedLabel))) {
      return rule.key
    }
  }

  return
}

function toHtmlFragment(value?: string): string | undefined {
  const normalized = normalizeText(value)
  if (!normalized) {
    return
  }

  if (hasHtmlTags(normalized)) {
    return normalized
  }

  return `<p>${escapeHtml(normalized)}</p>`
}

function buildLabeledHtmlFragment(
  label: string,
  value?: string
): string | undefined {
  const normalized = normalizeText(value)
  if (!normalized) {
    return
  }

  if (hasHtmlTags(normalized)) {
    return `<h3>${escapeHtml(label)}</h3>\n${normalized}`
  }

  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(normalized)}</p>`
}

function buildTextPropertyHtml(property: ParsedParameter): string {
  return `<p><strong>${escapeHtml(property.name)}:</strong> ${escapeHtml(property.value)}</p>`
}

function buildPlainTextHtmlFragment(value?: string): string | undefined {
  const normalized = normalizeInlineText(value)
  if (!normalized) {
    return
  }

  return `<p>${escapeHtml(normalized)}</p>`
}

function buildLabeledPlainTextHtmlFragment(
  label: string,
  value?: string
): string | undefined {
  const normalizedLabel = normalizeInlineText(label.replace(/:\s*$/g, ""))
  const normalizedValue = normalizeInlineText(value)
  if (!normalizedLabel) {
    return
  }

  return `<p><strong>${escapeHtml(normalizedLabel)}:</strong>${
    normalizedValue ? ` ${escapeHtml(normalizedValue)}` : ""
  }</p>`
}

function findProductContentTextAnchors(
  text: string
): ProductContentTextAnchor[] {
  const anchors: ProductContentTextAnchor[] = []

  for (const definition of PRODUCT_CONTENT_TEXT_LABEL_DEFINITIONS) {
    const pattern = new RegExp(definition.pattern.source, "gi")
    for (const match of text.matchAll(pattern)) {
      const start = match.index
      const matchedText = match[0]
      if (start === undefined || !matchedText) {
        continue
      }

      anchors.push({
        end: start + matchedText.length,
        key: definition.key,
        label: definition.label,
        start,
      })
    }
  }

  const sortedAnchors = anchors.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start
    }

    return right.end - left.end
  })
  const result: ProductContentTextAnchor[] = []

  for (const anchor of sortedAnchors) {
    const previous = result.at(-1)
    if (previous && anchor.start < previous.end) {
      continue
    }

    result.push(anchor)
  }

  return result
}

function splitLabeledTextBlock(blockHtml: string): {
  beforeHtml?: string
  sections: Array<{ key: ProductContentSectionKey; html: string }>
} {
  const blockText = stripHtmlTags(blockHtml)
  if (!blockText) {
    return { sections: [] }
  }

  const anchors = findProductContentTextAnchors(blockText)
  if (anchors.length === 0) {
    return { sections: [] }
  }

  const firstAnchor = anchors[0]
  const beforeHtml = firstAnchor
    ? buildPlainTextHtmlFragment(blockText.slice(0, firstAnchor.start))
    : undefined
  const sections = anchors.flatMap((anchor, index) => {
    const nextAnchor = anchors[index + 1]
    const value = blockText.slice(anchor.end, nextAnchor?.start).trim()
    const html = buildLabeledPlainTextHtmlFragment(anchor.label, value)
    if (!html) {
      return []
    }

    return [
      {
        key: anchor.key,
        html,
      },
    ]
  })

  return {
    beforeHtml,
    sections,
  }
}

function buildProductDescriptionContentGroups(
  descriptionHtml: string
): Record<ProductContentSectionKey, string[]> {
  const grouped: Record<ProductContentSectionKey, string[]> = {
    description: [],
    usage: [],
    composition: [],
    warning: [],
    other: [],
  }
  let currentSection: ProductContentSectionKey = "description"
  let cursor = 0
  let hasBlock = false

  for (const match of descriptionHtml.matchAll(PRODUCT_CONTENT_BLOCK_REGEX)) {
    hasBlock = true
    const blockStart = match.index ?? 0
    const blockEnd = blockStart + match[0].length
    const beforeHtml = trimHtmlFragment(
      descriptionHtml.slice(cursor, blockStart)
    )
    if (beforeHtml) {
      grouped[currentSection].push(beforeHtml)
    }

    const blockHtml = trimHtmlFragment(match[0])
    const tagName = match[1]?.toLowerCase()
    if (!(blockHtml && tagName)) {
      cursor = blockEnd
      continue
    }

    if (/^h[1-6]$/.test(tagName)) {
      const sectionKey = classifyProductContentLabel(stripHtmlTags(blockHtml))
      if (sectionKey) {
        currentSection = sectionKey
      } else {
        currentSection = "description"
        grouped.description.push(blockHtml)
      }
      cursor = blockEnd
      continue
    }

    const splitBlock = splitLabeledTextBlock(blockHtml)
    if (splitBlock.sections.length > 0) {
      if (splitBlock.beforeHtml) {
        grouped[currentSection].push(splitBlock.beforeHtml)
      }
      for (const section of splitBlock.sections) {
        grouped[section.key].push(section.html)
      }
    } else {
      grouped[currentSection].push(blockHtml)
    }

    cursor = blockEnd
  }

  if (!hasBlock) {
    const splitBlock = splitLabeledTextBlock(descriptionHtml)
    if (splitBlock.sections.length > 0) {
      if (splitBlock.beforeHtml) {
        grouped.description.push(splitBlock.beforeHtml)
      }
      for (const section of splitBlock.sections) {
        grouped[section.key].push(section.html)
      }
    } else {
      grouped.description.push(descriptionHtml)
    }
    return grouped
  }

  const remainingHtml = trimHtmlFragment(descriptionHtml.slice(cursor))
  if (remainingHtml) {
    grouped[currentSection].push(remainingHtml)
  }

  return grouped
}

function buildProductContentSections(
  item: ParsedShopItem
): ProductContentSection[] {
  const grouped: Record<ProductContentSectionKey, string[]> = {
    description: [],
    usage: [],
    composition: [],
    warning: [],
    other: [],
  }

  const shortDescriptionHtml = toHtmlFragment(item.shortDescription)
  if (shortDescriptionHtml) {
    grouped.description.push(shortDescriptionHtml)
  }

  const descriptionHtml = toHtmlFragment(item.description)
  if (descriptionHtml) {
    const descriptionGroups =
      buildProductDescriptionContentGroups(descriptionHtml)
    for (const sectionKey of PRODUCT_CONTENT_SECTION_ORDER) {
      grouped[sectionKey].push(...descriptionGroups[sectionKey])
    }
  }

  const unmatchedTextProperties: ParsedParameter[] = []
  for (const property of item.textProperties) {
    const sectionKey = classifyProductContentLabel(property.name)
    if (sectionKey) {
      grouped[sectionKey].push(buildTextPropertyHtml(property))
      continue
    }
    unmatchedTextProperties.push(property)
  }

  if (unmatchedTextProperties.length > 0) {
    grouped.other.push(
      unmatchedTextProperties
        .map((property) => buildTextPropertyHtml(property))
        .join("\n")
    )
  }

  const warrantyHtml = buildLabeledHtmlFragment("Zaruka", item.warranty)
  if (warrantyHtml) {
    grouped.other.push(warrantyHtml)
  }
  const appendixHtml = buildLabeledHtmlFragment("Appendix", item.appendix)
  if (appendixHtml) {
    grouped.other.push(appendixHtml)
  }

  return PRODUCT_CONTENT_SECTION_ORDER.flatMap((sectionKey) => {
    const fragments = dedupeHtmlFragments(grouped[sectionKey])
    if (fragments.length === 0) {
      return []
    }

    return [
      {
        key: sectionKey,
        title: PRODUCT_CONTENT_SECTION_TITLES[sectionKey],
        html: fragments.join("\n"),
      },
    ]
  })
}

function countHtmlListItems(value?: string): number {
  const html = normalizeText(value)
  if (!html) {
    return 0
  }

  return [...html.matchAll(/<li(?:\s[^>]*)?>/gi)].length
}

function buildProductCardCopyConfig(
  contentSectionsMap: Record<ProductContentSectionKey, string>,
  shortDescription?: string
): ProductCardCopyConfig {
  const candidates: Array<{ source: ProductCardCopySource; html?: string }> = [
    {
      source: "description",
      html: contentSectionsMap.description,
    },
    {
      source: "usage",
      html: contentSectionsMap.usage,
    },
    {
      source: "short_description",
      html: shortDescription,
    },
  ]

  for (const candidate of candidates) {
    const liCount = countHtmlListItems(candidate.html)
    if (liCount > 0) {
      return {
        source: candidate.source,
        mode: "list_items",
        skip: liCount > 1 ? 1 : 0,
        take: 3,
      }
    }
  }

  for (const candidate of candidates) {
    if (normalizeText(candidate.html)) {
      return {
        source: candidate.source,
        mode: "sentences",
        skip: 0,
        take: 3,
      }
    }
  }

  return {
    source: "short_description",
    mode: "sentences",
    skip: 0,
    take: 3,
  }
}

function parseAttributes(raw?: string): Record<string, string> {
  if (!raw) {
    return {}
  }

  const attributes: Record<string, string> = {}
  const regex = /([:\w-]+)\s*=\s*"([^"]*)"/g
  for (const match of raw.matchAll(regex)) {
    const key = normalizeInlineText(match[1])
    if (!key) {
      continue
    }
    attributes[key] = normalizeText(match[2]) ?? ""
  }
  return attributes
}

function extractElements(source: string, tag: string): XmlElement[] {
  const regex = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g")
  const result: XmlElement[] = []
  for (const match of source.matchAll(regex)) {
    result.push({
      attributes: parseAttributes(match[1]),
      inner: match[2] ?? "",
    })
  }
  return result
}

function extractFirstElementContent(
  source: string,
  tag: string
): string | undefined {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`)
  const match = source.match(regex)
  return match?.[1]
}

function extractFirstText(source: string, tag: string): string | undefined {
  return normalizeText(extractFirstElementContent(source, tag))
}

function parseNumber(value?: string): number | undefined {
  const normalized = normalizeInlineText(value)
  if (!normalized) {
    return
  }
  const numberValue = Number(normalized.replace(",", "."))
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function parseInteger(value?: string): number | undefined {
  const numberValue = parseNumber(value)
  if (numberValue === undefined) {
    return
  }
  return Math.trunc(numberValue)
}

function parseBoolean(value?: string, fallback = false): boolean {
  const normalized = normalizeInlineText(value)?.toLowerCase()
  if (!normalized) {
    return fallback
  }
  return ["1", "true", "yes"].includes(normalized)
}

function normalizePriceAmount(amount?: number): number | undefined {
  if (
    amount === undefined ||
    Number.isNaN(amount) ||
    !Number.isFinite(amount)
  ) {
    return
  }

  return Math.max(0, amount)
}

function parsePositiveIntegerEnv(name: string): number | undefined {
  const parsed = parseInteger(process.env[name])
  if (parsed === undefined || parsed <= 0) {
    return
  }

  return parsed
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date.getTime())
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function resolveSeedBuildOptions(
  options?: SeedBuildOptions
): ResolvedSeedBuildOptions {
  const referenceDate = options?.referenceDate
    ? new Date(options.referenceDate)
    : new Date()
  const promoRebaseDays =
    typeof options?.promoRebaseDays === "number" &&
    Number.isFinite(options.promoRebaseDays) &&
    options.promoRebaseDays > 0
      ? Math.trunc(options.promoRebaseDays)
      : undefined

  return {
    referenceDate: Number.isNaN(referenceDate.getTime())
      ? new Date()
      : referenceDate,
    promoRebaseDays,
  }
}

function parseIsoDate(value?: string, endOfDay = false): Date | undefined {
  const normalized = normalizeInlineText(value)
  if (!normalized) {
    return
  }

  const dateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateMatch) {
    const [, year, month, day] = dateMatch
    const parsed = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        endOfDay ? 23 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
      )
    )

    if (Number.isNaN(parsed.getTime())) {
      return
    }

    return parsed
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return
  }

  parsed.setUTCHours(
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0
  )
  return parsed
}

function isDateRangeActive(
  validFrom?: string,
  validUntil?: string,
  referenceDate = new Date()
): boolean {
  const from = parseIsoDate(validFrom, false)
  const until = parseIsoDate(validUntil, true)

  if (from && referenceDate < from) {
    return false
  }

  if (until && referenceDate > until) {
    return false
  }

  return true
}

function resolveOfferBasePrice(
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData
): number | undefined {
  return normalizePriceAmount(
    offer.standardPrice ??
      offer.priceVat ??
      fallbackOffer?.standardPrice ??
      fallbackOffer?.priceVat
  )
}

function resolveOfferActionPrice(
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
  referenceDate = new Date()
): number | undefined {
  const actionPrice = normalizePriceAmount(
    offer.actionPrice ?? fallbackOffer?.actionPrice
  )
  if (actionPrice === undefined) {
    return
  }

  const actionPriceFrom =
    offer.actionPriceFrom ?? fallbackOffer?.actionPriceFrom
  const actionPriceUntil =
    offer.actionPriceUntil ?? fallbackOffer?.actionPriceUntil
  if (!isDateRangeActive(actionPriceFrom, actionPriceUntil, referenceDate)) {
    return
  }

  return actionPrice
}

function resolveOfferHasActiveDiscount(
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
  referenceDate = new Date()
): boolean {
  const basePrice = resolveOfferBasePrice(offer, fallbackOffer)
  const actionPrice = resolveOfferActionPrice(
    offer,
    fallbackOffer,
    referenceDate
  )
  if (actionPrice === undefined) {
    return false
  }

  if (basePrice === undefined) {
    return false
  }

  return actionPrice < basePrice
}

function hasDiscountedActionPrice(
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData
): boolean {
  const basePrice = resolveOfferBasePrice(offer, fallbackOffer)
  const actionPrice = normalizePriceAmount(
    offer.actionPrice ?? fallbackOffer?.actionPrice
  )

  return (
    basePrice !== undefined &&
    actionPrice !== undefined &&
    actionPrice < basePrice
  )
}

function resolveOfferCurrentPrice(
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
  referenceDate = new Date()
): number {
  const basePrice = resolveOfferBasePrice(offer, fallbackOffer)
  const actionPrice = resolveOfferActionPrice(
    offer,
    fallbackOffer,
    referenceDate
  )

  if (
    actionPrice !== undefined &&
    basePrice !== undefined &&
    actionPrice < basePrice
  ) {
    return actionPrice
  }

  if (basePrice !== undefined) {
    return basePrice
  }

  if (actionPrice !== undefined) {
    return actionPrice
  }

  return 0
}

function rebaseOfferPromotion(
  offer: ParsedOfferData,
  buildOptions: ResolvedSeedBuildOptions,
  fallbackOffer?: ParsedOfferData
): ParsedOfferData {
  if (!buildOptions.promoRebaseDays) {
    return offer
  }

  if (
    !hasDiscountedActionPrice(offer, fallbackOffer) ||
    resolveOfferHasActiveDiscount(
      offer,
      fallbackOffer,
      buildOptions.referenceDate
    )
  ) {
    return offer
  }

  return {
    ...offer,
    actionPriceFrom: formatIsoDate(buildOptions.referenceDate),
    actionPriceUntil: formatIsoDate(
      addUtcDays(buildOptions.referenceDate, buildOptions.promoRebaseDays)
    ),
  }
}

function normalizeFlags(
  flags: ParsedFlag[],
  topOffer: ParsedOfferData,
  referenceDate = new Date()
): ParsedFlag[] {
  const flagsByCode = new Map<string, ParsedFlag>()
  const hasActiveDiscount = resolveOfferHasActiveDiscount(
    topOffer,
    undefined,
    referenceDate
  )

  for (const rawFlag of flags) {
    const code = normalizeInlineText(rawFlag.code)?.toLowerCase()
    if (!code) {
      continue
    }

    const hasDateRange = Boolean(rawFlag.validFrom || rawFlag.validUntil)
    const dateRangeActive = hasDateRange
      ? isDateRangeActive(rawFlag.validFrom, rawFlag.validUntil, referenceDate)
      : false
    const explicitActive =
      typeof rawFlag.active === "boolean" ? rawFlag.active : undefined

    let resolvedActive = false
    if (explicitActive !== undefined) {
      resolvedActive = explicitActive
    } else if (hasDateRange) {
      resolvedActive = dateRangeActive
    }

    if (code === "action" && hasActiveDiscount) {
      resolvedActive = true
    }

    flagsByCode.set(code, {
      code,
      active: resolvedActive,
      validFrom: normalizeInlineText(rawFlag.validFrom),
      validUntil: normalizeInlineText(rawFlag.validUntil),
    })
  }

  if (hasActiveDiscount && !flagsByCode.has("action")) {
    flagsByCode.set("action", {
      code: "action",
      active: true,
    })
  }

  return [...flagsByCode.values()]
}

function removeBlocks(source: string, tags: readonly string[]): string {
  let result = source
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}(\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, "g")
    result = result.replace(regex, "")
  }
  return result
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

function dedupeParameters(values: ParsedParameter[]): ParsedParameter[] {
  const result: ParsedParameter[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const name = normalizeInlineText(value.name)
    const parsedValue = normalizeInlineText(value.value)
    if (!(name && parsedValue)) {
      continue
    }
    const key = `${name}::${parsedValue}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push({ name, value: parsedValue })
  }
  return result
}

function normalizeCategoryPath(path: string): string {
  return path
    .replace(/\s*>{2,}\s*/g, " > ")
    .replace(/\s*>\s*/g, " > ")
    .replace(/\s+/g, " ")
    .trim()
}

function splitCategoryPath(path: string): string[] {
  return normalizeCategoryPath(path)
    .split(" > ")
    .map((part) =>
      part
        .replace(/^>+\s*/, "")
        .replace(/\s*>+$/, "")
        .trim()
    )
    .filter((part) => part !== "")
}

function canonicalizeCategoryPath(path: string): string {
  return splitCategoryPath(path).join(" > ")
}

function slugify(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return normalized
}

function truncateWithHash(
  value: string,
  maxLength = MAX_HANDLE_LENGTH
): string {
  if (value.length <= maxLength) {
    return value
  }

  const hash = createHash("sha1").update(value).digest("hex").slice(0, 8)
  const keep = Math.max(1, maxLength - hash.length - 1)
  return `${value.slice(0, keep)}-${hash}`
}

function ensureUnique(
  base: string,
  used: Set<string>,
  fallbackPrefix: string
): string {
  const seed = truncateWithHash(base || fallbackPrefix)
  if (!used.has(seed)) {
    used.add(seed)
    return seed
  }

  let index = 2
  while (true) {
    const candidate = truncateWithHash(`${seed}-${index}`)
    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }
    index += 1
  }
}

function sanitizeSku(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function buildSkuSeed(
  parts: Array<string | undefined>,
  fallback: string
): string {
  const normalized = parts
    .map((part) => sanitizeSku(part ?? ""))
    .filter((part) => part !== "")

  if (normalized.length > 0) {
    return normalized.join("-")
  }

  return sanitizeSku(fallback) || "SKU"
}

function normalizeInventoryQuantity(quantity?: number): number {
  if (quantity === undefined || Number.isNaN(quantity)) {
    return 0
  }
  return Math.max(0, Math.trunc(quantity))
}

function parseParameters(
  source: string,
  containerTag: string
): ParsedParameter[] {
  const container = extractFirstElementContent(source, containerTag)
  if (!container) {
    return []
  }

  const parameters = extractElements(container, "PARAMETER").map(
    (parameter) => ({
      name: extractFirstText(parameter.inner, "NAME") ?? "",
      value: extractFirstText(parameter.inner, "VALUE") ?? "",
    })
  )

  return dedupeParameters(parameters)
}

function parsePricelists(source: string): ParsedPricelist[] {
  const pricelistsRaw = extractFirstElementContent(source, "PRICELISTS")
  if (!pricelistsRaw) {
    return []
  }

  return extractElements(pricelistsRaw, "PRICELIST").map((pricelist) => ({
    title: extractFirstText(pricelist.inner, "TITLE"),
    priceVat: parseNumber(extractFirstText(pricelist.inner, "PRICE_VAT")),
    vat: parseNumber(extractFirstText(pricelist.inner, "VAT")),
    standardPrice: parseNumber(
      extractFirstText(pricelist.inner, "STANDARD_PRICE")
    ),
    actionPrice: parseNumber(extractFirstText(pricelist.inner, "ACTION_PRICE")),
    actionPriceFrom: extractFirstText(pricelist.inner, "ACTION_PRICE_FROM"),
    actionPriceUntil: extractFirstText(pricelist.inner, "ACTION_PRICE_UNTIL"),
    purchasePrice: parseNumber(
      extractFirstText(pricelist.inner, "PURCHASE_PRICE")
    ),
  }))
}

function parseOssTaxRates(source: string): ParsedOssTaxRate[] {
  const ossRatesRaw = extractFirstElementContent(source, "OSS_TAX_RATES")
  if (!ossRatesRaw) {
    return []
  }

  return extractElements(ossRatesRaw, "OSS_TAX_RATE").map((rate) => ({
    country: extractFirstText(rate.inner, "TAX_COUNTRY"),
    level: extractFirstText(rate.inner, "TAX_RATE_LEVEL"),
  }))
}

function parseOfferData(
  source: string,
  attributes?: Record<string, string>
): ParsedOfferData {
  const stockRaw = extractFirstElementContent(source, "STOCK")
  const stockAmount = parseInteger(extractFirstText(stockRaw ?? "", "AMOUNT"))
  const stockMinSupply = parseInteger(
    extractFirstText(source, "STOCK_MIN_SUPPLY")
  )
  const logisticRaw = extractFirstElementContent(source, "LOGISTIC")
  const atypicalRaw = extractFirstElementContent(source, "ATYPICAL_PRODUCT")
  const unitOfMeasureRaw = extractFirstElementContent(source, "UNIT_OF_MEASURE")

  return {
    variantId: attributes?.id,
    code: extractFirstText(source, "CODE"),
    ean: extractFirstText(source, "EAN"),
    partNumber: extractFirstText(source, "PART_NUMBER"),
    productNumber: extractFirstText(source, "PRODUCT_NUMBER"),
    plu: extractFirstText(source, "PLU"),
    unit: extractFirstText(source, "UNIT"),
    currency: extractFirstText(source, "CURRENCY"),
    vat: parseNumber(extractFirstText(source, "VAT")),
    priceVat: parseNumber(extractFirstText(source, "PRICE_VAT")),
    standardPrice: parseNumber(extractFirstText(source, "STANDARD_PRICE")),
    actionPrice: parseNumber(extractFirstText(source, "ACTION_PRICE")),
    actionPriceFrom: extractFirstText(source, "ACTION_PRICE_FROM"),
    actionPriceUntil: extractFirstText(source, "ACTION_PRICE_UNTIL"),
    purchasePrice: parseNumber(extractFirstText(source, "PURCHASE_PRICE")),
    purchaseVat: parseNumber(extractFirstText(source, "PURCHASE_VAT")),
    purchasePriceInclVat: parseBoolean(
      extractFirstText(source, "PURCHASE_PRICE_INCL_VAT")
    ),
    stockAmount,
    stockAmountRaw: stockAmount,
    stockLocation: extractFirstText(stockRaw ?? "", "LOCATION"),
    stockMinimalAmount: parseInteger(
      extractFirstText(stockRaw ?? "", "MINIMAL_AMOUNT")
    ),
    stockMaximalAmount: parseInteger(
      extractFirstText(stockRaw ?? "", "MAXIMAL_AMOUNT")
    ),
    stockMinSupply,
    availabilityOutOfStock: extractFirstText(
      source,
      "AVAILABILITY_OUT_OF_STOCK"
    ),
    availabilityInStock: extractFirstText(source, "AVAILABILITY_IN_STOCK"),
    imageRef: extractFirstText(source, "IMAGE_REF"),
    visible: parseBoolean(extractFirstText(source, "VISIBLE"), true),
    freeShipping: parseBoolean(extractFirstText(source, "FREE_SHIPPING")),
    freeBilling: parseBoolean(extractFirstText(source, "FREE_BILLING")),
    decimalCount: parseInteger(extractFirstText(source, "DECIMAL_COUNT")),
    negativeAmount: parseBoolean(extractFirstText(source, "NEGATIVE_AMOUNT")),
    priceRatio: parseNumber(extractFirstText(source, "PRICE_RATIO")),
    minPriceRatio: parseNumber(extractFirstText(source, "MIN_PRICE_RATIO")),
    applyLoyaltyDiscount: parseBoolean(
      extractFirstText(source, "APPLY_LOYALTY_DISCOUNT"),
      true
    ),
    applyVolumeDiscount: parseBoolean(
      extractFirstText(source, "APPLY_VOLUME_DISCOUNT"),
      true
    ),
    applyQuantityDiscount: parseBoolean(
      extractFirstText(source, "APPLY_QUANTITY_DISCOUNT"),
      true
    ),
    applyDiscountCoupon: parseBoolean(
      extractFirstText(source, "APPLY_DISCOUNT_COUPON"),
      true
    ),
    weightKg: parseNumber(extractFirstText(logisticRaw ?? "", "WEIGHT")),
    atypicalShipping: parseBoolean(
      extractFirstText(atypicalRaw ?? "", "ATYPICAL_SHIPPING")
    ),
    atypicalBilling: parseBoolean(
      extractFirstText(atypicalRaw ?? "", "ATYPICAL_BILLING")
    ),
    packageAmount: parseNumber(
      extractFirstText(unitOfMeasureRaw ?? "", "PACKAGE_AMOUNT")
    ),
    packageAmountUnit: extractFirstText(
      unitOfMeasureRaw ?? "",
      "PACKAGE_AMOUNT_UNIT"
    ),
    measureAmount: parseNumber(
      extractFirstText(unitOfMeasureRaw ?? "", "MEASURE_AMOUNT")
    ),
    measureAmountUnit: extractFirstText(
      unitOfMeasureRaw ?? "",
      "MEASURE_AMOUNT_UNIT"
    ),
    parameters: parseParameters(source, "PARAMETERS"),
    pricelists: parsePricelists(source),
    ossTaxRates: parseOssTaxRates(source),
  }
}

function parseCodeList(source: string, containerTag: string): string[] {
  const container = extractFirstElementContent(source, containerTag)
  if (!container) {
    return []
  }
  return dedupeStrings(
    extractElements(container, "CODE").map((entry) =>
      normalizeInlineText(entry.inner)
    )
  )
}

function parseRelatedFiles(source: string): ParsedRelatedFile[] {
  const relatedFilesRaw = extractFirstElementContent(source, "RELATED_FILES")
  if (!relatedFilesRaw) {
    return []
  }

  return extractElements(relatedFilesRaw, "RELATED_FILE").map((entry) => ({
    url: extractFirstText(entry.inner, "URL"),
    title: extractFirstText(entry.inner, "TITLE"),
    text: extractFirstText(entry.inner, "TEXT"),
  }))
}

function parseRelatedVideos(source: string): ParsedRelatedVideo[] {
  const relatedVideosRaw = extractFirstElementContent(source, "RELATED_VIDEOS")
  if (!relatedVideosRaw) {
    return []
  }

  return extractElements(relatedVideosRaw, "RELATED_VIDEO").map((entry) => ({
    youtubeCode: extractFirstText(entry.inner, "YOUTUBE_VIDEO_CODE"),
    url: extractFirstText(entry.inner, "URL"),
    text: extractFirstText(entry.inner, "TEXT"),
  }))
}

function parseFlags(source: string): ParsedFlag[] {
  const flagsRaw = extractFirstElementContent(source, "FLAGS")
  if (!flagsRaw) {
    return []
  }

  return extractElements(flagsRaw, "FLAG").map((flag) => ({
    code: extractFirstText(flag.inner, "CODE"),
    active: parseBoolean(extractFirstText(flag.inner, "ACTIVE")),
    validFrom: extractFirstText(flag.inner, "VALID_FROM"),
    validUntil: extractFirstText(flag.inner, "VALID_UNTIL"),
  }))
}

function parseSetItems(source: string): ParsedSetItem[] {
  const setItemsRaw = extractFirstElementContent(source, "SET_ITEMS")
  if (!setItemsRaw) {
    return []
  }

  return extractElements(setItemsRaw, "SET_ITEM").map((item) => ({
    code: extractFirstText(item.inner, "CODE"),
    amount: parseInteger(extractFirstText(item.inner, "AMOUNT")),
  }))
}

function parseTextProperties(source: string): ParsedParameter[] {
  const textPropertiesRaw = extractFirstElementContent(
    source,
    "TEXT_PROPERTIES"
  )
  if (!textPropertiesRaw) {
    return []
  }

  const textProperties = extractElements(
    textPropertiesRaw,
    "TEXT_PROPERTY"
  ).map((property) => ({
    name: extractFirstText(property.inner, "NAME") ?? "",
    value: extractFirstText(property.inner, "VALUE") ?? "",
  }))
  return dedupeParameters(textProperties)
}

function parseImageUrls(source: string): string[] {
  const imagesRaw = extractFirstElementContent(source, "IMAGES")
  if (!imagesRaw) {
    return []
  }

  return dedupeStrings(
    extractElements(imagesRaw, "IMAGE").map((image) =>
      normalizeText(image.inner)
    )
  )
}

function parseCategoryRefs(source: string): ParsedCategoryRef[] {
  const categoriesRaw = extractFirstElementContent(source, "CATEGORIES")
  if (!categoriesRaw) {
    return []
  }

  const refs = [
    ...extractElements(categoriesRaw, "CATEGORY").map((category) => ({
      id: normalizeInlineText(category.attributes.id),
      path: canonicalizeCategoryPath(normalizeInlineText(category.inner) ?? ""),
      isDefault: false,
    })),
    ...extractElements(categoriesRaw, "DEFAULT_CATEGORY").map((category) => ({
      id: normalizeInlineText(category.attributes.id),
      path: canonicalizeCategoryPath(normalizeInlineText(category.inner) ?? ""),
      isDefault: true,
    })),
  ]

  const result: ParsedCategoryRef[] = []
  const seen = new Set<string>()

  for (const ref of refs) {
    if (!(ref.id || ref.path)) {
      continue
    }

    const key = `${ref.id ?? ""}::${ref.path}::${ref.isDefault ? "1" : "0"}`
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    result.push(ref)
  }

  return result
}

function parseShopItems(xml: string): ParsedShopItem[] {
  return extractElements(xml, "SHOPITEM").map((shopItem) => {
    const topLevelSource = removeBlocks(shopItem.inner, [
      "VARIANTS",
      "CATEGORIES",
      "IMAGES",
      "TEXT_PROPERTIES",
      "RELATED_PRODUCTS",
      "ALTERNATIVE_PRODUCTS",
      "RELATED_FILES",
      "RELATED_VIDEOS",
      "FLAGS",
      "SET_ITEMS",
    ])

    const variantsRaw = extractFirstElementContent(shopItem.inner, "VARIANTS")
    const variants = variantsRaw
      ? extractElements(variantsRaw, "VARIANT").map((variant) =>
          parseOfferData(variant.inner, variant.attributes)
        )
      : []

    const images = dedupeStrings([
      ...parseImageUrls(shopItem.inner),
      ...variants.map((variant) => variant.imageRef),
      extractFirstText(topLevelSource, "IMAGE_REF"),
    ])
    const categoryRefs = parseCategoryRefs(shopItem.inner)

    return {
      id: shopItem.attributes.id ?? "",
      importCode: shopItem.attributes["import-code"],
      name: extractFirstText(shopItem.inner, "NAME") ?? "",
      guid: extractFirstText(shopItem.inner, "GUID"),
      shortDescription: extractFirstText(shopItem.inner, "SHORT_DESCRIPTION"),
      description: extractFirstText(shopItem.inner, "DESCRIPTION"),
      warranty: extractFirstText(shopItem.inner, "WARRANTY"),
      appendix: extractFirstText(shopItem.inner, "APPENDIX"),
      manufacturer: extractFirstText(shopItem.inner, "MANUFACTURER"),
      supplier: extractFirstText(shopItem.inner, "SUPPLIER"),
      adult: parseBoolean(extractFirstText(shopItem.inner, "ADULT")),
      itemType: extractFirstText(shopItem.inner, "ITEM_TYPE"),
      categoryRefs,
      categoryPaths: dedupeStrings(
        categoryRefs.map((category) => category.path)
      ),
      images,
      textProperties: parseTextProperties(shopItem.inner),
      relatedProducts: parseCodeList(shopItem.inner, "RELATED_PRODUCTS"),
      alternativeProducts: parseCodeList(
        shopItem.inner,
        "ALTERNATIVE_PRODUCTS"
      ),
      relatedFiles: parseRelatedFiles(shopItem.inner),
      relatedVideos: parseRelatedVideos(shopItem.inner),
      flags: parseFlags(shopItem.inner),
      visibility: extractFirstText(shopItem.inner, "VISIBILITY"),
      seoTitle: extractFirstText(shopItem.inner, "SEO_TITLE"),
      metaDescription: extractFirstText(shopItem.inner, "META_DESCRIPTION"),
      allowsIplatba: parseBoolean(
        extractFirstText(shopItem.inner, "ALLOWS_IPLATBA")
      ),
      allowsPayOnline: parseBoolean(
        extractFirstText(shopItem.inner, "ALLOWS_PAY_ONLINE")
      ),
      internalNote: extractFirstText(shopItem.inner, "INTERNAL_NOTE"),
      heurekaCategoryId: extractFirstText(
        shopItem.inner,
        "HEUREKA_CATEGORY_ID"
      ),
      zboziCategoryId: extractFirstText(shopItem.inner, "ZBOZI_CATEGORY_ID"),
      googleCategoryId: extractFirstText(shopItem.inner, "GOOGLE_CATEGORY_ID"),
      glamiCategoryId: extractFirstText(shopItem.inner, "GLAMI_CATEGORY_ID"),
      xmlFeedName: extractFirstText(shopItem.inner, "XML_FEED_NAME"),
      setItems: parseSetItems(shopItem.inner),
      topOffer: parseOfferData(topLevelSource, shopItem.attributes),
      variants,
    }
  })
}

function buildCategoriesFromProductPaths(
  items: ParsedShopItem[]
): CategoryBuildResult {
  const nodes = new Map<string, CategoryNode>()

  for (const item of items) {
    for (const rawPath of item.categoryPaths) {
      const segments = splitCategoryPath(rawPath)
      for (let index = 0; index < segments.length; index += 1) {
        const title = segments[index]
        if (!title) {
          continue
        }

        const key = segments.slice(0, index + 1).join(" > ")
        const parentKey =
          index === 0 ? undefined : segments.slice(0, index).join(" > ")
        if (!nodes.has(key)) {
          nodes.set(key, {
            key,
            title,
            parentKey,
            depth: index + 1,
          })
        }
      }
    }
  }

  const sortedNodes = [...nodes.values()].sort((a, b) => {
    if (a.depth !== b.depth) {
      return a.depth - b.depth
    }
    return a.key.localeCompare(b.key)
  })

  const usedHandles = new Set<string>()
  const keyToHandle = new Map<string, string>()
  const pathToHandle = new Map<string, string>()

  for (const node of sortedNodes) {
    const baseHandle = truncateWithHash(
      slugify(node.key) ||
        `category-${createHash("sha1").update(node.key).digest("hex").slice(0, 10)}`
    )
    const handle = ensureUnique(baseHandle, usedHandles, "category")
    keyToHandle.set(node.key, handle)
    pathToHandle.set(node.key, handle)
  }

  const categories: CategorySeedInput[] = sortedNodes.map((node) => ({
    name: node.title,
    description: "Imported from Herbatica XML feed.",
    handle: keyToHandle.get(node.key),
    isActive: true,
    parentHandle: node.parentKey ? keyToHandle.get(node.parentKey) : undefined,
  }))

  return {
    categories,
    pathToHandle,
    categoryIdToHandle: new Map<string, string>(),
  }
}

function buildCategoryExportPathIndex(
  categories: HerbaticaCategoryExport[]
): Map<string, string> {
  const categoryById = new Map(
    categories.map((category) => [category.id, category])
  )
  const pathById = new Map<string, string>()
  const visiting = new Set<string>()

  const resolvePath = (categoryId: string): string => {
    const existingPath = pathById.get(categoryId)
    if (existingPath) {
      return existingPath
    }

    const category = categoryById.get(categoryId)
    if (!category) {
      return ""
    }

    if (visiting.has(categoryId)) {
      throw new Error(`Detected circular category ancestry for ${categoryId}`)
    }

    visiting.add(categoryId)

    const title = normalizeInlineText(category.title) ?? categoryId
    const parentPath = category.parentId ? resolvePath(category.parentId) : ""
    const path = parentPath ? `${parentPath} > ${title}` : title

    visiting.delete(categoryId)
    pathById.set(categoryId, path)
    return path
  }

  for (const category of categories) {
    resolvePath(category.id)
  }

  return pathById
}

function buildCategoryMetadata(
  category: HerbaticaCategoryExport,
  path: string
): Record<string, unknown> {
  return {
    source: "herbatica-categories-xml",
    source_category_id: category.id,
    source_parent_category_id: category.parentId,
    source_guid: category.guid,
    source_url: category.url,
    source_path: path,
    link_text: category.linkText,
    top_description_html: category.topDescriptionHtml,
    bottom_description_html: category.bottomDescriptionHtml,
    meta_title: category.metaTitle,
    meta_description: category.metaDescription,
    access: category.access,
    expand_in_menu: category.expandInMenu,
    visible: category.isVisible,
    priority: category.priority,
    page_type: category.pageType,
    search_priority: category.searchPriority,
    is_system: category.isSystem,
  }
}

function buildCategoriesFromExport(
  categoryExports: HerbaticaCategoryExport[]
): CategoryBuildResult {
  const pathById = buildCategoryExportPathIndex(categoryExports)
  const sortedCategories = [...categoryExports]
    .map((category) => {
      const path = pathById.get(category.id)
      if (!path) {
        throw new Error(`Missing resolved path for category ${category.id}`)
      }

      return {
        category,
        path,
        depth: splitCategoryPath(path).length,
      }
    })
    .sort((a, b) => {
      if (a.depth !== b.depth) {
        return a.depth - b.depth
      }

      return a.path.localeCompare(b.path)
    })

  const usedHandles = new Set<string>()
  const pathToHandle = new Map<string, string>()
  const categoryIdToHandle = new Map<string, string>()

  for (const node of sortedCategories) {
    const baseHandle = truncateWithHash(
      slugify(node.path) ||
        `category-${createHash("sha1").update(node.path).digest("hex").slice(0, 10)}`
    )
    const handle = ensureUnique(baseHandle, usedHandles, "category")
    pathToHandle.set(node.path, handle)
    categoryIdToHandle.set(node.category.id, handle)
  }

  const categories: CategorySeedInput[] = sortedCategories.map((node) => ({
    name: node.category.title,
    description:
      excerptPlainText(node.category.topDescriptionHtml) ??
      excerptPlainText(node.category.bottomDescriptionHtml) ??
      "Imported from Herbatica category export.",
    handle: categoryIdToHandle.get(node.category.id),
    isActive: node.category.isVisible,
    parentHandle: node.category.parentId
      ? categoryIdToHandle.get(node.category.parentId)
      : undefined,
    metadata: buildCategoryMetadata(node.category, node.path),
    rank: node.category.priority,
    isInternal: node.category.isSystem,
  }))

  return {
    categories,
    pathToHandle,
    categoryIdToHandle,
  }
}

function buildProducer(item: ParsedShopItem): ProductSeedInput["producer"] {
  const title = item.manufacturer ?? item.supplier
  if (!title) {
    return
  }

  const attributes = dedupeParameters(
    [
      item.supplier ? { name: "supplier", value: item.supplier } : undefined,
      item.manufacturer
        ? { name: "manufacturer", value: item.manufacturer }
        : undefined,
      item.itemType ? { name: "item_type", value: item.itemType } : undefined,
    ].filter((entry): entry is ParsedParameter => entry !== undefined)
  )

  return {
    title,
    attributes,
  }
}

function applyPromoOverrides(
  items: ParsedShopItem[],
  buildOptions: ResolvedSeedBuildOptions
): ParsedShopItem[] {
  if (!buildOptions.promoRebaseDays) {
    return items
  }

  return items.map((item) => {
    const topOffer = rebaseOfferPromotion(item.topOffer, buildOptions)
    const variants = item.variants.map((variant) =>
      rebaseOfferPromotion(variant, buildOptions, topOffer)
    )

    return {
      ...item,
      topOffer,
      variants,
    }
  })
}

function isProductPublished(item: ParsedShopItem): boolean {
  return (
    (item.visibility?.toLowerCase() ?? "visible") !== "hidden" &&
    (item.topOffer.visible ?? true)
  )
}

function resolveProductReference(
  code: string,
  productHandleBySourceId: Map<string, string>,
  publishedSourceIds: Set<string>
): ResolvedProductReference | undefined {
  const sourceShopitemId = normalizeInlineText(code)
  if (!(sourceShopitemId && publishedSourceIds.has(sourceShopitemId))) {
    return
  }

  const handle = productHandleBySourceId.get(sourceShopitemId)
  if (!handle) {
    return
  }

  return {
    source_shopitem_id: sourceShopitemId,
    handle,
  }
}

function resolveProductReferences(
  codes: string[],
  productHandleBySourceId: Map<string, string>,
  publishedSourceIds: Set<string>,
  excludedSourceId?: string
): ResolvedProductReference[] {
  const refs: ResolvedProductReference[] = []
  const seen = new Set<string>()

  for (const code of codes) {
    const ref = resolveProductReference(
      code,
      productHandleBySourceId,
      publishedSourceIds
    )
    if (
      !ref ||
      ref.source_shopitem_id === excludedSourceId ||
      seen.has(ref.source_shopitem_id)
    ) {
      continue
    }

    seen.add(ref.source_shopitem_id)
    refs.push(ref)
  }

  return refs
}

function buildResolvedProductReferences(
  item: ParsedShopItem,
  productHandleBySourceId: Map<string, string>,
  publishedSourceIds: Set<string>
): ResolvedProductReferences {
  const relatedProductRefs = resolveProductReferences(
    item.relatedProducts,
    productHandleBySourceId,
    publishedSourceIds,
    item.id
  )
  const alternativeProductRefs = resolveProductReferences(
    item.alternativeProducts,
    productHandleBySourceId,
    publishedSourceIds,
    item.id
  )

  return {
    relatedProductRefs,
    relatedProductHandles: relatedProductRefs.map((ref) => ref.handle),
    alternativeProductRefs,
    alternativeProductHandles: alternativeProductRefs.map((ref) => ref.handle),
  }
}

function buildVariantMetadata(
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
  referenceDate = new Date()
): Record<string, unknown> {
  const basePrice = resolveOfferBasePrice(offer, fallbackOffer)
  const hasActiveDiscount = resolveOfferHasActiveDiscount(
    offer,
    fallbackOffer,
    referenceDate
  )
  const currentPrice = resolveOfferCurrentPrice(
    offer,
    fallbackOffer,
    referenceDate
  )
  const compareAtPrice = hasActiveDiscount ? basePrice : undefined

  return {
    source_variant_id: offer.variantId,
    variant_id: offer.variantId,
    code: offer.code,
    ean: offer.ean,
    part_number: offer.partNumber,
    product_number: offer.productNumber,
    plu: offer.plu,
    unit: offer.unit,
    currency: offer.currency,
    vat: offer.vat,
    price_vat: offer.priceVat,
    standard_price: offer.standardPrice,
    action_price: offer.actionPrice,
    action_price_from: offer.actionPriceFrom,
    action_price_until: offer.actionPriceUntil,
    current_price: currentPrice,
    compare_at_price: compareAtPrice,
    has_active_discount: hasActiveDiscount,
    purchase_price: offer.purchasePrice,
    purchase_vat: offer.purchaseVat,
    purchase_price_incl_vat: offer.purchasePriceInclVat,
    stock: {
      amount: offer.stockAmountRaw,
      location: offer.stockLocation,
      minimal_amount: offer.stockMinimalAmount,
      maximal_amount: offer.stockMaximalAmount,
      min_supply: offer.stockMinSupply,
    },
    availability_in_stock: offer.availabilityInStock,
    availability_out_of_stock: offer.availabilityOutOfStock,
    image_ref: offer.imageRef,
    visible: offer.visible,
    free_shipping: offer.freeShipping,
    free_billing: offer.freeBilling,
    decimal_count: offer.decimalCount,
    negative_amount: offer.negativeAmount,
    price_ratio: offer.priceRatio,
    min_price_ratio: offer.minPriceRatio,
    apply_loyalty_discount: offer.applyLoyaltyDiscount,
    apply_volume_discount: offer.applyVolumeDiscount,
    apply_quantity_discount: offer.applyQuantityDiscount,
    apply_discount_coupon: offer.applyDiscountCoupon,
    weight_kg: offer.weightKg,
    atypical_shipping: offer.atypicalShipping,
    atypical_billing: offer.atypicalBilling,
    package_amount: offer.packageAmount,
    package_amount_unit: offer.packageAmountUnit,
    measure_amount: offer.measureAmount,
    measure_amount_unit: offer.measureAmountUnit,
    parameters: offer.parameters,
    pricelists: offer.pricelists,
    oss_tax_rates: offer.ossTaxRates,
  }
}

function buildProductMetadata({
  item,
  topOffer,
  categoryPaths,
  categoryRefs,
  resolvedProductReferences,
  referenceDate = new Date(),
}: BuildProductMetadataOptions): Record<string, unknown> {
  const normalizedFlags = normalizeFlags(item.flags, topOffer, referenceDate)
  const sourceCategoryIds = dedupeStrings(
    categoryRefs.map((categoryRef) => categoryRef.id)
  )
  const defaultCategoryRef = categoryRefs.find(
    (categoryRef) => categoryRef.isDefault
  )

  const contentSections = buildProductContentSections(item)
  const contentSectionsMap = {} as Record<ProductContentSectionKey, string>
  for (const sectionKey of PRODUCT_CONTENT_SECTION_ORDER) {
    contentSectionsMap[sectionKey] = ""
  }
  for (const section of contentSections) {
    contentSectionsMap[section.key] = section.html
  }
  const completeContentSections = PRODUCT_CONTENT_SECTION_ORDER.map(
    (sectionKey) => ({
      key: sectionKey,
      title: PRODUCT_CONTENT_SECTION_TITLES[sectionKey],
      html: contentSectionsMap[sectionKey],
    })
  )
  const cardCopy = buildProductCardCopyConfig(
    contentSectionsMap,
    item.shortDescription
  )

  return {
    source: "herbatica-products-complete-xml",
    source_shopitem_id: item.id,
    source_import_code: item.importCode,
    source_guid: item.guid,
    xml_feed_name: item.xmlFeedName,
    item_type: item.itemType,
    adult: item.adult,
    visibility: item.visibility,
    seo_title: item.seoTitle,
    meta_description: item.metaDescription,
    internal_note: item.internalNote,
    allows_iplatba: item.allowsIplatba,
    allows_pay_online: item.allowsPayOnline,
    market_category_ids: {
      heureka: item.heurekaCategoryId,
      zbozi: item.zboziCategoryId,
      google: item.googleCategoryId,
      glami: item.glamiCategoryId,
    },
    short_description: item.shortDescription,
    warranty: item.warranty,
    appendix: item.appendix,
    content_sections: completeContentSections,
    content_sections_map: contentSectionsMap,
    card_copy: cardCopy,
    category_paths: categoryPaths,
    category_refs: categoryRefs.map((categoryRef) => ({
      id: categoryRef.id,
      path: categoryRef.path,
      is_default: categoryRef.isDefault,
    })),
    source_category_ids: sourceCategoryIds,
    source_default_category_id: defaultCategoryRef?.id,
    source_default_category_path: defaultCategoryRef?.path,
    related_products: item.relatedProducts,
    related_product_handles: resolvedProductReferences.relatedProductHandles,
    related_product_refs: resolvedProductReferences.relatedProductRefs,
    alternative_products: item.alternativeProducts,
    alternative_product_handles:
      resolvedProductReferences.alternativeProductHandles,
    alternative_product_refs: resolvedProductReferences.alternativeProductRefs,
    related_files: item.relatedFiles,
    related_videos: item.relatedVideos,
    text_properties: item.textProperties,
    flags: normalizedFlags,
    flags_raw: item.flags,
    set_items: item.setItems,
    top_offer: buildVariantMetadata(topOffer, undefined, referenceDate),
  }
}

function buildVariantsForProduct({
  item,
  handle,
  usedSkus,
  usedEans,
  referenceDate = new Date(),
}: BuildVariantsForProductOptions): {
  options: ProductOptionSeedInput[]
  variants: VariantSeedInput[]
} {
  if (item.variants.length === 0) {
    const topOffer = item.topOffer
    const skuSeed = buildSkuSeed(
      ["SHOPITEM", item.id, topOffer.variantId ?? "DEFAULT"],
      `${handle}-DEFAULT`
    )
    const sku = ensureUnique(skuSeed, usedSkus, `${handle}-DEFAULT`)
    const defaultEan = normalizeInlineText(topOffer.ean)
    const ean = defaultEan && !usedEans.has(defaultEan) ? defaultEan : undefined
    if (ean) {
      usedEans.add(ean)
    }
    const amount = resolveOfferCurrentPrice(topOffer, undefined, referenceDate)
    const currencyCode = (topOffer.currency ?? "EUR").toLowerCase()
    const quantity = normalizeInventoryQuantity(topOffer.stockAmountRaw)
    const thumbnail = topOffer.imageRef
    const optionTitle = DEFAULT_OPTION_TITLE
    const optionValue = DEFAULT_OPTION_VALUE

    return {
      options: [
        {
          title: optionTitle,
          values: [optionValue],
        },
      ],
      variants: [
        {
          title: optionValue,
          sku,
          ean,
          options: {
            [optionTitle]: optionValue,
          },
          prices: [
            {
              amount,
              currency_code: currencyCode,
            },
          ],
          images: thumbnail ? [{ url: thumbnail }] : undefined,
          thumbnail,
          metadata: buildVariantMetadata(topOffer, undefined, referenceDate),
          quantities: {
            quantity,
          },
        },
      ],
    }
  }

  const optionValues = new Map<string, Set<string>>()
  const rawVariantOptions = item.variants.map((variant, index) => {
    const valuesByName = new Map<string, string>()
    for (const parameter of variant.parameters) {
      const name = normalizeInlineText(parameter.name)
      const value = normalizeInlineText(parameter.value)
      if (!(name && value)) {
        continue
      }
      if (!optionValues.has(name)) {
        optionValues.set(name, new Set<string>())
      }
      optionValues.get(name)?.add(value)
      valuesByName.set(name, value)
    }

    if (valuesByName.size === 0) {
      const fallbackName = DEFAULT_OPTION_TITLE
      const fallbackValue =
        normalizeInlineText(variant.code) ??
        normalizeInlineText(variant.variantId) ??
        `${DEFAULT_OPTION_VALUE} ${index + 1}`

      if (!optionValues.has(fallbackName)) {
        optionValues.set(fallbackName, new Set<string>())
      }
      optionValues.get(fallbackName)?.add(fallbackValue)
      valuesByName.set(fallbackName, fallbackValue)
    }

    return valuesByName
  })

  const optionNames = [...optionValues.keys()]
  for (const valuesByName of rawVariantOptions) {
    for (const optionName of optionNames) {
      if (!valuesByName.has(optionName)) {
        valuesByName.set(optionName, DEFAULT_OPTION_VALUE)
        optionValues.get(optionName)?.add(DEFAULT_OPTION_VALUE)
      }
    }
  }

  const options: ProductOptionSeedInput[] = optionNames.map((optionName) => ({
    title: optionName,
    values: [...(optionValues.get(optionName) ?? new Set<string>())],
  }))

  const variants: VariantSeedInput[] = item.variants.map((variant, index) => {
    const optionsForVariant =
      rawVariantOptions[index] ?? new Map<string, string>()
    for (const optionName of optionNames) {
      if (!optionsForVariant.has(optionName)) {
        optionsForVariant.set(optionName, DEFAULT_OPTION_VALUE)
      }
    }
    const optionObject = Object.fromEntries(optionsForVariant.entries())
    const title =
      optionNames.map((optionName) => optionObject[optionName]).join(" / ") ||
      normalizeInlineText(variant.code) ||
      `${DEFAULT_OPTION_VALUE} ${index + 1}`
    const skuSeed = buildSkuSeed(
      ["SHOPITEM", item.id, "VARIANT", variant.variantId ?? `${index + 1}`],
      `${handle}-${index + 1}`
    )
    const sku = ensureUnique(skuSeed, usedSkus, `${handle}-${index + 1}`)
    const currencyCode = (
      variant.currency ??
      item.topOffer.currency ??
      "EUR"
    ).toLowerCase()
    const amount = resolveOfferCurrentPrice(
      variant,
      item.topOffer,
      referenceDate
    )
    const quantity = normalizeInventoryQuantity(variant.stockAmountRaw)
    const thumbnail = variant.imageRef
    const rawEan = normalizeInlineText(variant.ean)
    const ean = rawEan && !usedEans.has(rawEan) ? rawEan : undefined
    if (ean) {
      usedEans.add(ean)
    }

    return {
      title,
      sku,
      ean,
      options: optionObject,
      prices: [
        {
          amount: amount ?? 0,
          currency_code: currencyCode,
        },
      ],
      images: thumbnail ? [{ url: thumbnail }] : undefined,
      thumbnail,
      metadata: buildVariantMetadata(variant, item.topOffer, referenceDate),
      quantities: {
        quantity,
      },
    }
  })

  return {
    options,
    variants,
  }
}

function buildProducts(
  items: ParsedShopItem[],
  pathToHandle: Map<string, string>,
  categoryIdToHandle: Map<string, string>,
  buildOptions: ResolvedSeedBuildOptions
): ProductSeedInput[] {
  const usedHandles = new Set<string>()
  const usedSkus = new Set<string>()
  const usedEans = new Set<string>()
  const productEntries = items.map((item, index) => {
    const stableHandleSource = item.id
      ? `shopitem-${item.id}`
      : `${item.name}-${index + 1}`
    const handleSeed = truncateWithHash(
      slugify(stableHandleSource) || `product-${index + 1}`
    )
    const handle = ensureUnique(handleSeed, usedHandles, `product-${index + 1}`)

    return {
      item,
      index,
      handle,
    }
  })
  const productHandleBySourceId = new Map<string, string>()
  const publishedSourceIds = new Set<string>()

  for (const { item, handle } of productEntries) {
    if (!item.id) {
      continue
    }

    productHandleBySourceId.set(item.id, handle)
    if (isProductPublished(item)) {
      publishedSourceIds.add(item.id)
    }
  }

  return productEntries.map(({ item, index, handle }) => {
    const categoryHandles = dedupeStrings(
      item.categoryRefs.map((categoryRef) => {
        if (categoryRef.id) {
          const categoryHandle = categoryIdToHandle.get(categoryRef.id)
          if (categoryHandle) {
            return categoryHandle
          }
        }

        return pathToHandle.get(categoryRef.path)
      })
    )
    const categories = categoryHandles.map((categoryHandle) => ({
      handle: categoryHandle,
    }))

    const primaryWeightKg =
      item.topOffer.weightKg ??
      item.variants.find((variant) => variant.weightKg !== undefined)?.weightKg
    const weight =
      primaryWeightKg !== undefined
        ? Math.max(1, Math.round(primaryWeightKg * 1000))
        : 1
    const isVisible = isProductPublished(item)
    const resolvedProductReferences = buildResolvedProductReferences(
      item,
      productHandleBySourceId,
      publishedSourceIds
    )

    const { options, variants } = buildVariantsForProduct({
      item,
      handle,
      usedSkus,
      usedEans,
      referenceDate: buildOptions.referenceDate,
    })
    const thumbnail = item.images[0] ?? item.topOffer.imageRef
    const imageUrls = dedupeStrings([...item.images, thumbnail])

    return {
      title: item.name || `Product ${item.id || index + 1}`,
      categories,
      description: item.description ?? item.shortDescription ?? "",
      handle,
      weight,
      status: isVisible ? ProductStatus.PUBLISHED : ProductStatus.DRAFT,
      metadata: buildProductMetadata({
        item,
        topOffer: item.topOffer,
        categoryPaths: item.categoryPaths,
        categoryRefs: item.categoryRefs,
        resolvedProductReferences,
        referenceDate: buildOptions.referenceDate,
      }),
      shippingProfileName: "Default Shipping Profile",
      thumbnail,
      images: imageUrls.map((url) => ({ url })),
      options,
      producer: buildProducer(item),
      variants,
      salesChannelNames: ["Default Sales Channel"],
    }
  })
}

function enforceUniqueVariantSkus(products: ProductSeedInput[]) {
  const usedSkus = new Set<string>()

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      const baseSku = sanitizeSku(variant.sku) || sanitizeSku(product.handle)
      let candidate = baseSku
      let suffix = 2

      while (usedSkus.has(candidate)) {
        candidate =
          sanitizeSku(`${baseSku}-${suffix}`) || `${baseSku}-${suffix}`
        suffix += 1
      }

      if (candidate !== variant.sku) {
        variant.metadata = {
          ...(variant.metadata ?? {}),
          source_sku: variant.sku,
        }
        variant.sku = candidate
      }

      usedSkus.add(candidate)
    }
  }
}

export function buildSeedInputFromXml(
  xml: string,
  categoryExports?: HerbaticaCategoryExport[],
  options?: SeedBuildOptions
): BuildResult {
  const buildOptions = resolveSeedBuildOptions(options)
  const items = applyPromoOverrides(parseShopItems(xml), buildOptions)
  const { categories, pathToHandle, categoryIdToHandle } = categoryExports
    ? buildCategoriesFromExport(categoryExports)
    : buildCategoriesFromProductPaths(items)
  const products = buildProducts(
    items,
    pathToHandle,
    categoryIdToHandle,
    buildOptions
  )
  enforceUniqueVariantSkus(products)
  const hiddenProducts = products.filter(
    (product) => product.status === ProductStatus.DRAFT
  ).length
  const variants = products.reduce(
    (acc, product) => acc + (product.variants?.length ?? 0),
    0
  )

  return {
    categories,
    products,
    stats: {
      shopItems: items.length,
      categories: categories.length,
      products: products.length,
      variants,
      hiddenProducts,
    },
  }
}

function resolveProductsXmlPath(args?: string[]): string {
  const argPath = normalizeInlineText(args?.[0])
  if (argPath) {
    return argPath
  }

  const envPath = normalizeInlineText(process.env.HERBATICA_XML_PATH)
  if (envPath) {
    return envPath
  }

  const detectedPath = DEFAULT_PRODUCTS_XML_PATHS.find((path) =>
    existsSync(path)
  )
  if (!detectedPath) {
    throw new Error(
      `Could not find productsComplete.xml. Checked: ${DEFAULT_PRODUCTS_XML_PATHS.join(", ")}`
    )
  }

  return detectedPath
}

function resolveCategoriesXmlPath(args?: string[]): string | undefined {
  const argPath = normalizeInlineText(args?.[1])
  if (argPath) {
    return argPath
  }

  const envPath = normalizeInlineText(process.env.HERBATICA_CATEGORIES_XML_PATH)
  if (envPath) {
    return envPath
  }

  return DEFAULT_CATEGORIES_XML_PATHS.find((path) => existsSync(path))
}

function resolveFeedPaths(args?: string[]): ResolvedFeedPaths {
  return {
    productsXmlPath: resolveProductsXmlPath(args),
    categoriesXmlPath: resolveCategoriesXmlPath(args),
  }
}

export default async function herbaticaSeed({ container, args }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  logger.info("Starting Herbatica seed from XML feed...")
  const feedPaths = resolveFeedPaths(args)
  logger.info(`Using product XML feed: ${feedPaths.productsXmlPath}`)
  if (feedPaths.categoriesXmlPath) {
    logger.info(`Using categories XML feed: ${feedPaths.categoriesXmlPath}`)
  } else {
    logger.warn(
      "Categories XML feed not found, falling back to categories derived from product paths."
    )
  }

  const xml = await readXmlSource(feedPaths.productsXmlPath)
  const categoryExports = feedPaths.categoriesXmlPath
    ? await parseHerbaticaCategoriesXmlSource(feedPaths.categoriesXmlPath)
    : undefined
  const buildOptions = resolveSeedBuildOptions({
    promoRebaseDays: parsePositiveIntegerEnv("HERBATICA_PROMO_REBASE_DAYS"),
  })

  if (buildOptions.promoRebaseDays !== undefined) {
    logger.info(
      `Rebasing expired Herbatica promo windows to ${formatIsoDate(buildOptions.referenceDate)} + ${buildOptions.promoRebaseDays} days`
    )
  }

  const parsed = buildSeedInputFromXml(xml, categoryExports, buildOptions)

  logger.info(
    `Parsed feed: ${parsed.stats.shopItems} SHOPITEMs, ${parsed.stats.categories} categories, ${parsed.stats.products} products, ${parsed.stats.variants} variants`
  )
  logger.info(
    `Products set to draft due to visibility rules: ${parsed.stats.hiddenProducts}`
  )

  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)
  const existingRegions = await regionService.listRegions({})
  const defaultRegions: SeedDatabaseWorkflowInput["regions"] = [
    {
      name: "Czechia",
      currencyCode: "czk",
      countries: ["cz"],
      paymentProviders: undefined,
      isTaxInclusive: true,
    },
    {
      name: "Europe",
      currencyCode: "eur",
      countries: DEFAULT_COUNTRIES.filter((country) => country !== "cz"),
      paymentProviders: undefined,
      isTaxInclusive: true,
    },
  ]

  const regionsInput: SeedDatabaseWorkflowInput["regions"] =
    existingRegions.length === 0
      ? defaultRegions
      : existingRegions.map((region) => ({
          name: region.name,
          currencyCode: region.currency_code?.toLowerCase() || "eur",
          countries: undefined,
          paymentProviders: undefined,
          isTaxInclusive: true,
        }))

  if (existingRegions.length > 0) {
    logger.info(
      `Using existing regions (${regionsInput.map((region) => region.name).join(", ")}) to avoid country assignment conflicts`
    )
  }

  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const existingFulfillmentSets = await fulfillmentService.listFulfillmentSets(
    {},
    { relations: ["service_zones"] }
  )
  const existingFulfillmentSetWithEurope = existingFulfillmentSets.find((set) =>
    (set.service_zones ?? []).some((zone) => zone.name === "Europe")
  )
  const selectedFulfillmentSet =
    existingFulfillmentSetWithEurope ?? existingFulfillmentSets[0]

  const fulfillmentSetName =
    selectedFulfillmentSet?.name ?? "European Warehouse delivery"
  const fulfillmentSetType = selectedFulfillmentSet?.type ?? "shipping"
  const serviceZoneName =
    selectedFulfillmentSet?.service_zones?.find((zone) => zone.name)?.name ??
    selectedFulfillmentSet?.service_zones?.[0]?.name ??
    "Europe"

  if (selectedFulfillmentSet) {
    logger.info(
      `Using existing fulfillment set "${fulfillmentSetName}" and service zone "${serviceZoneName}" to avoid duplicate service zone conflicts`
    )
  }

  const input: SeedDatabaseWorkflowInput = {
    salesChannels: [
      {
        name: "Default Sales Channel",
        default: true,
      },
    ],
    currencies: [
      {
        code: "czk",
        default: true,
      },
      {
        code: "eur",
        default: false,
      },
      {
        code: "usd",
        default: false,
      },
    ],
    regions: regionsInput,
    taxRegions: {
      countries: [...DEFAULT_COUNTRIES],
      taxProviderId: undefined,
    },
    taxRates: {
      fallbackCountryCode: "sk",
      countries: [...DEFAULT_COUNTRIES],
    },
    stockLocations: {
      locations: [
        {
          name: "European Warehouse",
          address: {
            city: "Copenhagen",
            country_code: "DK",
            address_1: "",
          },
        },
      ],
    },
    defaultShippingProfile: {
      name: "Default Shipping Profile",
    },
    fulfillmentSets: {
      name: fulfillmentSetName,
      type: fulfillmentSetType,
      serviceZones: [
        {
          name: serviceZoneName,
          geoZones: [...DEFAULT_COUNTRIES].map((country) => ({
            countryCode: country,
          })),
        },
      ],
    },
    shippingOptions: [
      {
        name: "Standard Shipping",
        providerId: "manual_manual",
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currencyCode: "usd",
            amount: 10,
          },
          {
            currencyCode: "eur",
            amount: 10,
          },
          {
            currencyCode: "czk",
            amount: 250,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        providerId: "manual_manual",
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express",
        },
        prices: [
          {
            currencyCode: "usd",
            amount: 10,
          },
          {
            currencyCode: "eur",
            amount: 10,
          },
          {
            currencyCode: "czk",
            amount: 250,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
    publishableKey: {
      title: "Webshop",
    },
    productCategories: parsed.categories,
    products: parsed.products,
  }

  logger.info("Running Herbatica seed workflow...")
  const { result } = await seedDatabaseWorkflow(container).run({
    input,
  })

  logger.info("Herbatica seed completed successfully")
  logger.info(`Result: ${JSON.stringify(result, null, 2)}`)
}

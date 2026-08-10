import { createHash } from "node:crypto"
import { existsSync } from "node:fs"

import type {
  ExecArgs,
  IFulfillmentModuleService,
  IRegionModuleService,
  Logger,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { normalizeUnitCode } from "../workflows/measurement-unit/steps/helpers"
import type { SeedDatabaseWorkflowInput } from "../workflows/seed/workflows/seed-database"
import { seedShoptetImportWorkflow } from "../workflows/seed/workflows/seed-shoptet-import"
import {
  excerptPlainText,
  parseHerbaticaCategoriesXmlSource,
} from "./herbatica-category-export"
import type { HerbaticaCategoryExport } from "./herbatica-category-export"
import { importHerbaticaReviews } from "./herbatica-reviews-seed"
import {
  HERBATICA_CATEGORIES_XML_ENV,
  HERBATICA_CATEGORIES_XML_PATHS,
  HERBATICA_COUNTRIES,
  HERBATICA_CURRENCIES,
  HERBATICA_DEFAULT_FULFILLMENT_SET,
  HERBATICA_DEFAULT_PRICELIST_LABEL,
  HERBATICA_DEFAULT_REGIONS,
  HERBATICA_DEFAULT_SHIPPING_PROFILE,
  HERBATICA_DEFAULT_SHOPTET_PRICELIST_TITLES,
  HERBATICA_DEFAULT_STOCK_LOCATION,
  HERBATICA_FALLBACK_SHOPTET_WAREHOUSE,
  HERBATICA_MANUFACTURERS_CSV_ENV,
  HERBATICA_POS_SALES_CHANNEL_NAME,
  HERBATICA_PRICE_LIST_SYNC_CONFIG,
  HERBATICA_PRODUCTS_XML_ENV,
  HERBATICA_PRODUCTS_XML_PATHS,
  HERBATICA_PROMO_REBASE_DAYS_ENV,
  HERBATICA_PUBLISHABLE_KEY,
  HERBATICA_REVIEWS_XML_ENV,
  HERBATICA_SALE_PRICE_LIST_TITLE_TEMPLATE,
  HERBATICA_SALES_CHANNELS,
  HERBATICA_SHIPPING_OPTIONS,
  HERBATICA_STOREFRONT_SALES_CHANNEL_NAME,
  HERBATICA_TAX_RATE_CONFIG,
  HERBATICA_TAX_RATE_COUNTRIES,
  HERBATICA_WORKFLOW_DEFAULTS,
} from "./herbatica-seed-config"
import {
  decodeXml,
  extractElements,
  extractFirstElementContent,
  extractFirstText,
  normalizeInlineText,
  normalizeText,
  readXmlSource,
} from "./herbatica-xml-utils"
import {
  buildManufacturersLookup,
  findManufacturerCsvRow,
  parseManufacturersCsv,
  readCsvSource,
} from "./manufacturers-csv"
import type { ManufacturerCsvLookup } from "./manufacturers-csv"

type ProductSeedInput = SeedDatabaseWorkflowInput["products"][number]
type BrandSeedInput = NonNullable<ProductSeedInput["brand"]>
type VariantSeedInput = NonNullable<ProductSeedInput["variants"]>[number]
type ProductOptionSeedInput = NonNullable<ProductSeedInput["options"]>[number]
type CategorySeedInput = SeedDatabaseWorkflowInput["productCategories"][number]
type PriceListsSeedInput = NonNullable<SeedDatabaseWorkflowInput["priceLists"]>
type PriceListPriceSeedInput =
  PriceListsSeedInput["overrides"][number]["prices"][number]

interface ParsedParameter {
  name: string
  value: string
}

interface ParsedCategoryRef {
  id?: string | undefined
  path: string
  isDefault: boolean
}

interface ParsedFlag {
  code?: string | undefined
  active?: boolean | undefined
  validFrom?: string | undefined
  validUntil?: string | undefined
}

interface ParsedSetItem {
  code?: string | undefined
  amount?: number | undefined
}

interface ParsedPricelist {
  title?: string | undefined
  priceVat?: number | undefined
  vat?: number | undefined
  standardPrice?: number | undefined
  actionPrice?: number | undefined
  actionPriceFrom?: string | undefined
  actionPriceUntil?: string | undefined
  purchasePrice?: number | undefined
}

interface ParsedOssTaxRate {
  country?: string | undefined
  level?: string | undefined
}

interface ParsedStockWarehouse {
  name?: string | undefined
  quantity?: number | undefined
  location?: string | undefined
}

interface ParsedRelatedFile {
  url?: string | undefined
  title?: string | undefined
  text?: string | undefined
}

interface ParsedRelatedVideo {
  youtubeCode?: string | undefined
  url?: string | undefined
  text?: string | undefined
}

interface ParsedOfferData {
  variantId?: string | undefined
  code?: string | undefined
  ean?: string | undefined
  partNumber?: string | undefined
  productNumber?: string | undefined
  plu?: string | undefined
  unit?: string | undefined
  currency?: string | undefined
  vat?: number | undefined
  priceVat?: number | undefined
  standardPrice?: number | undefined
  actionPrice?: number | undefined
  actionPriceFrom?: string | undefined
  actionPriceUntil?: string | undefined
  purchasePrice?: number | undefined
  purchaseVat?: number | undefined
  purchasePriceInclVat?: boolean | undefined
  stockAmount?: number | undefined
  stockAmountRaw?: number | undefined
  stockLocation?: string | undefined
  stockMinimalAmount?: number | undefined
  stockMaximalAmount?: number | undefined
  stockMinSupply?: number | undefined
  stockWarehouses: ParsedStockWarehouse[]
  availabilityOutOfStock?: string | undefined
  availabilityInStock?: string | undefined
  imageRef?: string | undefined
  visible?: boolean | undefined
  freeShipping?: boolean | undefined
  freeBilling?: boolean | undefined
  decimalCount?: number | undefined
  negativeAmount?: boolean | undefined
  priceRatio?: number | undefined
  minPriceRatio?: number | undefined
  applyLoyaltyDiscount?: boolean | undefined
  applyVolumeDiscount?: boolean | undefined
  applyQuantityDiscount?: boolean | undefined
  applyDiscountCoupon?: boolean | undefined
  weightKg?: number | undefined
  atypicalShipping?: boolean | undefined
  atypicalBilling?: boolean | undefined
  packageAmount?: number | undefined
  packageAmountUnit?: string | undefined
  measureAmount?: number | undefined
  measureAmountUnit?: string | undefined
  parameters: ParsedParameter[]
  pricelists: ParsedPricelist[]
  ossTaxRates: ParsedOssTaxRate[]
}

interface ParsedShopItem {
  id: string
  importCode?: string | undefined
  name: string
  guid?: string | undefined
  shortDescription?: string | undefined
  description?: string | undefined
  warranty?: string | undefined
  appendix?: string | undefined
  manufacturer?: string | undefined
  supplier?: string | undefined
  adult?: boolean | undefined
  itemType?: string | undefined
  categoryRefs: ParsedCategoryRef[]
  categoryPaths: string[]
  images: string[]
  textProperties: ParsedParameter[]
  relatedProducts: string[]
  alternativeProducts: string[]
  relatedFiles: ParsedRelatedFile[]
  relatedVideos: ParsedRelatedVideo[]
  flags: ParsedFlag[]
  visibility?: string | undefined
  seoTitle?: string | undefined
  metaDescription?: string | undefined
  allowsIplatba?: boolean | undefined
  allowsPayOnline?: boolean | undefined
  internalNote?: string | undefined
  heurekaCategoryId?: string | undefined
  zboziCategoryId?: string | undefined
  googleCategoryId?: string | undefined
  glamiCategoryId?: string | undefined
  xmlFeedName?: string | undefined
  setItems: ParsedSetItem[]
  topOffer: ParsedOfferData
  variants: ParsedOfferData[]
}

interface ResolvedProductReference {
  source_shopitem_id: string
  handle: string
}

interface ResolvedProductReferences {
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
type ProductContentGroups = Record<ProductContentSectionKey, string[]>

interface ProductContentSection {
  key: ProductContentSectionKey
  title: string
  html: string
}

type ProductCardCopySource = "description" | "usage" | "short_description"
type ProductCardCopyMode = "list_items" | "sentences"

interface ProductCardCopyConfig {
  source: ProductCardCopySource
  mode: ProductCardCopyMode
  skip: number
  take: number
}

interface CategoryNode {
  key: string
  title: string
  parentKey?: string | undefined
  depth: number
}

interface CategoryHandleMaps {
  keyToHandle: Map<string, string>
  pathToHandle: Map<string, string>
}

interface CategoryBuildResult {
  categories: CategorySeedInput[]
  pathToHandle: Map<string, string>
  categoryIdToHandle: Map<string, string>
}

interface BuildResult {
  categories: CategorySeedInput[]
  products: ProductSeedInput[]
  priceLists: NonNullable<SeedDatabaseWorkflowInput["priceLists"]>
  stockLocations: SeedDatabaseWorkflowInput["stockLocations"]["locations"]
  warnings: string[]
  stats: {
    shopItems: number
    categories: number
    products: number
    variants: number
    hiddenProducts: number
    overridePriceLists: number
    salePriceLists: number
    priceListPrices: number
    stockLocations: number
    warnings: number
  }
}

interface ResolvedFeedPaths {
  productsXmlPath: string
  categoriesXmlPath?: string | undefined
  reviewsXmlPath?: string | undefined
}

interface HerbaticaWorkflowInputOptions {
  regionsInput: SeedDatabaseWorkflowInput["regions"]
  fulfillmentSetName: string
  fulfillmentSetType: string
  serviceZoneName: string
}

interface SeedBuildOptions {
  referenceDate?: Date | undefined
  promoRebaseDays?: number | undefined
}

interface ResolvedSeedBuildOptions {
  referenceDate: Date
  promoRebaseDays?: number | undefined
}

interface BuildProductMetadataOptions {
  item: ParsedShopItem
  topOffer: ParsedOfferData
  categoryPaths: string[]
  categoryRefs: ParsedCategoryRef[]
  resolvedProductReferences: ResolvedProductReferences
  referenceDate?: Date | undefined
}

interface BuildVariantsForProductOptions {
  item: ParsedShopItem
  handle: string
  usedSkus: Set<string>
  referenceDate?: Date | undefined
}

interface BuildVariantSeedOptions {
  handle: string
  index: number
  item: ParsedShopItem
  optionNames: string[]
  optionsForVariant: Map<string, string>
  referenceDate: Date
  usedSkus: Set<string>
  variant: ParsedOfferData
}

type HerbaticaOfferMeasurementSource = Pick<
  ParsedOfferData,
  "measureAmount" | "measureAmountUnit" | "packageAmount" | "packageAmountUnit"
>

const DEFAULT_STOCK_LOCATION_NAME = HERBATICA_DEFAULT_STOCK_LOCATION.name
const FALLBACK_SHOPTET_WAREHOUSE_NAME =
  HERBATICA_FALLBACK_SHOPTET_WAREHOUSE.name
const FALLBACK_SHOPTET_WAREHOUSE_ADDRESS =
  HERBATICA_FALLBACK_SHOPTET_WAREHOUSE.address
const DEFAULT_COUNTRIES = HERBATICA_COUNTRIES
const MAX_HANDLE_LENGTH = 180
const DEFAULT_OPTION_TITLE = "Variant"
const EAN_ISSUE_LOG_LIMIT = 50
const DEFAULT_OPTION_VALUE = "Default"
const DEFAULT_PRICELIST_LABEL = HERBATICA_DEFAULT_PRICELIST_LABEL
const DEFAULT_SHOPTET_PRICELIST_TITLES: ReadonlySet<string> = new Set(
  HERBATICA_DEFAULT_SHOPTET_PRICELIST_TITLES,
)
const PRODUCT_CONTENT_SECTION_ORDER: ProductContentSectionKey[] = [
  "description",
  "usage",
  "composition",
  "warning",
  "other",
]
const PRODUCT_CONTENT_SECTION_TITLES: Record<ProductContentSectionKey, string> =
  {
    composition: "Zloženie",
    description: "Popis",
    other: "Ostatné informácie",
    usage: "Použitie",
    warning: "Upozornenie",
  }
type ClassifiedProductContentSectionKey = Exclude<
  ProductContentSectionKey,
  "description"
>
interface ProductContentLabelRule {
  key: ClassifiedProductContentSectionKey
  patterns: RegExp[]
}
interface ProductContentTextLabelDefinition {
  key: ClassifiedProductContentSectionKey
  label: string
  pattern: RegExp
}
interface ProductContentTextAnchor {
  end: number
  key: ClassifiedProductContentSectionKey
  label: string
  start: number
}

const PRODUCT_CONTENT_LABEL_RULES: ProductContentLabelRule[] = [
  {
    key: "usage",
    patterns: [
      /^sposob (?:pouzitia|uzivania)(?: a (?:odporucane )?davkovanie)?$/u,
      /^davkovanie(?: a (?:pouzitie|sposob (?:pouzitia|uzivania)))?$/u,
      /^odporucane davkovanie$/u,
      /^pouzitie(?: a (?:davkovanie|odporucane davkovanie))?$/u,
      /^navod na pouzitie$/u,
      /^(?:vnutorne|vonkajsie|na vonkajsie|pre vnutorne) (?:pouzitie|uzivanie)$/u,
    ],
  },
  {
    key: "composition",
    patterns: [
      /^zlozenie(?: .*)?$/u,
      /^ingrediencie$/u,
      /^zlozky$/u,
      /^ucinne latky$/u,
      /^aktivne latky$/u,
      /^obsah ucin(?:nej latky|nych latok)(?: .*)?$/u,
      /^materialove zlozenie$/u,
    ],
  },
  {
    key: "warning",
    patterns: [
      /^(?:zdravotne )?(?:upozornenie|upozornenia)$/u,
      /^bezpecnostne upozornenia$/u,
      /^vseobecne upozornenia$/u,
      /^kontraindikacie$/u,
    ],
  },
  {
    key: "other",
    patterns: [
      /^skladovanie(?: .*)?$/u,
      /^obsah$/u,
      /^obsah balenia(?:\/objem)?$/u,
      /^obsah balenia a povod$/u,
      /^obsah a povod$/u,
      /^objem(?: .*)?$/u,
      /^krajina (?:povodu|vyroby)$/u,
      /^nas tip$/u,
      /^vyzivove udaje(?: .*)?$/u,
      /^rozmer$/u,
      /^rozmery balenia$/u,
      /^zaruka$/u,
      /^appendix$/u,
    ],
  },
]

const PRODUCT_CONTENT_TEXT_LABEL_DEFINITIONS: ProductContentTextLabelDefinition[] =
  [
    {
      key: "usage",
      label: "Spôsob užívania a odporúčané dávkovanie",
      pattern: /Spôsob\s+užívania\s+a\s+o\s*dporúčané\s+dávkovanie\s*:/giu,
    },
    {
      key: "usage",
      label: "Spôsob užívania a odporúčané dávkovanie",
      pattern: /Spôsob\s+užívania\s+a\s+odporúčané\s+dávkovanie\s*:/giu,
    },
    {
      key: "usage",
      label: "Spôsob použitia a odporúčané dávkovanie",
      pattern: /Spôsob\s+použitia\s+a\s+odporúčané\s+dávkovanie\s*:/giu,
    },
    {
      key: "usage",
      label: "Spôsob použitia",
      pattern: /Spôsob\s+použitia\s*:/giu,
    },
    {
      key: "usage",
      label: "Spôsob užívania",
      pattern: /Spôsob\s+užívania\s*:/giu,
    },
    {
      key: "usage",
      label: "Odporúčané dávkovanie",
      pattern: /Odporúčané\s+dávkovanie\s*:/giu,
    },
    {
      key: "usage",
      label: "Dávkovanie",
      pattern: /Dávkovanie\s*:/giu,
    },
    {
      key: "usage",
      label: "Použitie",
      pattern: /Použitie\s*:/giu,
    },
    {
      key: "usage",
      label: "Vnútorné použitie",
      pattern: /Vnútorné\s+použitie\s*:/giu,
    },
    {
      key: "usage",
      label: "Vnútorné užívanie",
      pattern: /Vnútorné\s+užívanie\s*:/giu,
    },
    {
      key: "usage",
      label: "Vonkajšie použitie",
      pattern: /Vonkajšie\s+použitie\s*:/giu,
    },
    {
      key: "usage",
      label: "Na vonkajšie použitie",
      pattern: /Na\s+vonkajšie\s+použitie\s*:/giu,
    },
    {
      key: "warning",
      label: "Zdravotné upozornenia",
      pattern: /Zdravotné\s+upozornenia\s*:/giu,
    },
    {
      key: "warning",
      label: "Bezpečnostné upozornenia",
      pattern: /Bezpečnostné\s+upozornenia\s*:/giu,
    },
    {
      key: "warning",
      label: "Všeobecné upozornenia",
      pattern: /Všeobecné\s+upozornenia\s*:/giu,
    },
    {
      key: "warning",
      label: "Upozornenia",
      pattern: /Upozornenia\s*:/giu,
    },
    {
      key: "warning",
      label: "Upozornenie",
      pattern: /Upozornenie\s*:/giu,
    },
    {
      key: "composition",
      label: "Zloženie",
      pattern: /Zloženie(?:\s+\(INCI\))?\s*:/giu,
    },
    {
      key: "composition",
      label: "Ingrediencie",
      pattern: /Ingrediencie\s*:/giu,
    },
    {
      key: "composition",
      label: "Účinné látky",
      pattern: /Účinné\s+látky\s*:/giu,
    },
    {
      key: "composition",
      label: "Aktívne látky",
      pattern: /Aktívne\s+látky\s*:/giu,
    },
    {
      key: "other",
      label: "Výživové údaje na 100 g",
      pattern: /Výživové\s+údaje\s+na\s+100\s+g\s*:/giu,
    },
    {
      key: "other",
      label: "Výživové údaje",
      pattern: /Výživové\s+údaje\s*:/giu,
    },
    {
      key: "other",
      label: "Skladovanie",
      pattern: /Skladovanie\s*:/giu,
    },
    {
      key: "other",
      label: "Obsah balenia/Objem",
      pattern: /Obsah\s+balenia\/Objem\s*:/giu,
    },
    {
      key: "other",
      label: "Obsah balenia",
      pattern: /Obsah\s+balenia\s*:/giu,
    },
    {
      key: "other",
      label: "Krajina pôvodu",
      pattern: /Krajina\s+pôvodu\s*:/giu,
    },
    {
      key: "other",
      label: "Krajina výroby",
      pattern: /Krajina\s+výroby\s*:/giu,
    },
    {
      key: "other",
      label: "Objem",
      pattern: /Objem\s*:/giu,
    },
    {
      key: "other",
      label: "Obsah",
      pattern: /Obsah\s*:/giu,
    },
    {
      key: "other",
      label: "Rozmer",
      pattern: /Rozmer\s*:/giu,
    },
    {
      key: "other",
      label: "NÁŠ TIP",
      pattern: /NÁŠ\s+TIP\s*:/giu,
    },
  ]

const PRODUCT_CONTENT_BLOCK_REGEX =
  /<(?<tag>h[1-6]|p|div|ul|ol|table|blockquote)[^>]*>[\s\S]*?<\/\k<tag>>/giu
const HTML_TAG_REGEX = /<[a-z][\s\S]*?>/iu
const HEADING_TAG_REGEX = /^h[1-6]$/u
const ISO_DATE_REGEX = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u
const CATEGORY_PATH_LEADING_SEPARATOR_REGEX = /^>+\s*/u
const CATEGORY_PATH_TRAILING_SEPARATOR_REGEX = /\s*>+$/u
const START_OF_DAY_UTC = [0, 0, 0, 0] as const
const END_OF_DAY_UTC = [23, 59, 59, 999] as const

const stripHtmlTags = (value?: string): string | undefined => {
  if (value === undefined || value === "") {
    return undefined
  }
  const withoutTags = value.replaceAll(/<[^>]+>/gu, " ")
  return normalizeInlineText(withoutTags)
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const hasHtmlTags = (value: string): boolean => HTML_TAG_REGEX.test(value)

const normalizeComparableText = (value?: string): string | undefined => {
  const normalized = normalizeInlineText(value)
  if (normalized === undefined || normalized === "") {
    return undefined
  }
  return normalized
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase()
}

const trimHtmlFragment = (value?: string): string | undefined => {
  const normalized = normalizeText(value)
  if (normalized === undefined || normalized === "") {
    return undefined
  }
  const trimmed = normalized.replaceAll(/^\s+|\s+$/gu, "")
  return trimmed === "" ? undefined : trimmed
}

const dedupeHtmlFragments = (values: (string | undefined)[]): string[] => {
  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const fragment = trimHtmlFragment(value)
    if (fragment !== undefined && fragment !== "") {
      const fingerprint =
        normalizeInlineText(fragment.replaceAll(/>\s+</gu, "><")) ?? fragment
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint)
        result.push(fragment)
      }
    }
  }
  return result
}

const normalizeProductContentLabel = (value?: string): string | undefined => {
  const normalized = normalizeComparableText(value)
  if (normalized === undefined || normalized === "") {
    return undefined
  }
  const cleaned = normalized
    .replaceAll(/^[^a-z0-9]+/gu, "")
    .replaceAll(/\bo\s+dporucane\b/gu, "odporucane")
    .replaceAll(/[:-]+$/gu, "")
    .replaceAll(/\s+/gu, " ")
    .trim()
  return cleaned === "" ? undefined : cleaned
}

const classifyProductContentLabel = (
  label?: string,
): ProductContentSectionKey | undefined => {
  const normalizedLabel = normalizeProductContentLabel(label)
  if (normalizedLabel === undefined || normalizedLabel === "") {
    return undefined
  }
  for (const rule of PRODUCT_CONTENT_LABEL_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalizedLabel))) {
      return rule.key
    }
  }
  return undefined
}

const toHtmlFragment = (value?: string): string | undefined => {
  const normalized = normalizeText(value)
  if (normalized === undefined || normalized === "") {
    return undefined
  }
  if (hasHtmlTags(normalized)) {
    return normalized
  }
  return `<p>${escapeHtml(normalized)}</p>`
}

const buildLabeledHtmlFragment = (
  label: string,
  value?: string,
): string | undefined => {
  const normalized = normalizeText(value)
  if (normalized === undefined || normalized === "") {
    return undefined
  }
  if (hasHtmlTags(normalized)) {
    return `<h3>${escapeHtml(label)}</h3>\n${normalized}`
  }
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(normalized)}</p>`
}

const buildTextPropertyHtml = (property: ParsedParameter): string =>
  `<p><strong>${escapeHtml(property.name)}:</strong> ${escapeHtml(property.value)}</p>`

const buildPlainTextHtmlFragment = (value?: string): string | undefined => {
  const normalized = normalizeInlineText(value)
  if (normalized === undefined || normalized === "") {
    return undefined
  }
  return `<p>${escapeHtml(normalized)}</p>`
}

const buildLabeledPlainTextHtmlFragment = (
  label: string,
  value?: string,
): string | undefined => {
  const normalizedLabel = normalizeInlineText(label.replaceAll(/:\s*$/gu, ""))
  const normalizedValue = normalizeInlineText(value)
  if (normalizedLabel === undefined || normalizedLabel === "") {
    return undefined
  }
  const valueSuffix =
    normalizedValue === undefined || normalizedValue === ""
      ? ""
      : ` ${escapeHtml(normalizedValue)}`
  return `<p><strong>${escapeHtml(normalizedLabel)}:</strong>${valueSuffix}</p>`
}

const findProductContentTextAnchors = (
  text: string,
): ProductContentTextAnchor[] => {
  const anchors: ProductContentTextAnchor[] = []
  for (const definition of PRODUCT_CONTENT_TEXT_LABEL_DEFINITIONS) {
    const pattern = new RegExp(definition.pattern.source, "giu")
    for (const match of text.matchAll(pattern)) {
      const start = match.index
      const [matchedText] = match
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
  const sortedAnchors = anchors.toSorted((left, right) => {
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

const splitLabeledTextBlock = (
  blockHtml: string,
): {
  beforeHtml?: string | undefined
  sections: {
    key: ProductContentSectionKey
    html: string
  }[]
} => {
  const blockText = stripHtmlTags(blockHtml)
  if (blockText === undefined || blockText === "") {
    return { sections: [] }
  }
  const anchors = findProductContentTextAnchors(blockText)
  if (anchors.length === 0) {
    return { sections: [] }
  }
  const [firstAnchor] = anchors
  const beforeHtml = firstAnchor
    ? buildPlainTextHtmlFragment(blockText.slice(0, firstAnchor.start))
    : undefined
  const sections = anchors.flatMap((anchor, index) => {
    const nextAnchor = anchors[index + 1]
    const value = blockText.slice(anchor.end, nextAnchor?.start).trim()
    const html = buildLabeledPlainTextHtmlFragment(anchor.label, value)
    if (html === undefined || html === "") {
      return []
    }
    return [
      {
        html,
        key: anchor.key,
      },
    ]
  })
  return {
    beforeHtml,
    sections,
  }
}

const createProductContentGroups = (): ProductContentGroups => ({
  composition: [],
  description: [],
  other: [],
  usage: [],
  warning: [],
})

const appendSplitProductContentBlock = (
  grouped: ProductContentGroups,
  currentSection: ProductContentSectionKey,
  blockHtml: string,
): boolean => {
  const splitBlock = splitLabeledTextBlock(blockHtml)
  if (splitBlock.sections.length === 0) {
    return false
  }
  if (splitBlock.beforeHtml !== undefined && splitBlock.beforeHtml !== "") {
    grouped[currentSection].push(splitBlock.beforeHtml)
  }
  for (const section of splitBlock.sections) {
    grouped[section.key].push(section.html)
  }
  return true
}

const resolveHeadingContentSection = (
  grouped: ProductContentGroups,
  blockHtml: string,
): ProductContentSectionKey => {
  const sectionKey = classifyProductContentLabel(stripHtmlTags(blockHtml))
  if (sectionKey) {
    return sectionKey
  }
  grouped.description.push(blockHtml)
  return "description"
}

const appendDescriptionFallbackContent = (
  grouped: ProductContentGroups,
  descriptionHtml: string,
) => {
  if (appendSplitProductContentBlock(grouped, "description", descriptionHtml)) {
    return
  }
  grouped.description.push(descriptionHtml)
}

const buildProductDescriptionContentGroups = (
  descriptionHtml: string,
): ProductContentGroups => {
  const grouped = createProductContentGroups()
  let currentSection: ProductContentSectionKey = "description"
  let cursor = 0
  let hasBlock = false
  for (const match of descriptionHtml.matchAll(PRODUCT_CONTENT_BLOCK_REGEX)) {
    hasBlock = true
    const blockStart = match.index ?? 0
    const blockEnd = blockStart + match[0].length
    const beforeHtml = trimHtmlFragment(
      descriptionHtml.slice(cursor, blockStart),
    )
    if (beforeHtml !== undefined && beforeHtml !== "") {
      grouped[currentSection].push(beforeHtml)
    }
    const blockHtml = trimHtmlFragment(match[0])
    const tagName = match[1]?.toLowerCase()
    const hasInvalidBlock =
      blockHtml === undefined ||
      blockHtml === "" ||
      tagName === undefined ||
      tagName === ""
    if (!hasInvalidBlock) {
      if (HEADING_TAG_REGEX.test(tagName)) {
        currentSection = resolveHeadingContentSection(grouped, blockHtml)
      } else if (
        !appendSplitProductContentBlock(grouped, currentSection, blockHtml)
      ) {
        grouped[currentSection].push(blockHtml)
      }
    }
    cursor = blockEnd
  }
  if (!hasBlock) {
    appendDescriptionFallbackContent(grouped, descriptionHtml)
    return grouped
  }
  const remainingHtml = trimHtmlFragment(descriptionHtml.slice(cursor))
  if (remainingHtml !== undefined && remainingHtml !== "") {
    grouped[currentSection].push(remainingHtml)
  }
  return grouped
}

const buildProductContentSections = (
  item: ParsedShopItem,
): ProductContentSection[] => {
  const grouped: Record<ProductContentSectionKey, string[]> = {
    composition: [],
    description: [],
    other: [],
    usage: [],
    warning: [],
  }
  const shortDescriptionHtml = toHtmlFragment(item.shortDescription)
  if (shortDescriptionHtml !== undefined && shortDescriptionHtml !== "") {
    grouped.description.push(shortDescriptionHtml)
  }
  const descriptionHtml = toHtmlFragment(item.description)
  if (descriptionHtml !== undefined && descriptionHtml !== "") {
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
        .join("\n"),
    )
  }
  const appendixHtml = buildLabeledHtmlFragment("Appendix", item.appendix)
  if (appendixHtml !== undefined && appendixHtml !== "") {
    grouped.other.push(appendixHtml)
  }
  return PRODUCT_CONTENT_SECTION_ORDER.flatMap((sectionKey) => {
    const fragments = dedupeHtmlFragments(grouped[sectionKey])
    if (fragments.length === 0) {
      return []
    }
    return [
      {
        html: fragments.join("\n"),
        key: sectionKey,
        title: PRODUCT_CONTENT_SECTION_TITLES[sectionKey],
      },
    ]
  })
}

const countHtmlListItems = (value?: string): number => {
  const html = normalizeText(value)
  if (html === undefined || html === "") {
    return 0
  }
  return [...html.matchAll(/<li(?:\s[^>]*)?>/giu)].length
}

const buildProductCardCopyConfig = (
  contentSectionsMap: Record<ProductContentSectionKey, string>,
  shortDescription?: string,
): ProductCardCopyConfig => {
  const candidates: {
    source: ProductCardCopySource
    html?: string | undefined
  }[] = [
    {
      html: contentSectionsMap.description,
      source: "description",
    },
    {
      html: contentSectionsMap.usage,
      source: "usage",
    },
    {
      html: shortDescription,
      source: "short_description",
    },
  ]
  for (const candidate of candidates) {
    const liCount = countHtmlListItems(candidate.html)
    if (liCount > 0) {
      return {
        mode: "list_items",
        skip: liCount > 1 ? 1 : 0,
        source: candidate.source,
        take: 3,
      }
    }
  }
  for (const candidate of candidates) {
    if (
      normalizeText(candidate.html) !== undefined &&
      normalizeText(candidate.html) !== ""
    ) {
      return {
        mode: "sentences",
        skip: 0,
        source: candidate.source,
        take: 3,
      }
    }
  }
  return {
    mode: "sentences",
    skip: 0,
    source: "short_description",
    take: 3,
  }
}

const parseNumber = (value?: string): number | undefined => {
  const normalized = normalizeInlineText(value)
  if (normalized === undefined || normalized === "") {
    return undefined
  }
  const numberValue = Number(normalized.replace(",", "."))
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const parseInteger = (value?: string): number | undefined => {
  const numberValue = parseNumber(value)
  if (numberValue === undefined) {
    return undefined
  }
  return Math.trunc(numberValue)
}

const parseBoolean = (value?: string, fallback = false): boolean => {
  const normalized = normalizeInlineText(value)?.toLowerCase()
  if (normalized === undefined || normalized === "") {
    return fallback
  }
  return ["1", "true", "yes"].includes(normalized)
}

const normalizePriceAmount = (amount?: number): number | undefined => {
  if (
    amount === undefined ||
    Number.isNaN(amount) ||
    !Number.isFinite(amount)
  ) {
    return undefined
  }
  return Math.max(0, amount)
}

const parsePositiveIntegerEnv = (name: string): number | undefined => {
  const parsed = parseInteger(process.env[name])
  if (parsed === undefined || parsed <= 0) {
    return undefined
  }
  return parsed
}

const formatIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

const addUtcDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

const resolveSeedBuildOptions = (
  options?: SeedBuildOptions,
): ResolvedSeedBuildOptions => {
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
    promoRebaseDays,
    referenceDate: Number.isNaN(referenceDate.getTime())
      ? new Date()
      : referenceDate,
  }
}

const parseIsoDate = (value?: string, endOfDay = false): Date | undefined => {
  const normalized = normalizeInlineText(value)
  if (normalized === undefined || normalized === "") {
    return undefined
  }
  const [hours, minutes, seconds, milliseconds] = endOfDay
    ? END_OF_DAY_UTC
    : START_OF_DAY_UTC
  const dateMatch = ISO_DATE_REGEX.exec(normalized)
  if (dateMatch) {
    const [, year, month, day] = dateMatch
    const parsed = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        hours,
        minutes,
        seconds,
        milliseconds,
      ),
    )
    if (Number.isNaN(parsed.getTime())) {
      return undefined
    }
    return parsed
  }
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }
  parsed.setUTCHours(hours, minutes, seconds, milliseconds)
  return parsed
}

const isDateRangeActive = (
  validFrom?: string,
  validUntil?: string,
  referenceDate = new Date(),
): boolean => {
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

const resolveOfferBasePrice = (
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
): number | undefined =>
  normalizePriceAmount(
    offer.standardPrice ??
      offer.priceVat ??
      fallbackOffer?.standardPrice ??
      fallbackOffer?.priceVat,
  )

const resolveOfferActionPrice = (
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
  referenceDate = new Date(),
): number | undefined => {
  const actionPrice = normalizePriceAmount(
    offer.actionPrice ?? fallbackOffer?.actionPrice,
  )
  if (actionPrice === undefined) {
    return undefined
  }
  const actionPriceFrom =
    offer.actionPriceFrom ?? fallbackOffer?.actionPriceFrom
  const actionPriceUntil =
    offer.actionPriceUntil ?? fallbackOffer?.actionPriceUntil
  if (!isDateRangeActive(actionPriceFrom, actionPriceUntil, referenceDate)) {
    return undefined
  }
  return actionPrice
}

const resolveOfferHasActiveDiscount = (
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
  referenceDate = new Date(),
): boolean => {
  const basePrice = resolveOfferBasePrice(offer, fallbackOffer)
  const actionPrice = resolveOfferActionPrice(
    offer,
    fallbackOffer,
    referenceDate,
  )
  if (actionPrice === undefined) {
    return false
  }
  if (basePrice === undefined) {
    return false
  }
  return actionPrice < basePrice
}

const hasDiscountedActionPrice = (
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
): boolean => {
  const basePrice = resolveOfferBasePrice(offer, fallbackOffer)
  const actionPrice = normalizePriceAmount(
    offer.actionPrice ?? fallbackOffer?.actionPrice,
  )
  return (
    basePrice !== undefined &&
    actionPrice !== undefined &&
    actionPrice < basePrice
  )
}

const resolveOfferCurrentPrice = (
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
  referenceDate = new Date(),
): number => {
  const basePrice = resolveOfferBasePrice(offer, fallbackOffer)
  const actionPrice = resolveOfferActionPrice(
    offer,
    fallbackOffer,
    referenceDate,
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

const resolveOfferDefaultPrice = (
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
): number => resolveOfferBasePrice(offer, fallbackOffer) ?? 0

const priceAmountsEqual = (left?: number, right?: number): boolean => {
  if (left === undefined || right === undefined) {
    return left === right
  }
  return Math.abs(left - right) < 0.000001
}

const isDefaultPricelistTitle = (title?: string): boolean => {
  const comparable = normalizeComparableText(title)
  return (
    comparable !== undefined &&
    comparable !== "" &&
    DEFAULT_SHOPTET_PRICELIST_TITLES.has(comparable)
  )
}

const shouldImportActionPrice = (
  actionPrice?: number,
  validUntil?: string,
  referenceDate = new Date(),
): actionPrice is number => {
  if (actionPrice === undefined || actionPrice <= 0) {
    return false
  }
  const until = parseIsoDate(validUntil, true)
  return !until || referenceDate <= until
}

const serializePriceListDate = (
  value?: string,
  endOfDay = false,
): string | undefined => parseIsoDate(value, endOfDay)?.toISOString()

const buildSalePriceListTitle = (
  sourceTitle: string,
  startsAt?: string,
  endsAt?: string,
): string => {
  const hasWindow =
    (startsAt !== undefined && startsAt !== "") ||
    (endsAt !== undefined && endsAt !== "")
  const windowStart = startsAt ?? "open"
  const windowEnd = endsAt ?? "open"
  const windowLabel = hasWindow ? `${windowStart}_${windowEnd}` : "undated"
  return HERBATICA_SALE_PRICE_LIST_TITLE_TEMPLATE.replace(
    "{sourceTitle}",
    sourceTitle,
  ).replace("{windowLabel}", windowLabel)
}

const rebaseOfferPromotion = (
  offer: ParsedOfferData,
  buildOptions: ResolvedSeedBuildOptions,
  fallbackOffer?: ParsedOfferData,
): ParsedOfferData => {
  if (
    buildOptions.promoRebaseDays === undefined ||
    buildOptions.promoRebaseDays === 0
  ) {
    return offer
  }
  if (
    !hasDiscountedActionPrice(offer, fallbackOffer) ||
    resolveOfferHasActiveDiscount(
      offer,
      fallbackOffer,
      buildOptions.referenceDate,
    )
  ) {
    return offer
  }
  return {
    ...offer,
    actionPriceFrom: formatIsoDate(buildOptions.referenceDate),
    actionPriceUntil: formatIsoDate(
      addUtcDays(buildOptions.referenceDate, buildOptions.promoRebaseDays),
    ),
  }
}

const resolveFlagActive = (
  rawFlag: ParsedFlag,
  hasActiveDiscount: boolean,
  referenceDate: Date,
): boolean => {
  if (rawFlag.code?.toLowerCase() === "action" && hasActiveDiscount) {
    return true
  }
  if (typeof rawFlag.active === "boolean") {
    return rawFlag.active
  }
  if (
    (rawFlag.validFrom !== undefined && rawFlag.validFrom !== "") ||
    (rawFlag.validUntil !== undefined && rawFlag.validUntil !== "")
  ) {
    return isDateRangeActive(
      rawFlag.validFrom,
      rawFlag.validUntil,
      referenceDate,
    )
  }
  return false
}

const normalizeFlags = (
  flags: ParsedFlag[],
  topOffer: ParsedOfferData,
  referenceDate = new Date(),
): ParsedFlag[] => {
  const flagsByCode = new Map<string, ParsedFlag>()
  const hasActiveDiscount = resolveOfferHasActiveDiscount(
    topOffer,
    undefined,
    referenceDate,
  )
  for (const rawFlag of flags) {
    const code = normalizeInlineText(rawFlag.code)?.toLowerCase()
    if (code === undefined || code === "") {
      continue
    }
    flagsByCode.set(code, {
      active: resolveFlagActive(rawFlag, hasActiveDiscount, referenceDate),
      code,
      validFrom: normalizeInlineText(rawFlag.validFrom),
      validUntil: normalizeInlineText(rawFlag.validUntil),
    })
  }
  if (hasActiveDiscount && !flagsByCode.has("action")) {
    flagsByCode.set("action", {
      active: true,
      code: "action",
    })
  }
  return [...flagsByCode.values()]
}

const removeBlocks = (source: string, tags: readonly string[]): string => {
  let result = source
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}(\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, "gu")
    result = result.replace(regex, "")
  }
  return result
}

const dedupeStrings = (values: (string | undefined)[]): string[] => {
  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const normalized = normalizeText(value)
    if (normalized === undefined || normalized === "" || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

const dedupeParameters = (values: ParsedParameter[]): ParsedParameter[] => {
  const result: ParsedParameter[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const name = normalizeInlineText(value.name)
    const parsedValue = normalizeInlineText(value.value)
    if (
      name !== undefined &&
      name !== "" &&
      parsedValue !== undefined &&
      parsedValue !== ""
    ) {
      const key = `${name}::${parsedValue}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push({ name, value: parsedValue })
      }
    }
  }
  return result
}

const normalizeCategoryPath = (path: string): string =>
  path
    .replaceAll(/\s*>{2,}\s*/gu, " > ")
    .replaceAll(/\s*>\s*/gu, " > ")
    .replaceAll(/\s+/gu, " ")
    .trim()

const splitCategoryPath = (path: string): string[] =>
  normalizeCategoryPath(path)
    .split(" > ")
    .map((part) =>
      part
        .replace(CATEGORY_PATH_LEADING_SEPARATOR_REGEX, "")
        .replace(CATEGORY_PATH_TRAILING_SEPARATOR_REGEX, "")
        .trim(),
    )
    .filter((part) => part !== "")

const canonicalizeCategoryPath = (path: string): string =>
  splitCategoryPath(path).join(" > ")

const slugifyHerbaticaHandle = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-|-$/gu, "")
  return normalized
}

const truncateWithHash = (
  value: string,
  maxLength = MAX_HANDLE_LENGTH,
): string => {
  if (value.length <= maxLength) {
    return value
  }
  const hash = createHash("sha1").update(value).digest("hex").slice(0, 8)
  const keep = Math.max(1, maxLength - hash.length - 1)
  return `${value.slice(0, keep)}-${hash}`
}

const ensureUnique = (
  base: string,
  used: Set<string>,
  fallbackPrefix: string,
): string => {
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

const sanitizeSku = (value: string): string =>
  value
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toUpperCase()
    .replaceAll(/[^A-Z0-9._-]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-|-$/gu, "")

const buildSkuSeed = (
  parts: (string | undefined)[],
  fallback: string,
): string => {
  const normalized = parts
    .map((part) => sanitizeSku(part ?? ""))
    .filter((part) => part !== "")
  if (normalized.length > 0) {
    return normalized.join("-")
  }
  return sanitizeSku(fallback) || "SKU"
}

const normalizeInventoryQuantity = (quantity?: number): number => {
  if (quantity === undefined || Number.isNaN(quantity)) {
    return 0
  }
  return Math.max(0, Math.trunc(quantity))
}

const resolveWarehouseStockLocationName = (
  warehouse: ParsedStockWarehouse,
): {
  name: string
  usedFallback: boolean
} => {
  const name = normalizeInlineText(warehouse.name)
  if (name !== undefined && name !== "") {
    return {
      name,
      usedFallback: false,
    }
  }
  return {
    name: FALLBACK_SHOPTET_WAREHOUSE_NAME,
    usedFallback: true,
  }
}

const buildWarehouseStockLocationAddress = (
  location?: string,
): {
  city: string
  country_code: string
  address_1: string
} => {
  const address = normalizeInlineText(location)
  if (address === undefined || address === "") {
    return { ...FALLBACK_SHOPTET_WAREHOUSE_ADDRESS }
  }
  return {
    address_1: address,
    city: "Unknown",
    country_code: "SK",
  }
}

const buildOfferInventoryQuantities = (
  offer: ParsedOfferData,
): NonNullable<VariantSeedInput["quantities"]> => {
  if (offer.stockWarehouses.length === 0) {
    const quantity = normalizeInventoryQuantity(offer.stockAmountRaw)
    return {
      locations: [
        {
          quantity,
          stockLocationName: DEFAULT_STOCK_LOCATION_NAME,
        },
      ],
      quantity,
    }
  }
  return {
    locations: offer.stockWarehouses.map((warehouse) => ({
      quantity: normalizeInventoryQuantity(warehouse.quantity),
      stockLocationName: resolveWarehouseStockLocationName(warehouse).name,
    })),
  }
}

const parseParameters = (
  source: string,
  containerTag: string,
): ParsedParameter[] => {
  const container = extractFirstElementContent(source, containerTag)
  if (container === undefined || container === "") {
    return []
  }
  const parameters = extractElements(container, "PARAMETER").map(
    (parameter) => ({
      name: extractFirstText(parameter.inner, "NAME") ?? "",
      value: extractFirstText(parameter.inner, "VALUE") ?? "",
    }),
  )
  return dedupeParameters(parameters)
}

const parsePricelists = (source: string): ParsedPricelist[] => {
  const pricelistsRaw = extractFirstElementContent(source, "PRICELISTS")
  if (pricelistsRaw === undefined || pricelistsRaw === "") {
    return []
  }
  return extractElements(pricelistsRaw, "PRICELIST").map((pricelist) => ({
    actionPrice: parseNumber(extractFirstText(pricelist.inner, "ACTION_PRICE")),
    actionPriceFrom: extractFirstText(pricelist.inner, "ACTION_PRICE_FROM"),
    actionPriceUntil: extractFirstText(pricelist.inner, "ACTION_PRICE_UNTIL"),
    priceVat: parseNumber(extractFirstText(pricelist.inner, "PRICE_VAT")),
    purchasePrice: parseNumber(
      extractFirstText(pricelist.inner, "PURCHASE_PRICE"),
    ),
    standardPrice: parseNumber(
      extractFirstText(pricelist.inner, "STANDARD_PRICE"),
    ),
    title: extractFirstText(pricelist.inner, "TITLE"),
    vat: parseNumber(extractFirstText(pricelist.inner, "VAT")),
  }))
}

const stripNestedPricelists = (source: string): string =>
  source.replaceAll(/<PRICELISTS(?:\s[^>]*)?>[\s\S]*?<\/PRICELISTS>/gu, "")

const parseOssTaxRates = (source: string): ParsedOssTaxRate[] => {
  const ossRatesRaw = extractFirstElementContent(source, "OSS_TAX_RATES")
  if (ossRatesRaw === undefined || ossRatesRaw === "") {
    return []
  }
  return extractElements(ossRatesRaw, "OSS_TAX_RATE").map((rate) => ({
    country: extractFirstText(rate.inner, "TAX_COUNTRY"),
    level: extractFirstText(rate.inner, "TAX_RATE_LEVEL"),
  }))
}

const parseStockWarehouses = (stockRaw?: string): ParsedStockWarehouse[] => {
  const warehousesRaw = extractFirstElementContent(stockRaw ?? "", "WAREHOUSES")
  if (warehousesRaw === undefined || warehousesRaw === "") {
    return []
  }
  return extractElements(warehousesRaw, "WAREHOUSE").map((warehouse) => ({
    location: extractFirstText(warehouse.inner, "LOCATION"),
    name: extractFirstText(warehouse.inner, "NAME"),
    quantity: parseInteger(extractFirstText(warehouse.inner, "VALUE")),
  }))
}

const parseOfferData = (
  source: string,
  attributes?: Record<string, string>,
): ParsedOfferData => {
  const scalarSource = stripNestedPricelists(source)
  const stockRaw = extractFirstElementContent(scalarSource, "STOCK")
  const stockAmount = parseInteger(extractFirstText(stockRaw ?? "", "AMOUNT"))
  const stockWarehouses = parseStockWarehouses(stockRaw)
  const stockMinSupply = parseInteger(
    extractFirstText(scalarSource, "STOCK_MIN_SUPPLY"),
  )
  const logisticRaw = extractFirstElementContent(scalarSource, "LOGISTIC")
  const atypicalRaw = extractFirstElementContent(
    scalarSource,
    "ATYPICAL_PRODUCT",
  )
  const unitOfMeasureRaw = extractFirstElementContent(
    scalarSource,
    "UNIT_OF_MEASURE",
  )
  return {
    actionPrice: parseNumber(extractFirstText(scalarSource, "ACTION_PRICE")),
    actionPriceFrom: extractFirstText(scalarSource, "ACTION_PRICE_FROM"),
    actionPriceUntil: extractFirstText(scalarSource, "ACTION_PRICE_UNTIL"),
    applyDiscountCoupon: parseBoolean(
      extractFirstText(scalarSource, "APPLY_DISCOUNT_COUPON"),
      true,
    ),
    applyLoyaltyDiscount: parseBoolean(
      extractFirstText(scalarSource, "APPLY_LOYALTY_DISCOUNT"),
      true,
    ),
    applyQuantityDiscount: parseBoolean(
      extractFirstText(scalarSource, "APPLY_QUANTITY_DISCOUNT"),
      true,
    ),
    applyVolumeDiscount: parseBoolean(
      extractFirstText(scalarSource, "APPLY_VOLUME_DISCOUNT"),
      true,
    ),
    atypicalBilling: parseBoolean(
      extractFirstText(atypicalRaw ?? "", "ATYPICAL_BILLING"),
    ),
    atypicalShipping: parseBoolean(
      extractFirstText(atypicalRaw ?? "", "ATYPICAL_SHIPPING"),
    ),
    availabilityInStock: extractFirstText(
      scalarSource,
      "AVAILABILITY_IN_STOCK",
    ),
    availabilityOutOfStock: extractFirstText(
      scalarSource,
      "AVAILABILITY_OUT_OF_STOCK",
    ),
    code: extractFirstText(scalarSource, "CODE"),
    currency: extractFirstText(scalarSource, "CURRENCY"),
    decimalCount: parseInteger(extractFirstText(scalarSource, "DECIMAL_COUNT")),
    ean: extractFirstText(scalarSource, "EAN"),
    freeBilling: parseBoolean(extractFirstText(scalarSource, "FREE_BILLING")),
    freeShipping: parseBoolean(extractFirstText(scalarSource, "FREE_SHIPPING")),
    imageRef: extractFirstText(scalarSource, "IMAGE_REF"),
    measureAmount: parseNumber(
      extractFirstText(unitOfMeasureRaw ?? "", "MEASURE_AMOUNT"),
    ),
    measureAmountUnit: extractFirstText(
      unitOfMeasureRaw ?? "",
      "MEASURE_AMOUNT_UNIT",
    ),
    minPriceRatio: parseNumber(
      extractFirstText(scalarSource, "MIN_PRICE_RATIO"),
    ),
    negativeAmount: parseBoolean(
      extractFirstText(scalarSource, "NEGATIVE_AMOUNT"),
    ),
    ossTaxRates: parseOssTaxRates(source),
    packageAmount: parseNumber(
      extractFirstText(unitOfMeasureRaw ?? "", "PACKAGE_AMOUNT"),
    ),
    packageAmountUnit: extractFirstText(
      unitOfMeasureRaw ?? "",
      "PACKAGE_AMOUNT_UNIT",
    ),
    parameters: parseParameters(source, "PARAMETERS"),
    partNumber: extractFirstText(scalarSource, "PART_NUMBER"),
    plu: extractFirstText(scalarSource, "PLU"),
    priceRatio: parseNumber(extractFirstText(scalarSource, "PRICE_RATIO")),
    priceVat: parseNumber(extractFirstText(scalarSource, "PRICE_VAT")),
    pricelists: parsePricelists(source),
    productNumber: extractFirstText(scalarSource, "PRODUCT_NUMBER"),
    purchasePrice: parseNumber(
      extractFirstText(scalarSource, "PURCHASE_PRICE"),
    ),
    purchasePriceInclVat: parseBoolean(
      extractFirstText(scalarSource, "PURCHASE_PRICE_INCL_VAT"),
    ),
    purchaseVat: parseNumber(extractFirstText(scalarSource, "PURCHASE_VAT")),
    standardPrice: parseNumber(
      extractFirstText(scalarSource, "STANDARD_PRICE"),
    ),
    stockAmount,
    stockAmountRaw: stockAmount,
    stockLocation: extractFirstText(stockRaw ?? "", "LOCATION"),
    stockMaximalAmount: parseInteger(
      extractFirstText(stockRaw ?? "", "MAXIMAL_AMOUNT"),
    ),
    stockMinSupply,
    stockMinimalAmount: parseInteger(
      extractFirstText(stockRaw ?? "", "MINIMAL_AMOUNT"),
    ),
    stockWarehouses,
    unit: extractFirstText(scalarSource, "UNIT"),
    variantId: attributes?.["id"],
    vat: parseNumber(extractFirstText(scalarSource, "VAT")),
    visible: parseBoolean(extractFirstText(scalarSource, "VISIBLE"), true),
    weightKg: parseNumber(extractFirstText(logisticRaw ?? "", "WEIGHT")),
  }
}

const parseCodeList = (source: string, containerTag: string): string[] => {
  const container = extractFirstElementContent(source, containerTag)
  if (container === undefined || container === "") {
    return []
  }
  return dedupeStrings(
    extractElements(container, "CODE").map((entry) =>
      normalizeInlineText(entry.inner),
    ),
  )
}

const parseRelatedFiles = (source: string): ParsedRelatedFile[] => {
  const relatedFilesRaw = extractFirstElementContent(source, "RELATED_FILES")
  if (relatedFilesRaw === undefined || relatedFilesRaw === "") {
    return []
  }
  return extractElements(relatedFilesRaw, "RELATED_FILE").map((entry) => ({
    text: extractFirstText(entry.inner, "TEXT"),
    title: extractFirstText(entry.inner, "TITLE"),
    url: extractFirstText(entry.inner, "URL"),
  }))
}

const parseRelatedVideos = (source: string): ParsedRelatedVideo[] => {
  const relatedVideosRaw = extractFirstElementContent(source, "RELATED_VIDEOS")
  if (relatedVideosRaw === undefined || relatedVideosRaw === "") {
    return []
  }
  return extractElements(relatedVideosRaw, "RELATED_VIDEO").map((entry) => ({
    text: extractFirstText(entry.inner, "TEXT"),
    url: extractFirstText(entry.inner, "URL"),
    youtubeCode: extractFirstText(entry.inner, "YOUTUBE_VIDEO_CODE"),
  }))
}

const parseFlags = (source: string): ParsedFlag[] => {
  const flagsRaw = extractFirstElementContent(source, "FLAGS")
  if (flagsRaw === undefined || flagsRaw === "") {
    return []
  }
  return extractElements(flagsRaw, "FLAG").map((flag) => ({
    active: parseBoolean(extractFirstText(flag.inner, "ACTIVE")),
    code: extractFirstText(flag.inner, "CODE"),
    validFrom: extractFirstText(flag.inner, "VALID_FROM"),
    validUntil: extractFirstText(flag.inner, "VALID_UNTIL"),
  }))
}

const parseSetItems = (source: string): ParsedSetItem[] => {
  const setItemsRaw = extractFirstElementContent(source, "SET_ITEMS")
  if (setItemsRaw === undefined || setItemsRaw === "") {
    return []
  }
  return extractElements(setItemsRaw, "SET_ITEM").map((item) => ({
    amount: parseInteger(extractFirstText(item.inner, "AMOUNT")),
    code: extractFirstText(item.inner, "CODE"),
  }))
}

const parseTextProperties = (source: string): ParsedParameter[] => {
  const textPropertiesRaw = extractFirstElementContent(
    source,
    "TEXT_PROPERTIES",
  )
  if (textPropertiesRaw === undefined || textPropertiesRaw === "") {
    return []
  }
  const textProperties = extractElements(
    textPropertiesRaw,
    "TEXT_PROPERTY",
  ).map((property) => ({
    name: extractFirstText(property.inner, "NAME") ?? "",
    value: extractFirstText(property.inner, "VALUE") ?? "",
  }))
  return dedupeParameters(textProperties)
}

const parseImageUrls = (source: string): string[] => {
  const imagesRaw = extractFirstElementContent(source, "IMAGES")
  if (imagesRaw === undefined || imagesRaw === "") {
    return []
  }
  return dedupeStrings(
    extractElements(imagesRaw, "IMAGE").map((image) =>
      normalizeText(image.inner),
    ),
  )
}

const parseCategoryRefs = (source: string): ParsedCategoryRef[] => {
  const categoriesRaw = extractFirstElementContent(source, "CATEGORIES")
  if (categoriesRaw === undefined || categoriesRaw === "") {
    return []
  }
  const refs = [
    ...extractElements(categoriesRaw, "CATEGORY").map((category) => ({
      id: normalizeInlineText(category.attributes["id"]),
      isDefault: false,
      path: canonicalizeCategoryPath(normalizeInlineText(category.inner) ?? ""),
    })),
    ...extractElements(categoriesRaw, "DEFAULT_CATEGORY").map((category) => ({
      id: normalizeInlineText(category.attributes["id"]),
      isDefault: true,
      path: canonicalizeCategoryPath(normalizeInlineText(category.inner) ?? ""),
    })),
  ]
  const result: ParsedCategoryRef[] = []
  const seen = new Set<string>()
  for (const ref of refs) {
    if ((ref.id !== undefined && ref.id !== "") || ref.path !== "") {
      const key = `${ref.id ?? ""}::${ref.path}::${ref.isDefault ? "1" : "0"}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push(ref)
      }
    }
  }
  return result
}

const parseShopItems = (xml: string): ParsedShopItem[] =>
  extractElements(xml, "SHOPITEM").map((shopItem) => {
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
    const variants =
      variantsRaw === undefined || variantsRaw === ""
        ? []
        : extractElements(variantsRaw, "VARIANT").map((variant) =>
            parseOfferData(variant.inner, variant.attributes),
          )
    const images = dedupeStrings([
      ...parseImageUrls(shopItem.inner),
      ...variants.map((variant) => variant.imageRef),
      extractFirstText(topLevelSource, "IMAGE_REF"),
    ])
    const categoryRefs = parseCategoryRefs(shopItem.inner)
    return {
      adult: parseBoolean(extractFirstText(shopItem.inner, "ADULT")),
      allowsIplatba: parseBoolean(
        extractFirstText(shopItem.inner, "ALLOWS_IPLATBA"),
      ),
      allowsPayOnline: parseBoolean(
        extractFirstText(shopItem.inner, "ALLOWS_PAY_ONLINE"),
      ),
      alternativeProducts: parseCodeList(
        shopItem.inner,
        "ALTERNATIVE_PRODUCTS",
      ),
      appendix: extractFirstText(shopItem.inner, "APPENDIX"),
      categoryPaths: dedupeStrings(
        categoryRefs.map((category) => category.path),
      ),
      categoryRefs,
      description: extractFirstText(shopItem.inner, "DESCRIPTION"),
      flags: parseFlags(shopItem.inner),
      glamiCategoryId: extractFirstText(shopItem.inner, "GLAMI_CATEGORY_ID"),
      googleCategoryId: extractFirstText(shopItem.inner, "GOOGLE_CATEGORY_ID"),
      guid: extractFirstText(shopItem.inner, "GUID"),
      heurekaCategoryId: extractFirstText(
        shopItem.inner,
        "HEUREKA_CATEGORY_ID",
      ),
      id: shopItem.attributes["id"] ?? "",
      images,
      importCode: shopItem.attributes["import-code"],
      internalNote: extractFirstText(shopItem.inner, "INTERNAL_NOTE"),
      itemType: extractFirstText(shopItem.inner, "ITEM_TYPE"),
      manufacturer: extractFirstText(shopItem.inner, "MANUFACTURER"),
      metaDescription: extractFirstText(shopItem.inner, "META_DESCRIPTION"),
      name: extractFirstText(shopItem.inner, "NAME") ?? "",
      relatedFiles: parseRelatedFiles(shopItem.inner),
      relatedProducts: parseCodeList(shopItem.inner, "RELATED_PRODUCTS"),
      relatedVideos: parseRelatedVideos(shopItem.inner),
      seoTitle: extractFirstText(shopItem.inner, "SEO_TITLE"),
      setItems: parseSetItems(shopItem.inner),
      shortDescription: extractFirstText(shopItem.inner, "SHORT_DESCRIPTION"),
      supplier: extractFirstText(shopItem.inner, "SUPPLIER"),
      textProperties: parseTextProperties(shopItem.inner),
      topOffer: parseOfferData(topLevelSource, shopItem.attributes),
      variants,
      visibility: extractFirstText(shopItem.inner, "VISIBILITY"),
      warranty: extractFirstText(shopItem.inner, "WARRANTY"),
      xmlFeedName: extractFirstText(shopItem.inner, "XML_FEED_NAME"),
      zboziCategoryId: extractFirstText(shopItem.inner, "ZBOZI_CATEGORY_ID"),
    }
  })

const addCategoryPathNodes = (
  nodes: Map<string, CategoryNode>,
  rawPath: string,
) => {
  const segments = splitCategoryPath(rawPath)
  for (let index = 0; index < segments.length; index += 1) {
    const title = segments[index]
    if (title === undefined || title === "") {
      continue
    }
    const key = segments.slice(0, index + 1).join(" > ")
    const parentKey =
      index === 0 ? undefined : segments.slice(0, index).join(" > ")
    if (!nodes.has(key)) {
      nodes.set(key, {
        depth: index + 1,
        key,
        parentKey,
        title,
      })
    }
  }
}

const collectCategoryNodes = (items: ParsedShopItem[]): CategoryNode[] => {
  const nodes = new Map<string, CategoryNode>()
  for (const item of items) {
    for (const rawPath of item.categoryPaths) {
      addCategoryPathNodes(nodes, rawPath)
    }
  }
  return [...nodes.values()].toSorted((a, b) => {
    if (a.depth !== b.depth) {
      return a.depth - b.depth
    }
    return a.key.localeCompare(b.key)
  })
}

const buildCategoryHandleMaps = (
  sortedNodes: CategoryNode[],
): CategoryHandleMaps => {
  const usedHandles = new Set<string>()
  const keyToHandle = new Map<string, string>()
  const pathToHandle = new Map<string, string>()
  for (const node of sortedNodes) {
    const baseHandle = truncateWithHash(
      slugifyHerbaticaHandle(node.key) ||
        `category-${createHash("sha1").update(node.key).digest("hex").slice(0, 10)}`,
    )
    const handle = ensureUnique(baseHandle, usedHandles, "category")
    keyToHandle.set(node.key, handle)
    pathToHandle.set(node.key, handle)
  }
  return {
    keyToHandle,
    pathToHandle,
  }
}

const buildCategorySeedInputs = (
  sortedNodes: CategoryNode[],
  keyToHandle: Map<string, string>,
): CategorySeedInput[] =>
  sortedNodes.map((node) => {
    const handle = keyToHandle.get(node.key)
    const parentHandle =
      node.parentKey === undefined || node.parentKey === ""
        ? undefined
        : keyToHandle.get(node.parentKey)
    return {
      description: "Imported from Herbatica XML feed.",
      name: node.title,
      ...(handle === undefined || handle === "" ? {} : { handle }),
      isActive: true,
      ...(parentHandle === undefined || parentHandle === ""
        ? {}
        : { parentHandle }),
    }
  })

const buildCategoriesFromProductPaths = (
  items: ParsedShopItem[],
): CategoryBuildResult => {
  const sortedNodes = collectCategoryNodes(items)
  const { keyToHandle, pathToHandle } = buildCategoryHandleMaps(sortedNodes)
  return {
    categories: buildCategorySeedInputs(sortedNodes, keyToHandle),
    categoryIdToHandle: new Map<string, string>(),
    pathToHandle,
  }
}

const buildCategoryExportPathIndex = (
  categories: HerbaticaCategoryExport[],
): Map<string, string> => {
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  )
  const pathById = new Map<string, string>()
  const visiting = new Set<string>()
  const resolvePath = (categoryId: string): string => {
    const existingPath = pathById.get(categoryId)
    if (existingPath !== undefined && existingPath !== "") {
      return existingPath
    }
    const category = categoryById.get(categoryId)
    if (!category) {
      return ""
    }
    if (visiting.has(categoryId)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Detected circular category ancestry for ${categoryId}`,
      )
    }
    visiting.add(categoryId)
    const title = normalizeInlineText(category.title) ?? categoryId
    const parentPath =
      category.parentId === undefined || category.parentId === ""
        ? ""
        : resolvePath(category.parentId)
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

const buildCategoryMetadata = (
  category: HerbaticaCategoryExport,
  path: string,
): NonNullable<CategorySeedInput["metadata"]> => ({
  access: category.access,
  bottom_description_html: category.bottomDescriptionHtml,
  expand_in_menu: category.expandInMenu,
  is_system: category.isSystem,
  link_text: category.linkText,
  meta_description: category.metaDescription,
  meta_title: category.metaTitle,
  page_type: category.pageType,
  priority: category.priority,
  search_priority: category.searchPriority,
  source: "herbatica-categories-xml",
  source_category_id: category.id,
  source_guid: category.guid,
  source_parent_category_id: category.parentId,
  source_path: path,
  source_url: category.url,
  top_description_html: category.topDescriptionHtml,
  visible: category.isVisible,
})

const buildCategoriesFromExport = (
  categoryExports: HerbaticaCategoryExport[],
): CategoryBuildResult => {
  const pathById = buildCategoryExportPathIndex(categoryExports)
  const sortedCategories = [...categoryExports]
    .map((category) => {
      const path = pathById.get(category.id)
      if (path === undefined || path === "") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Missing resolved path for category ${category.id}`,
        )
      }
      return {
        category,
        depth: splitCategoryPath(path).length,
        path,
      }
    })
    .toSorted((a, b) => {
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
      slugifyHerbaticaHandle(node.path) ||
        `category-${createHash("sha1").update(node.path).digest("hex").slice(0, 10)}`,
    )
    const handle = ensureUnique(baseHandle, usedHandles, "category")
    pathToHandle.set(node.path, handle)
    categoryIdToHandle.set(node.category.id, handle)
  }
  const categories: CategorySeedInput[] = sortedCategories.map((node) => {
    const handle = categoryIdToHandle.get(node.category.id)
    const parentHandle =
      node.category.parentId === undefined || node.category.parentId === ""
        ? undefined
        : categoryIdToHandle.get(node.category.parentId)
    return {
      description:
        excerptPlainText(node.category.topDescriptionHtml) ??
        excerptPlainText(node.category.bottomDescriptionHtml) ??
        "Imported from Herbatica category export.",
      name: node.category.title,
      ...(handle === undefined || handle === "" ? {} : { handle }),
      isActive: node.category.isVisible,
      ...(parentHandle === undefined || parentHandle === ""
        ? {}
        : { parentHandle }),
      metadata: buildCategoryMetadata(node.category, node.path),
      ...(node.category.priority === undefined
        ? {}
        : { rank: node.category.priority }),
      isInternal: node.category.isSystem,
    }
  })
  return {
    categories,
    categoryIdToHandle,
    pathToHandle,
  }
}

export const normalizeHerbaticaManufacturerTitle = (
  value?: string | null,
): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined
  }
  return normalizeInlineText(decodeXml(value))
}

const buildBrand = (
  item: ParsedShopItem,
  manufacturersLookup: ManufacturerCsvLookup,
): BrandSeedInput | undefined => {
  const title = normalizeHerbaticaManufacturerTitle(item.manufacturer)
  if (title === undefined || title === "") {
    return undefined
  }
  const manufacturerRow = findManufacturerCsvRow(manufacturersLookup, title)
  return {
    attributes: [],
    gpsr_contact_email: manufacturerRow?.gpsr_contact_email,
    gpsr_european_reseller_contact_email:
      manufacturerRow?.gpsr_european_reseller_contact_email,
    gpsr_european_reseller_manufacturing_company_name:
      manufacturerRow?.gpsr_european_reseller_manufacturing_company_name,
    gpsr_european_reseller_postal_address:
      manufacturerRow?.gpsr_european_reseller_postal_address,
    gpsr_manufactured_outside_eu: manufacturerRow?.gpsr_manufactured_outside_eu,
    gpsr_manufacturing_company_name:
      manufacturerRow?.gpsr_manufacturing_company_name,
    gpsr_postal_address: manufacturerRow?.gpsr_postal_address,
    title,
  }
}

const applyPromoOverrides = (
  items: ParsedShopItem[],
  buildOptions: ResolvedSeedBuildOptions,
): ParsedShopItem[] => {
  if (
    buildOptions.promoRebaseDays === undefined ||
    buildOptions.promoRebaseDays === 0
  ) {
    return items
  }
  return items.map((item) => {
    const topOffer = rebaseOfferPromotion(item.topOffer, buildOptions)
    const variants = item.variants.map((variant) =>
      rebaseOfferPromotion(variant, buildOptions, topOffer),
    )
    return {
      ...item,
      topOffer,
      variants,
    }
  })
}

export const resolveHerbaticaProductVisibility = (item: {
  topOffer: {
    visible?: boolean | undefined
  }
  visibility?: string | undefined
}): {
  salesChannelNames: string[]
  status: ProductStatus
  storefrontAccessible: boolean
} => {
  if (item.topOffer.visible === false) {
    return {
      salesChannelNames: [],
      status: ProductStatus.DRAFT,
      storefrontAccessible: false,
    }
  }
  switch ((item.visibility ?? "visible").trim().toLowerCase()) {
    case "cashdeskonly": {
      return {
        salesChannelNames: [HERBATICA_POS_SALES_CHANNEL_NAME],
        status: ProductStatus.PUBLISHED,
        storefrontAccessible: false,
      }
    }
    case "hidden": {
      return {
        salesChannelNames: [],
        status: ProductStatus.DRAFT,
        storefrontAccessible: false,
      }
    }
    case "visible": {
      return {
        salesChannelNames: [HERBATICA_STOREFRONT_SALES_CHANNEL_NAME],
        status: ProductStatus.PUBLISHED,
        storefrontAccessible: true,
      }
    }
    default: {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unsupported Herbatica product visibility "${item.visibility}"`,
      )
    }
  }
}

const buildHerbaticaProductAttributes = (
  item: ParsedShopItem,
): NonNullable<ProductSeedInput["productAttributes"]> => [
  {
    input_type: "select",
    is_public: false,
    key: "supplier",
    label: "Supplier",
    option:
      item.supplier === undefined || item.supplier === ""
        ? null
        : { label: item.supplier },
  },
  {
    input_type: "select",
    is_public: true,
    key: "warranty",
    label: "Warranty",
    option:
      item.warranty === undefined || item.warranty === ""
        ? null
        : { label: item.warranty },
  },
]

const resolveProductReference = (
  code: string,
  productHandleBySourceId: Map<string, string>,
  publishedSourceIds: Set<string>,
): ResolvedProductReference | undefined => {
  const sourceShopitemId = normalizeInlineText(code)
  if (
    !(
      sourceShopitemId !== undefined &&
      sourceShopitemId !== "" &&
      publishedSourceIds.has(sourceShopitemId)
    )
  ) {
    return undefined
  }
  const handle = productHandleBySourceId.get(sourceShopitemId)
  if (handle === undefined || handle === "") {
    return undefined
  }
  return {
    handle,
    source_shopitem_id: sourceShopitemId,
  }
}

const resolveProductReferences = (
  codes: string[],
  productHandleBySourceId: Map<string, string>,
  publishedSourceIds: Set<string>,
  excludedSourceId?: string,
): ResolvedProductReference[] => {
  const refs: ResolvedProductReference[] = []
  const seen = new Set<string>()
  for (const code of codes) {
    const ref = resolveProductReference(
      code,
      productHandleBySourceId,
      publishedSourceIds,
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

const buildResolvedProductReferences = (
  item: ParsedShopItem,
  productHandleBySourceId: Map<string, string>,
  publishedSourceIds: Set<string>,
): ResolvedProductReferences => {
  const relatedProductRefs = resolveProductReferences(
    item.relatedProducts,
    productHandleBySourceId,
    publishedSourceIds,
    item.id,
  )
  const alternativeProductRefs = resolveProductReferences(
    item.alternativeProducts,
    productHandleBySourceId,
    publishedSourceIds,
    item.id,
  )
  return {
    alternativeProductHandles: alternativeProductRefs.map((ref) => ref.handle),
    alternativeProductRefs,
    relatedProductHandles: relatedProductRefs.map((ref) => ref.handle),
    relatedProductRefs,
  }
}

const buildVariantMetadata = (
  offer: ParsedOfferData,
  fallbackOffer?: ParsedOfferData,
  referenceDate = new Date(),
): NonNullable<VariantSeedInput["metadata"]> => {
  const basePrice = resolveOfferBasePrice(offer, fallbackOffer)
  const hasActiveDiscount = resolveOfferHasActiveDiscount(
    offer,
    fallbackOffer,
    referenceDate,
  )
  const currentPrice = resolveOfferCurrentPrice(
    offer,
    fallbackOffer,
    referenceDate,
  )
  const compareAtPrice = hasActiveDiscount ? basePrice : undefined
  return {
    action_price: offer.actionPrice,
    action_price_from: offer.actionPriceFrom,
    action_price_until: offer.actionPriceUntil,
    apply_discount_coupon: offer.applyDiscountCoupon,
    apply_loyalty_discount: offer.applyLoyaltyDiscount,
    apply_quantity_discount: offer.applyQuantityDiscount,
    apply_volume_discount: offer.applyVolumeDiscount,
    atypical_billing: offer.atypicalBilling,
    atypical_shipping: offer.atypicalShipping,
    availability_in_stock: offer.availabilityInStock,
    availability_out_of_stock: offer.availabilityOutOfStock,
    code: offer.code,
    compare_at_price: compareAtPrice,
    currency: offer.currency,
    current_price: currentPrice,
    decimal_count: offer.decimalCount,
    ean: offer.ean,
    free_billing: offer.freeBilling,
    free_shipping: offer.freeShipping,
    has_active_discount: hasActiveDiscount,
    image_ref: offer.imageRef,
    measure_amount: offer.measureAmount,
    measure_amount_unit: offer.measureAmountUnit,
    min_price_ratio: offer.minPriceRatio,
    negative_amount: offer.negativeAmount,
    oss_tax_rates: offer.ossTaxRates,
    package_amount: offer.packageAmount,
    package_amount_unit: offer.packageAmountUnit,
    parameters: offer.parameters,
    part_number: offer.partNumber,
    plu: offer.plu,
    price_ratio: offer.priceRatio,
    price_vat: offer.priceVat,
    pricelists: offer.pricelists,
    product_number: offer.productNumber,
    purchase_price: offer.purchasePrice,
    purchase_price_incl_vat: offer.purchasePriceInclVat,
    purchase_vat: offer.purchaseVat,
    source_variant_id: offer.variantId,
    standard_price: offer.standardPrice,
    stock: {
      amount: offer.stockAmountRaw,
      location: offer.stockLocation,
      maximal_amount: offer.stockMaximalAmount,
      min_supply: offer.stockMinSupply,
      minimal_amount: offer.stockMinimalAmount,
      warehouses: offer.stockWarehouses.map((warehouse) => ({
        location: warehouse.location,
        name: warehouse.name,
        value: warehouse.quantity,
      })),
    },
    unit: offer.unit,
    variant_id: offer.variantId,
    vat: offer.vat,
    visible: offer.visible,
    weight_kg: offer.weightKg,
  }
}

const buildProductMetadata = ({
  item,
  topOffer,
  categoryPaths,
  categoryRefs,
  resolvedProductReferences,
  referenceDate = new Date(),
}: BuildProductMetadataOptions): NonNullable<ProductSeedInput["metadata"]> => {
  const normalizedFlags = normalizeFlags(item.flags, topOffer, referenceDate)
  const sourceCategoryIds = dedupeStrings(
    categoryRefs.map((categoryRef) => categoryRef.id),
  )
  const defaultCategoryRef = categoryRefs.find(
    (categoryRef) => categoryRef.isDefault,
  )
  const contentSections = buildProductContentSections(item)
  const contentSectionsMap: Record<ProductContentSectionKey, string> = {
    composition: "",
    description: "",
    other: "",
    usage: "",
    warning: "",
  }
  for (const section of contentSections) {
    contentSectionsMap[section.key] = section.html
  }
  const completeContentSections = PRODUCT_CONTENT_SECTION_ORDER.map(
    (sectionKey) => ({
      html: contentSectionsMap[sectionKey],
      key: sectionKey,
      title: PRODUCT_CONTENT_SECTION_TITLES[sectionKey],
    }),
  )
  const cardCopy = buildProductCardCopyConfig(
    contentSectionsMap,
    item.shortDescription,
  )
  return {
    adult: item.adult,
    allows_iplatba: item.allowsIplatba,
    allows_pay_online: item.allowsPayOnline,
    alternative_product_handles:
      resolvedProductReferences.alternativeProductHandles,
    alternative_product_refs: resolvedProductReferences.alternativeProductRefs,
    alternative_products: item.alternativeProducts,
    appendix: item.appendix,
    card_copy: cardCopy,
    category_paths: categoryPaths,
    category_refs: categoryRefs.map((categoryRef) => ({
      id: categoryRef.id,
      is_default: categoryRef.isDefault,
      path: categoryRef.path,
    })),
    content_sections: completeContentSections,
    content_sections_map: contentSectionsMap,
    flags: normalizedFlags,
    flags_raw: item.flags,
    internal_note: item.internalNote,
    item_type: item.itemType,
    market_category_ids: {
      glami: item.glamiCategoryId,
      google: item.googleCategoryId,
      heureka: item.heurekaCategoryId,
      zbozi: item.zboziCategoryId,
    },
    meta_description: item.metaDescription,
    related_files: item.relatedFiles,
    related_product_handles: resolvedProductReferences.relatedProductHandles,
    related_product_refs: resolvedProductReferences.relatedProductRefs,
    related_products: item.relatedProducts,
    related_videos: item.relatedVideos,
    seo_title: item.seoTitle,
    set_items: item.setItems,
    short_description: item.shortDescription,
    source: "herbatica-products-complete-xml",
    source_category_ids: sourceCategoryIds,
    source_default_category_id: defaultCategoryRef?.id,
    source_default_category_path: defaultCategoryRef?.path,
    source_guid: item.guid,
    source_import_code: item.importCode,
    source_shopitem_id: item.id,
    text_properties: item.textProperties,
    top_offer: buildVariantMetadata(topOffer, undefined, referenceDate),
    xml_feed_name: item.xmlFeedName,
  }
}

const normalizeMeasurementSourceUnit = (value?: string) =>
  normalizeInlineText(value)

const getMeasurementConfigurationKey = (
  measurement: NonNullable<ProductSeedInput["measurement"]>,
) =>
  `${measurement.unit.symbol.toLowerCase()}:${measurement.unit.base_quantity}`

export const resolveHerbaticaOfferMeasurement = (
  offer: HerbaticaOfferMeasurementSource,
  sourceLabel: string,
): {
  product: NonNullable<ProductSeedInput["measurement"]>
  variant: NonNullable<VariantSeedInput["measurement"]>
} | null => {
  const packageUnit = normalizeMeasurementSourceUnit(offer.packageAmountUnit)
  const measureUnit = normalizeMeasurementSourceUnit(offer.measureAmountUnit)
  const values = [
    offer.packageAmount,
    packageUnit,
    offer.measureAmount,
    measureUnit,
  ]
  const populatedCount = values.filter(
    (value) => value !== undefined && value !== null,
  ).length
  if (populatedCount === 0) {
    return null
  }
  if (populatedCount !== values.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Incomplete UNIT_OF_MEASURE configuration for ${sourceLabel}`,
    )
  }
  const { measureAmount, packageAmount } = offer
  if (measureAmount === undefined || packageAmount === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Incomplete UNIT_OF_MEASURE amounts for ${sourceLabel}`,
    )
  }
  if (
    !(
      Number.isFinite(packageAmount) &&
      packageAmount > 0 &&
      Number.isFinite(measureAmount) &&
      measureAmount > 0
    )
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `UNIT_OF_MEASURE amounts must be positive for ${sourceLabel}`,
    )
  }
  if (packageUnit?.toLowerCase() !== measureUnit?.toLowerCase()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `UNIT_OF_MEASURE package unit "${packageUnit}" does not match comparison unit "${measureUnit}" for ${sourceLabel}`,
    )
  }
  if (measureUnit === undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Missing UNIT_OF_MEASURE unit for ${sourceLabel}`,
    )
  }
  const symbol = measureUnit
  return {
    product: {
      unit: {
        base_quantity: measureAmount,
        code: normalizeUnitCode(`${symbol}_${measureAmount}`),
        name: symbol,
        symbol,
      },
    },
    variant: {
      product_unit_quantity: packageAmount,
    },
  }
}

const resolveHerbaticaProductMeasurement = (item: ParsedShopItem) => {
  const offers = item.variants.length ? item.variants : [item.topOffer]
  const configured = offers.flatMap((offer, index) => {
    const sourceLabel = item.variants.length
      ? `Product "${item.id}" Variant "${offer.variantId ?? index + 1}"`
      : `Product "${item.id}"`
    const offerMeasurement = resolveHerbaticaOfferMeasurement(
      offer,
      sourceLabel,
    )
    return offerMeasurement ? [offerMeasurement.product] : []
  })
  const [measurement] = configured
  if (!measurement) {
    return null
  }
  const expectedKey = getMeasurementConfigurationKey(measurement)
  const conflicting = configured.find(
    (current) => getMeasurementConfigurationKey(current) !== expectedKey,
  )
  if (conflicting) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product "${item.id}" contains conflicting UNIT_OF_MEASURE comparison configurations`,
    )
  }
  return measurement
}

const buildDefaultVariantForProduct = ({
  handle,
  item,
  referenceDate,
  usedSkus,
}: BuildVariantsForProductOptions & {
  referenceDate: Date
}): {
  options: ProductOptionSeedInput[]
  variants: VariantSeedInput[]
} => {
  const { topOffer } = item
  const skuSeed = buildSkuSeed(
    ["SHOPITEM", item.id, topOffer.variantId ?? "DEFAULT"],
    `${handle}-DEFAULT`,
  )
  const sku = ensureUnique(skuSeed, usedSkus, `${handle}-DEFAULT`)
  const ean = normalizeInlineText(topOffer.ean)
  const amount = resolveOfferDefaultPrice(topOffer)
  const currencyCode = (topOffer.currency ?? "EUR").toLowerCase()
  const quantities = buildOfferInventoryQuantities(topOffer)
  const thumbnail = topOffer.imageRef
  const measurement = resolveHerbaticaOfferMeasurement(
    topOffer,
    `Product "${item.id}"`,
  )
  return {
    options: [
      {
        title: DEFAULT_OPTION_TITLE,
        values: [DEFAULT_OPTION_VALUE],
      },
    ],
    variants: [
      {
        ...(ean === undefined || ean === "" ? {} : { ean }),
        ...(thumbnail === undefined || thumbnail === ""
          ? {}
          : { images: [{ url: thumbnail }], thumbnail }),
        measurement: measurement?.variant ?? null,
        metadata: buildVariantMetadata(topOffer, undefined, referenceDate),
        options: {
          [DEFAULT_OPTION_TITLE]: DEFAULT_OPTION_VALUE,
        },
        prices: [
          {
            amount,
            currency_code: currencyCode,
          },
        ],
        quantities,
        sku,
        title: DEFAULT_OPTION_VALUE,
      },
    ],
  }
}

const completeVariantOptions = (
  optionsForVariant: Map<string, string>,
  optionNames: string[],
): Record<string, string> => {
  for (const optionName of optionNames) {
    if (!optionsForVariant.has(optionName)) {
      optionsForVariant.set(optionName, DEFAULT_OPTION_VALUE)
    }
  }
  return Object.fromEntries(optionsForVariant.entries())
}

const buildVariantSeed = ({
  handle,
  index,
  item,
  optionNames,
  optionsForVariant,
  referenceDate,
  usedSkus,
  variant,
}: BuildVariantSeedOptions): VariantSeedInput => {
  const optionObject = completeVariantOptions(optionsForVariant, optionNames)
  const optionTitle = optionNames
    .map((optionName) => optionObject[optionName])
    .join(" / ")
  const codeTitle = normalizeInlineText(variant.code)
  const title =
    (optionTitle === "" ? undefined : optionTitle) ??
    codeTitle ??
    `${DEFAULT_OPTION_VALUE} ${index + 1}`
  const skuSeed = buildSkuSeed(
    ["SHOPITEM", item.id, "VARIANT", variant.variantId ?? `${index + 1}`],
    `${handle}-${index + 1}`,
  )
  const sku = ensureUnique(skuSeed, usedSkus, `${handle}-${index + 1}`)
  const currencyCode = (
    variant.currency ??
    item.topOffer.currency ??
    "EUR"
  ).toLowerCase()
  const amount = resolveOfferDefaultPrice(variant, item.topOffer)
  const quantities = buildOfferInventoryQuantities(variant)
  const thumbnail = variant.imageRef
  const ean = normalizeInlineText(variant.ean)
  const measurement = resolveHerbaticaOfferMeasurement(
    variant,
    `Product "${item.id}" Variant "${variant.variantId ?? index + 1}"`,
  )
  return {
    ...(ean === undefined || ean === "" ? {} : { ean }),
    ...(thumbnail === undefined || thumbnail === ""
      ? {}
      : { images: [{ url: thumbnail }], thumbnail }),
    measurement: measurement?.variant ?? null,
    metadata: buildVariantMetadata(variant, item.topOffer, referenceDate),
    options: optionObject,
    prices: [
      {
        amount: amount ?? 0,
        currency_code: currencyCode,
      },
    ],
    quantities,
    sku,
    title,
  }
}

const buildVariantsForProduct = ({
  item,
  handle,
  usedSkus,
  referenceDate = new Date(),
}: BuildVariantsForProductOptions): {
  options: ProductOptionSeedInput[]
  variants: VariantSeedInput[]
} => {
  if (item.variants.length === 0) {
    return buildDefaultVariantForProduct({
      handle,
      item,
      referenceDate,
      usedSkus,
    })
  }
  const optionValues = new Map<string, Set<string>>()
  const rawVariantOptions = item.variants.map((variant, index) => {
    const valuesByName = new Map<string, string>()
    for (const parameter of variant.parameters) {
      const name = normalizeInlineText(parameter.name)
      const value = normalizeInlineText(parameter.value)
      if (
        name === undefined ||
        name === "" ||
        value === undefined ||
        value === ""
      ) {
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
  const variants: VariantSeedInput[] = item.variants.map((variant, index) =>
    buildVariantSeed({
      handle,
      index,
      item,
      optionNames,
      optionsForVariant: rawVariantOptions[index] ?? new Map<string, string>(),
      referenceDate,
      usedSkus,
      variant,
    }),
  )
  return {
    options,
    variants,
  }
}

const buildProducts = (params: {
  items: ParsedShopItem[]
  pathToHandle: Map<string, string>
  categoryIdToHandle: Map<string, string>
  manufacturersLookup: ManufacturerCsvLookup
  buildOptions: ResolvedSeedBuildOptions
}): ProductSeedInput[] => {
  const {
    items,
    pathToHandle,
    categoryIdToHandle,
    manufacturersLookup,
    buildOptions,
  } = params
  const usedHandles = new Set<string>()
  const usedSkus = new Set<string>()
  const productEntries = items.map((item, index) => {
    const stableHandleSource = item.id
      ? `shopitem-${item.id}`
      : `${item.name}-${index + 1}`
    const handleSeed = truncateWithHash(
      slugifyHerbaticaHandle(stableHandleSource) || `product-${index + 1}`,
    )
    const handle = ensureUnique(handleSeed, usedHandles, `product-${index + 1}`)
    return {
      handle,
      index,
      item,
    }
  })
  const productHandleBySourceId = new Map<string, string>()
  const publishedSourceIds = new Set<string>()
  for (const { item, handle } of productEntries) {
    if (!item.id) {
      continue
    }
    productHandleBySourceId.set(item.id, handle)
    if (resolveHerbaticaProductVisibility(item).storefrontAccessible) {
      publishedSourceIds.add(item.id)
    }
  }
  return productEntries.map(({ item, index, handle }) => {
    const categoryHandles = dedupeStrings(
      item.categoryRefs.map((categoryRef) => {
        if (categoryRef.id !== undefined && categoryRef.id !== "") {
          const categoryHandle = categoryIdToHandle.get(categoryRef.id)
          if (categoryHandle !== undefined && categoryHandle !== "") {
            return categoryHandle
          }
        }
        return pathToHandle.get(categoryRef.path)
      }),
    )
    const categories = categoryHandles.map((categoryHandle) => ({
      handle: categoryHandle,
    }))
    const primaryWeightKg =
      item.topOffer.weightKg ??
      item.variants.find((variant) => variant.weightKg !== undefined)?.weightKg
    const weight =
      primaryWeightKg === undefined
        ? 1
        : Math.max(1, Math.round(primaryWeightKg * 1000))
    const visibility = resolveHerbaticaProductVisibility(item)
    const resolvedProductReferences = buildResolvedProductReferences(
      item,
      productHandleBySourceId,
      publishedSourceIds,
    )
    const { options, variants } = buildVariantsForProduct({
      handle,
      item,
      referenceDate: buildOptions.referenceDate,
      usedSkus,
    })
    const thumbnail = item.images[0] ?? item.topOffer.imageRef
    const imageUrls = dedupeStrings([...item.images, thumbnail])
    return {
      brand: buildBrand(item, manufacturersLookup),
      categories,
      description: item.description ?? item.shortDescription ?? "",
      handle,
      images: imageUrls.map((url) => ({ url })),
      measurement: resolveHerbaticaProductMeasurement(item),
      metadata: buildProductMetadata({
        categoryPaths: item.categoryPaths,
        categoryRefs: item.categoryRefs,
        item,
        referenceDate: buildOptions.referenceDate,
        resolvedProductReferences,
        topOffer: item.topOffer,
      }),
      options,
      productAttributes: buildHerbaticaProductAttributes(item),
      salesChannelNames: visibility.salesChannelNames,
      shippingProfileName: "Default Shipping Profile",
      status: visibility.status,
      ...(thumbnail === undefined || thumbnail === "" ? {} : { thumbnail }),
      title: item.name || `Product ${item.id || index + 1}`,
      variants,
      weight,
    }
  })
}

const getVariantBasePrice = (
  variant: VariantSeedInput,
): PriceListPriceSeedInput | undefined => {
  const [price] = variant.prices ?? []
  if (price === undefined || variant.sku === "") {
    return undefined
  }
  return {
    amount: price.amount,
    currencyCode: price.currency_code,
    productHandle: "",
    variantSku: variant.sku,
  }
}

const addPriceListPrice = (
  prices: PriceListPriceSeedInput[],
  price: PriceListPriceSeedInput,
) => {
  const existingIndex = prices.findIndex(
    (existing) =>
      existing.productHandle === price.productHandle &&
      existing.variantSku === price.variantSku &&
      existing.currencyCode.toLowerCase() === price.currencyCode.toLowerCase(),
  )
  if (existingIndex === -1) {
    prices.push(price)
    return
  }
  prices[existingIndex] = price
}

const addSalePriceListPrice = (
  salePriceListsByKey: Map<string, PriceListsSeedInput["sales"][number]>,
  {
    sourceTitle,
    customerGroupName,
    startsAtRaw,
    endsAtRaw,
    price,
  }: {
    sourceTitle: string
    customerGroupName?: string | undefined
    startsAtRaw?: string | undefined
    endsAtRaw?: string | undefined
    price: PriceListPriceSeedInput
  },
) => {
  const key = [
    sourceTitle,
    customerGroupName ?? "",
    startsAtRaw ?? "",
    endsAtRaw ?? "",
  ].join("|")
  const startsAt = serializePriceListDate(startsAtRaw)
  const endsAt = serializePriceListDate(endsAtRaw, true)
  const salePriceList =
    salePriceListsByKey.get(key) ??
    ({
      sourceTitle,
      title: buildSalePriceListTitle(sourceTitle, startsAtRaw, endsAtRaw),
      ...(customerGroupName === undefined || customerGroupName === ""
        ? {}
        : { customerGroupName }),
      ...(startsAt === undefined || startsAt === "" ? {} : { startsAt }),
      ...(endsAt === undefined || endsAt === "" ? {} : { endsAt }),
      prices: [],
    } satisfies PriceListsSeedInput["sales"][number])
  addPriceListPrice(salePriceList.prices, price)
  salePriceListsByKey.set(key, salePriceList)
}

const getVariantMetadata = (
  variant: VariantSeedInput,
): VariantSeedInput["metadata"] => variant.metadata

const getMetadataString = (
  metadata: VariantSeedInput["metadata"],
  key: string,
): string | undefined =>
  typeof metadata?.[key] === "string" ? metadata[key] : undefined

const getMetadataNumber = (
  metadata: VariantSeedInput["metadata"],
  key: string,
): number | undefined =>
  typeof metadata?.[key] === "number" ? metadata[key] : undefined

const parsedPricelistSchema = z.object({
  actionPrice: z.number().optional(),
  actionPriceFrom: z.string().optional(),
  actionPriceUntil: z.string().optional(),
  priceVat: z.number().optional(),
  purchasePrice: z.number().optional(),
  standardPrice: z.number().optional(),
  title: z.string().optional(),
  vat: z.number().optional(),
})

const getMetadataPricelists = (
  metadata: VariantSeedInput["metadata"],
): ParsedPricelist[] => {
  const parsed = z
    .array(parsedPricelistSchema)
    .safeParse(metadata?.["pricelists"])
  return parsed.success ? parsed.data : []
}

const addDefaultSalePriceFromMetadata = ({
  basePrice,
  metadata,
  referenceDate,
  salePriceListsByKey,
}: {
  basePrice: PriceListPriceSeedInput
  metadata: VariantSeedInput["metadata"]
  referenceDate: Date
  salePriceListsByKey: Map<string, PriceListsSeedInput["sales"][number]>
}) => {
  const actionPrice = normalizePriceAmount(
    getMetadataNumber(metadata, "action_price"),
  )
  const actionPriceFrom = getMetadataString(metadata, "action_price_from")
  const actionPriceUntil = getMetadataString(metadata, "action_price_until")
  if (
    !shouldImportActionPrice(actionPrice, actionPriceUntil, referenceDate) ||
    priceAmountsEqual(actionPrice, basePrice.amount)
  ) {
    return
  }
  addSalePriceListPrice(salePriceListsByKey, {
    endsAtRaw: actionPriceUntil,
    price: {
      ...basePrice,
      amount: actionPrice,
    },
    sourceTitle: DEFAULT_PRICELIST_LABEL,
    startsAtRaw: actionPriceFrom,
  })
}

const ensureOverridePriceList = (
  overridePriceListsByTitle: Map<
    string,
    PriceListsSeedInput["overrides"][number]
  >,
  title: string,
): PriceListsSeedInput["overrides"][number] => {
  const existing = overridePriceListsByTitle.get(title)
  if (existing) {
    return existing
  }
  const created = {
    customerGroupName: title,
    prices: [],
    title,
  } satisfies PriceListsSeedInput["overrides"][number]
  overridePriceListsByTitle.set(title, created)
  return created
}

const addRegularPricelistPrice = (
  overridePriceList: PriceListsSeedInput["overrides"][number],
  basePrice: PriceListPriceSeedInput,
  regularPrice?: number,
) => {
  if (
    regularPrice === undefined ||
    priceAmountsEqual(regularPrice, basePrice.amount)
  ) {
    return
  }
  addPriceListPrice(overridePriceList.prices, {
    ...basePrice,
    amount: regularPrice,
  })
}

const addPricelistSalePrice = ({
  basePrice,
  pricelist,
  referenceDate,
  regularPrice,
  salePriceListsByKey,
  title,
}: {
  basePrice: PriceListPriceSeedInput
  pricelist: ParsedPricelist
  referenceDate: Date
  regularPrice?: number | undefined
  salePriceListsByKey: Map<string, PriceListsSeedInput["sales"][number]>
  title: string
}) => {
  const actionPrice = normalizePriceAmount(pricelist.actionPrice)
  const comparisonPrice = regularPrice ?? basePrice.amount
  if (
    !shouldImportActionPrice(
      actionPrice,
      pricelist.actionPriceUntil,
      referenceDate,
    ) ||
    priceAmountsEqual(actionPrice, comparisonPrice)
  ) {
    return
  }
  addSalePriceListPrice(salePriceListsByKey, {
    customerGroupName: title,
    endsAtRaw: pricelist.actionPriceUntil,
    price: {
      ...basePrice,
      amount: actionPrice,
    },
    sourceTitle: title,
    startsAtRaw: pricelist.actionPriceFrom,
  })
}

const addVariantPriceListEntries = ({
  basePrice,
  metadata,
  overridePriceListsByTitle,
  referenceDate,
  salePriceListsByKey,
}: {
  basePrice: PriceListPriceSeedInput
  metadata: VariantSeedInput["metadata"]
  overridePriceListsByTitle: Map<
    string,
    PriceListsSeedInput["overrides"][number]
  >
  referenceDate: Date
  salePriceListsByKey: Map<string, PriceListsSeedInput["sales"][number]>
}) => {
  addDefaultSalePriceFromMetadata({
    basePrice,
    metadata,
    referenceDate,
    salePriceListsByKey,
  })
  for (const pricelist of getMetadataPricelists(metadata)) {
    const title = normalizeInlineText(pricelist.title)
    if (title === undefined || title === "" || isDefaultPricelistTitle(title)) {
      continue
    }
    const overridePriceList = ensureOverridePriceList(
      overridePriceListsByTitle,
      title,
    )
    const regularPrice = normalizePriceAmount(
      pricelist.priceVat ?? pricelist.standardPrice,
    )
    addRegularPricelistPrice(overridePriceList, basePrice, regularPrice)
    addPricelistSalePrice({
      basePrice,
      pricelist,
      referenceDate,
      regularPrice,
      salePriceListsByKey,
      title,
    })
  }
}

const buildPriceListsFromProducts = (
  products: ProductSeedInput[],
  referenceDate = new Date(),
): PriceListsSeedInput => {
  const overridePriceListsByTitle = new Map<
    string,
    PriceListsSeedInput["overrides"][number]
  >()
  const salePriceListsByKey = new Map<
    string,
    PriceListsSeedInput["sales"][number]
  >()
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      const basePrice = getVariantBasePrice(variant)
      if (!basePrice) {
        continue
      }
      addVariantPriceListEntries({
        basePrice: {
          ...basePrice,
          productHandle: product.handle,
        },
        metadata: getVariantMetadata(variant),
        overridePriceListsByTitle,
        referenceDate,
        salePriceListsByKey,
      })
    }
  }
  return {
    overrides: [...overridePriceListsByTitle.values()],
    sales: [...salePriceListsByKey.values()],
  }
}

const getItemOffers = (item: ParsedShopItem): ParsedOfferData[] =>
  item.variants.length > 0 ? item.variants : [item.topOffer]

const addWarehouseStockLocation = (
  locationsByName: Map<
    string,
    SeedDatabaseWorkflowInput["stockLocations"]["locations"][number]
  >,
  warehouse: ParsedStockWarehouse,
): boolean => {
  const { name, usedFallback } = resolveWarehouseStockLocationName(warehouse)
  const address = buildWarehouseStockLocationAddress(warehouse.location)
  const existingLocation = locationsByName.get(name)
  if (!existingLocation) {
    locationsByName.set(name, {
      address,
      name,
    })
    return usedFallback
  }
  if (
    existingLocation.address.address_1 ===
      FALLBACK_SHOPTET_WAREHOUSE_ADDRESS.address_1 &&
    address.address_1 !== FALLBACK_SHOPTET_WAREHOUSE_ADDRESS.address_1
  ) {
    existingLocation.address = address
  }
  return usedFallback
}

const addDefaultStockLocation = (
  locationsByName: Map<
    string,
    SeedDatabaseWorkflowInput["stockLocations"]["locations"][number]
  >,
) => {
  locationsByName.set(DEFAULT_STOCK_LOCATION_NAME, {
    ...HERBATICA_DEFAULT_STOCK_LOCATION,
    address: {
      ...HERBATICA_DEFAULT_STOCK_LOCATION.address,
    },
  })
}

const buildStockLocationsFromItems = (
  items: ParsedShopItem[],
): {
  locations: SeedDatabaseWorkflowInput["stockLocations"]["locations"]
  warnings: string[]
} => {
  const locationsByName = new Map<
    string,
    SeedDatabaseWorkflowInput["stockLocations"]["locations"][number]
  >()
  const warnings: string[] = []
  const offers = items.flatMap(getItemOffers)
  const hasSimpleStock = offers.some(
    (offer) => offer.stockWarehouses.length === 0,
  )
  let missingWarehouseNames = 0
  for (const warehouse of offers.flatMap((offer) => offer.stockWarehouses)) {
    if (addWarehouseStockLocation(locationsByName, warehouse)) {
      missingWarehouseNames += 1
    }
  }
  if (hasSimpleStock || locationsByName.size === 0) {
    addDefaultStockLocation(locationsByName)
  }
  if (missingWarehouseNames > 0) {
    warnings.push(
      `${missingWarehouseNames} Shoptet warehouse stock entries had no warehouse name and were mapped to "${FALLBACK_SHOPTET_WAREHOUSE_NAME}".`,
    )
  }
  return {
    locations: [...locationsByName.values()],
    warnings,
  }
}

const enforceUniqueVariantSkus = (products: ProductSeedInput[]) => {
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
          ...variant.metadata,
          source_sku: variant.sku,
        }
        variant.sku = candidate
      }
      usedSkus.add(candidate)
    }
  }
}

export const buildSeedInputFromXml = (
  xml: string,
  categoryExports?: HerbaticaCategoryExport[],
  options?: SeedBuildOptions,
  manufacturersLookup?: ManufacturerCsvLookup,
): BuildResult => {
  const buildOptions = resolveSeedBuildOptions(options)
  const items = applyPromoOverrides(parseShopItems(xml), buildOptions)
  const { categories, pathToHandle, categoryIdToHandle } = categoryExports
    ? buildCategoriesFromExport(categoryExports)
    : buildCategoriesFromProductPaths(items)
  const products = buildProducts({
    buildOptions,
    categoryIdToHandle,
    items,
    manufacturersLookup: manufacturersLookup ?? new Map(),
    pathToHandle,
  })
  enforceUniqueVariantSkus(products)
  const priceLists = buildPriceListsFromProducts(
    products,
    buildOptions.referenceDate,
  )
  const { locations: stockLocations, warnings } =
    buildStockLocationsFromItems(items)
  const hiddenProducts = products.filter(
    (product) => product.status === ProductStatus.DRAFT,
  ).length
  const variants = products.reduce(
    (acc, product) => acc + (product.variants?.length ?? 0),
    0,
  )
  const priceListPrices =
    priceLists.overrides.reduce(
      (acc, priceList) => acc + priceList.prices.length,
      0,
    ) +
    priceLists.sales.reduce(
      (acc, priceList) => acc + priceList.prices.length,
      0,
    )
  return {
    categories,
    priceLists,
    products,
    stats: {
      categories: categories.length,
      hiddenProducts,
      overridePriceLists: priceLists.overrides.length,
      priceListPrices,
      products: products.length,
      salePriceLists: priceLists.sales.length,
      shopItems: items.length,
      stockLocations: stockLocations.length,
      variants,
      warnings: warnings.length,
    },
    stockLocations,
    warnings,
  }
}

export const buildHerbaticaSeedWorkflowInput = (
  parsed: BuildResult,
  {
    regionsInput,
    fulfillmentSetName,
    fulfillmentSetType,
    serviceZoneName,
  }: HerbaticaWorkflowInputOptions,
): SeedDatabaseWorkflowInput => ({
  currencies: HERBATICA_CURRENCIES,
  defaultShippingProfile: HERBATICA_DEFAULT_SHIPPING_PROFILE,
  fulfillmentSets: {
    name: fulfillmentSetName,
    serviceZones: [
      {
        geoZones: [...DEFAULT_COUNTRIES].map((country) => ({
          countryCode: country,
        })),
        name: serviceZoneName,
      },
    ],
    type: fulfillmentSetType,
  },
  legacyBrandAttributeNames: ["supplier", "manufacturer", "item_type"],
  priceListSync: HERBATICA_PRICE_LIST_SYNC_CONFIG,
  priceLists: parsed.priceLists,
  productCategories: parsed.categories,
  products: parsed.products,
  publishableKey: HERBATICA_PUBLISHABLE_KEY,
  regions: regionsInput,
  salesChannels: HERBATICA_SALES_CHANNELS,
  shippingOptions: HERBATICA_SHIPPING_OPTIONS,
  stockLocations: {
    locations: parsed.stockLocations,
  },
  taxRates: {
    config: HERBATICA_TAX_RATE_CONFIG,
    countries: HERBATICA_TAX_RATE_COUNTRIES,
  },
  taxRegions: {
    countries: [...DEFAULT_COUNTRIES],
  },
  workflowDefaults: HERBATICA_WORKFLOW_DEFAULTS,
})

const resolveProductsXmlPath = (args?: string[]): string => {
  const argPath = normalizeInlineText(args?.[0])
  if (argPath !== undefined && argPath !== "") {
    return argPath
  }
  const envPath = normalizeInlineText(process.env[HERBATICA_PRODUCTS_XML_ENV])
  if (envPath !== undefined && envPath !== "") {
    return envPath
  }
  const detectedPath = HERBATICA_PRODUCTS_XML_PATHS.find((path) =>
    existsSync(path),
  )
  if (detectedPath === undefined || detectedPath === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Could not find productsComplete.xml. Checked: ${HERBATICA_PRODUCTS_XML_PATHS.join(", ")}`,
    )
  }
  return detectedPath
}

const resolveCategoriesXmlPath = (args?: string[]): string | undefined => {
  const argPath = normalizeInlineText(args?.[1])
  if (argPath !== undefined && argPath !== "") {
    return argPath
  }
  const envPath = normalizeInlineText(process.env[HERBATICA_CATEGORIES_XML_ENV])
  if (envPath !== undefined && envPath !== "") {
    return envPath
  }
  return HERBATICA_CATEGORIES_XML_PATHS.find((path) => existsSync(path))
}

const resolveReviewsXmlPath = (args?: string[]): string | undefined => {
  const argPath = normalizeInlineText(args?.[2])
  if (argPath !== undefined && argPath !== "") {
    return argPath
  }
  const envPath = normalizeInlineText(process.env[HERBATICA_REVIEWS_XML_ENV])
  if (envPath !== undefined && envPath !== "") {
    return envPath
  }
  return undefined
}

const resolveManufacturersCsvSource = (args?: string[]): string => {
  const argPath = normalizeInlineText(args?.[3])
  if (argPath !== undefined && argPath !== "") {
    return argPath
  }
  const envPath = normalizeInlineText(
    process.env[HERBATICA_MANUFACTURERS_CSV_ENV],
  )
  if (envPath !== undefined && envPath !== "") {
    return envPath
  }
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Manufacturers CSV source is required. Pass it as the fourth seed argument or set ${HERBATICA_MANUFACTURERS_CSV_ENV} to an explicit local path or pinned/versioned URL. No mutable remote fallback is used.`,
  )
}

const resolveFeedPaths = (args?: string[]): ResolvedFeedPaths => ({
  categoriesXmlPath: resolveCategoriesXmlPath(args),
  productsXmlPath: resolveProductsXmlPath(args),
  reviewsXmlPath: resolveReviewsXmlPath(args),
})

const logFeedPaths = (logger: Logger, feedPaths: ResolvedFeedPaths) => {
  logger.info(`Using product XML feed: ${feedPaths.productsXmlPath}`)
  if (
    feedPaths.categoriesXmlPath !== undefined &&
    feedPaths.categoriesXmlPath !== ""
  ) {
    logger.info(`Using categories XML feed: ${feedPaths.categoriesXmlPath}`)
  } else {
    logger.warn(
      "Categories XML feed not found, falling back to categories derived from product paths.",
    )
  }
}

const loadManufacturersLookup = async (
  args: string[] | undefined,
  logger: Logger,
): Promise<ManufacturerCsvLookup> => {
  const manufacturersCsvSource = resolveManufacturersCsvSource(args)
  logger.info(`Using manufacturers CSV feed: ${manufacturersCsvSource}`)
  try {
    const manufacturersCsv = parseManufacturersCsv(
      await readCsvSource(manufacturersCsvSource),
    )
    return buildManufacturersLookup(manufacturersCsv)
  } catch (error) {
    logger.error(
      `Failed to load manufacturers CSV from ${manufacturersCsvSource}`,
      error instanceof Error ? error : new Error(String(error)),
    )
    throw error
  }
}

const loadCategoryExports = async (
  categoriesXmlPath: string | undefined,
): Promise<HerbaticaCategoryExport[] | undefined> =>
  categoriesXmlPath === undefined || categoriesXmlPath === ""
    ? undefined
    : await parseHerbaticaCategoriesXmlSource(categoriesXmlPath)

const logParsedBuildResult = (logger: Logger, parsed: BuildResult) => {
  logger.info(
    `Parsed feed: ${parsed.stats.shopItems} SHOPITEMs, ${parsed.stats.categories} categories, ${parsed.stats.products} products, ${parsed.stats.variants} variants`,
  )
  logger.info(
    `Products set to draft due to visibility rules: ${parsed.stats.hiddenProducts}`,
  )
  logger.info(
    `Parsed ${parsed.stats.stockLocations} stock locations from stock data`,
  )
  logger.info(
    `Parsed ${parsed.stats.overridePriceLists} override price lists, ${parsed.stats.salePriceLists} sale price lists, ${parsed.stats.priceListPrices} price-list prices`,
  )
  for (const warning of parsed.warnings) {
    logger.warn(warning)
  }
}

const resolveRegionsInput = async (
  container: ExecArgs["container"],
  logger: Logger,
): Promise<SeedDatabaseWorkflowInput["regions"]> => {
  const regionService = container.resolve<IRegionModuleService>(Modules.REGION)
  const existingRegions = await regionService.listRegions({})
  const defaultRegions: SeedDatabaseWorkflowInput["regions"] =
    HERBATICA_DEFAULT_REGIONS
  const regionsInput: SeedDatabaseWorkflowInput["regions"] =
    existingRegions.length === 0
      ? defaultRegions
      : existingRegions.map((region) => ({
          currencyCode: region.currency_code?.toLowerCase() || "eur",
          isTaxInclusive: true,
          name: region.name,
        }))
  if (existingRegions.length > 0) {
    logger.info(
      `Using existing regions (${regionsInput.map((region) => region.name).join(", ")}) to avoid country assignment conflicts`,
    )
  }
  return regionsInput
}

const resolveFulfillmentOptions = async (
  container: ExecArgs["container"],
  logger: Logger,
): Promise<Omit<HerbaticaWorkflowInputOptions, "regionsInput">> => {
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT,
  )
  const existingFulfillmentSets = await fulfillmentService.listFulfillmentSets(
    {},
    { relations: ["service_zones"] },
  )
  const existingFulfillmentSetWithEurope = existingFulfillmentSets.find((set) =>
    (set.service_zones ?? []).some((zone) => zone.name === "Europe"),
  )
  const selectedFulfillmentSet =
    existingFulfillmentSetWithEurope ?? existingFulfillmentSets[0]
  const fulfillmentSetName =
    selectedFulfillmentSet?.name ?? HERBATICA_DEFAULT_FULFILLMENT_SET.name
  const fulfillmentSetType =
    selectedFulfillmentSet?.type ?? HERBATICA_DEFAULT_FULFILLMENT_SET.type
  const serviceZoneName =
    selectedFulfillmentSet?.service_zones?.find((zone) => zone.name)?.name ??
    selectedFulfillmentSet?.service_zones?.[0]?.name ??
    HERBATICA_DEFAULT_FULFILLMENT_SET.serviceZoneName
  if (selectedFulfillmentSet) {
    logger.info(
      `Using existing fulfillment set "${fulfillmentSetName}" and service zone "${serviceZoneName}" to avoid duplicate service zone conflicts`,
    )
  }
  return {
    fulfillmentSetName,
    fulfillmentSetType,
    serviceZoneName,
  }
}

// This seed script is intentionally linear and only runs in dev/seed flows.
const herbaticaSeed = async ({ container, args }: ExecArgs) => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  logger.info("Starting Herbatica seed from XML feed...")
  const feedPaths = resolveFeedPaths(args)
  logFeedPaths(logger, feedPaths)
  const xml = await readXmlSource(feedPaths.productsXmlPath)
  const manufacturersLookup = await loadManufacturersLookup(args, logger)
  const categoryExports = await loadCategoryExports(feedPaths.categoriesXmlPath)
  const buildOptions = resolveSeedBuildOptions({
    promoRebaseDays: parsePositiveIntegerEnv(HERBATICA_PROMO_REBASE_DAYS_ENV),
  })
  if (buildOptions.promoRebaseDays !== undefined) {
    logger.info(
      `Rebasing expired Herbatica promo windows to ${formatIsoDate(buildOptions.referenceDate)} + ${buildOptions.promoRebaseDays} days`,
    )
  }
  const parsed = buildSeedInputFromXml(
    xml,
    categoryExports,
    buildOptions,
    manufacturersLookup,
  )
  logParsedBuildResult(logger, parsed)
  const regionsInput = await resolveRegionsInput(container, logger)
  const fulfillmentOptions = await resolveFulfillmentOptions(container, logger)
  const input = buildHerbaticaSeedWorkflowInput(parsed, {
    ...fulfillmentOptions,
    regionsInput,
  })
  logger.info("Running Herbatica seed workflow...")
  const { result: seedResult } = await seedShoptetImportWorkflow(container).run(
    {
      input,
    },
  )
  if (
    feedPaths.reviewsXmlPath !== undefined &&
    feedPaths.reviewsXmlPath !== ""
  ) {
    await importHerbaticaReviews({
      container,
      logger,
      xmlPath: feedPaths.reviewsXmlPath,
    })
  }
  logger.info("Herbatica seed completed successfully")
  const eanReconciliation = seedResult.reconcileProductVariantEansResult
  const eanWarnings = eanReconciliation.issues.length
  logger.info(
    `Summary: products=${parsed.stats.products}, variants=${parsed.stats.variants}, categories=${parsed.stats.categories}, draft_products=${parsed.stats.hiddenProducts}, stock_locations=${parsed.stats.stockLocations}, price_lists=${parsed.stats.overridePriceLists + parsed.stats.salePriceLists}, price_list_prices=${parsed.stats.priceListPrices}, warnings=${parsed.stats.warnings + eanWarnings}, ean_accepted=${eanReconciliation.summary.accepted}, ean_retained=${eanReconciliation.summary.retained}, ean_transferred=${eanReconciliation.summary.transferred}, ean_suppressed=${eanReconciliation.summary.suppressed}, ean_collisions=${eanReconciliation.summary.collisions}`,
  )
  for (const issue of eanReconciliation.issues.slice(0, EAN_ISSUE_LOG_LIMIT)) {
    const owner = `${issue.owner.product_handle}/${issue.owner.sku}`
    const previousOwner = issue.previous_owner
      ? ` previous_owner=${issue.previous_owner.product_handle}/${issue.previous_owner.sku}`
      : ""
    const suppressed = issue.suppressed
      .map((claimant) => `${claimant.product_handle}/${claimant.sku}`)
      .join(",")
    logger.warn(
      `EAN ${issue.ean}: resolution=${issue.resolution} owner=${owner}${previousOwner} suppressed=${suppressed || "none"}`,
    )
  }
  if (eanReconciliation.issues.length > EAN_ISSUE_LOG_LIMIT) {
    logger.warn(
      `${eanReconciliation.issues.length - EAN_ISSUE_LOG_LIMIT} additional EAN collision issue(s) omitted from console output`,
    )
  }
}

export default herbaticaSeed

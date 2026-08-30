import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { sql } from "@payloadcms/db-postgres/drizzle"
import { convertHTMLToLexical } from "@payloadcms/richtext-lexical"
import { type Field, getPayload } from "payload"
import config from "../payload.config"

const require = createRequire(import.meta.url)
const { JSDOM } = require("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } }
}

type ManifestEntry = Readonly<{
  importHtmlPath: string
  importHtmlSha256: string
  locale: "cs" | "hu" | "ro" | "sk"
  market: "cz" | "hu" | "ro" | "sk"
  pageId: number
  pageKey: string
  slug: string
  sourceBodyHtmlSha256: string
  sourceBodyTextSha256: string
  sourceRawSha256: string
  sourceUrl: string
  title: string
}>

type UnsupportedRow = Readonly<{
  existingSlug: string
  existingTitle: string
  locale: "cs" | "hu" | "ro" | "sk"
  market: "cz" | "hu" | "ro" | "sk"
  pageId: number
  pageKey: string
}>

type Manifest = Readonly<{
  entries: ManifestEntry[]
  faqInventorySha256: string
  schemaVersion: number
  sourceInventorySha256: string
  unsupportedLocalizedRowsToDelete: UnsupportedRow[]
}>

type PlannedUpdate = ManifestEntry & Readonly<{ lexical: unknown }>

const argv = process.argv.slice(2)
const manifestPath = argv.find((value) => !value.startsWith("--"))
if (!manifestPath) {
  throw new Error("Manifest path is required")
}
const apply = argv.includes("--apply")
const hashIndex = argv.indexOf("--confirm-plan-hash")
const confirmedHash = hashIndex === -1 ? undefined : argv[hashIndex + 1]
if (hashIndex !== -1 && !confirmedHash) {
  throw new Error("--confirm-plan-hash requires a value")
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (value === null || typeof value !== "object") {
    return value
  }
  const record = value as Readonly<Record<string, unknown>>
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key])])
  )
}

const hash = (value: unknown) =>
  `sha256:${createHash("sha256")
    .update(
      typeof value === "string" ? value : JSON.stringify(canonicalize(value))
    )
    .digest("hex")}`

const WHITESPACE_PATTERN = /\s+/g
const LINK_WHITESPACE_PATTERN = /\s/

const normalizeText = (value: string) =>
  value.normalize("NFKC").replace(WHITESPACE_PATTERN, "")

const lexicalText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(lexicalText).join(" ")
  }
  if (!value || typeof value !== "object") {
    return ""
  }
  const record = value as Readonly<Record<string, unknown>>
  const own = typeof record.text === "string" ? record.text : ""
  return `${own} ${Object.values(record).map(lexicalText).join(" ")}`
}

const normalizeLinkUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return
  }
  if (!LINK_WHITESPACE_PATTERN.test(trimmed)) {
    return trimmed
  }
  try {
    if (trimmed.startsWith("/")) {
      const parsed = new URL(trimmed, "https://www.herbatica.sk")
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    return new URL(trimmed).toString()
  } catch {
    return
  }
}

const sanitizeLexical = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.flatMap((child) => {
      const sanitized = sanitizeLexical(child)
      if (sanitized === undefined) {
        return []
      }
      return Array.isArray(sanitized) ? sanitized : [sanitized]
    })
  }
  if (!value || typeof value !== "object") {
    return value
  }

  const record = value as Record<string, unknown>
  if (record.type === "link") {
    const fields = record.fields as Record<string, unknown> | undefined
    const url =
      typeof fields?.url === "string" ? normalizeLinkUrl(fields.url) : undefined
    if (!url) {
      return sanitizeLexical(record.children ?? [])
    }
    record.fields = { ...fields, url }
  }

  const next = { ...record }
  if (Array.isArray(record.children)) {
    next.children = sanitizeLexical(record.children)
    if (
      Array.isArray(next.children) &&
      next.children.length === 0 &&
      record.type !== "root"
    ) {
      return
    }
  }
  if (record.root && typeof record.root === "object") {
    next.root = sanitizeLexical(record.root)
  }
  return next
}

const fieldAffectsData = (field: Field): field is Field & { name: string } =>
  "name" in field && typeof field.name === "string"

const fieldHasSubFields = (
  field: Field
): field is Field & { fields: Field[] } =>
  "fields" in field && Array.isArray(field.fields)

const findInSubFields = (field: Field, name: string) =>
  fieldHasSubFields(field) ? findField(field.fields, name) : undefined

const findInTabs = (field: Field, name: string) => {
  if (field.type !== "tabs") {
    return
  }
  for (const tab of field.tabs) {
    const tabField = findField(tab.fields, name)
    if (tabField) {
      return tabField
    }
  }
}

const findField = (
  fields: Field[] | undefined,
  name: string
): Field | undefined => {
  for (const field of fields ?? []) {
    if (fieldAffectsData(field) && field.name === name) {
      return field
    }
    const nestedField = findInSubFields(field, name) ?? findInTabs(field, name)
    if (nestedField) {
      return nestedField
    }
  }
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest
if (
  manifest.schemaVersion !== 1 ||
  manifest.entries.length !== 34 ||
  manifest.unsupportedLocalizedRowsToDelete.length !== 14
) {
  throw new Error("Unexpected static page manifest inventory")
}

const payload = await getPayload({ config })

try {
  const pagesCollection = payload.config.collections.find(
    (collection) => collection.slug === "pages"
  )
  const contentField = findField(pagesCollection?.fields, "content")
  const editorConfig = (
    contentField as { editor?: { editorConfig?: unknown } } | undefined
  )?.editor?.editorConfig
  if (!editorConfig) {
    throw new Error("Unable to resolve pages.content Lexical editor config")
  }

  const updates: PlannedUpdate[] = []
  for (const entry of manifest.entries) {
    const html = await readFile(entry.importHtmlPath, "utf8")
    if (hash(html) !== `sha256:${entry.importHtmlSha256}`) {
      throw new Error(
        `${entry.market}/${entry.pageKey} import HTML hash differs`
      )
    }
    const lexical = sanitizeLexical(
      convertHTMLToLexical({
        editorConfig: editorConfig as never,
        html,
        JSDOM,
      })
    )
    const htmlText = normalizeText(
      new JSDOM(html).window.document.body.textContent ?? ""
    )
    const convertedText = normalizeText(lexicalText(lexical))
    if (htmlText !== convertedText) {
      const firstDifference = Array.from({
        length: Math.min(htmlText.length, convertedText.length),
      }).findIndex((_, index) => htmlText[index] !== convertedText[index])
      throw new Error(
        `${entry.market}/${entry.pageKey} Lexical conversion changed customer text at ${firstDifference}; HTML(${htmlText.length})=${JSON.stringify(htmlText.slice(Math.max(0, firstDifference - 80), firstDifference + 160))}; Lexical(${convertedText.length})=${JSON.stringify(convertedText.slice(Math.max(0, firstDifference - 80), firstDifference + 160))}`
      )
    }
    updates.push({ ...entry, lexical })
  }

  const existing = (await payload.db.drizzle.execute(sql`
    SELECT
      _parent_id AS page_id,
      _locale::text AS locale,
      title,
      slug
    FROM payload.pages_locales
    WHERE _parent_id BETWEEN 2 AND 13
    ORDER BY _parent_id, _locale
  `)) as unknown as {
    rows: Array<{
      locale: string
      page_id: number
      slug: string
      title: string
    }>
  }
  if (existing.rows.length !== 48) {
    throw new Error(
      `Expected 48 existing localized page rows, got ${existing.rows.length}`
    )
  }
  const existingKeys = new Set(
    existing.rows.map(({ locale, page_id }) => `${page_id}:${locale}`)
  )
  for (const entry of updates) {
    if (!existingKeys.has(`${entry.pageId}:${entry.locale}`)) {
      throw new Error(`Missing existing row ${entry.pageId}/${entry.locale}`)
    }
  }
  for (const row of manifest.unsupportedLocalizedRowsToDelete) {
    const existingRow = existing.rows.find(
      ({ locale, page_id }) => locale === row.locale && page_id === row.pageId
    )
    if (
      existingRow?.title !== row.existingTitle ||
      existingRow.slug !== row.existingSlug
    ) {
      throw new Error(`Unsupported row ${row.pageId}/${row.locale} differs`)
    }
  }

  const planBody = {
    faqInventorySha256: manifest.faqInventorySha256,
    sourceInventorySha256: manifest.sourceInventorySha256,
    updates: updates.map(
      ({
        importHtmlSha256,
        locale,
        market,
        pageId,
        pageKey,
        slug,
        sourceBodyHtmlSha256,
        sourceBodyTextSha256,
        sourceRawSha256,
        sourceUrl,
        title,
      }) => ({
        importHtmlSha256,
        locale,
        market,
        pageId,
        pageKey,
        slug,
        sourceBodyHtmlSha256,
        sourceBodyTextSha256,
        sourceRawSha256,
        sourceUrl,
        title,
      })
    ),
    unsupportedLocalizedRowsToDelete: manifest.unsupportedLocalizedRowsToDelete,
  }
  const planHash = hash(planBody)
  process.stdout.write(
    `${JSON.stringify(
      {
        applied: false,
        counts: {
          updates: updates.length,
          deletes: manifest.unsupportedLocalizedRowsToDelete.length,
        },
        planHash,
      },
      null,
      2
    )}\n`
  )

  if (apply) {
    if (confirmedHash !== planHash) {
      throw new Error(
        "--confirm-plan-hash must equal the exact hash emitted by dry-run"
      )
    }

    for (const update of updates) {
      await payload.update({
        collection: "pages",
        id: update.pageId,
        locale: update.locale,
        fallbackLocale: false,
        overrideAccess: true,
        data: {
          content: update.lexical as never,
          slug: update.slug,
          status: "published",
          title: update.title,
          visibility: "public",
        },
      })
    }

    await payload.update({
      collection: "pages",
      id: 7,
      locale: "sk",
      fallbackLocale: false,
      overrideAccess: true,
      data: { visibility: "public" },
    })

    let deleted = 0
    await payload.db.drizzle.transaction(async (transaction) => {
      for (const row of manifest.unsupportedLocalizedRowsToDelete) {
        const result = await transaction.execute(sql`
          DELETE FROM payload.pages_locales
          WHERE _parent_id = ${row.pageId}
            AND _locale = ${row.locale}
            AND title = ${row.existingTitle}
            AND slug = ${row.existingSlug}
        `)
        if (result.rowCount !== 1) {
          throw new Error(
            `Expected one deleted row for ${row.pageId}/${row.locale}, got ${result.rowCount}`
          )
        }
        deleted += 1
      }
      for (const pageId of new Set(
        manifest.unsupportedLocalizedRowsToDelete.map((row) => row.pageId)
      )) {
        await transaction.execute(sql`
          UPDATE payload.pages
          SET updated_at = now()
          WHERE id = ${pageId}
        `)
      }
    })
    process.stdout.write(
      `${JSON.stringify({ applied: true, deleted, planHash, updated: updates.length })}\n`
    )
  }
} finally {
  await payload.destroy()
}

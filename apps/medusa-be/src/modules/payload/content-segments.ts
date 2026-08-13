import type {
  CmsArticleContentSegment,
  CmsArticleTableOfContentsItem,
  CmsLexicalContentDTO,
  CmsProductReferenceDTO,
} from "./types"

const CMS_BLOCK_MARKER_PATTERN =
  /<div data-cms-block="(productCarousel)"><\/div>/g
const PAYLOAD_RICH_TEXT_WRAPPER_PATTERN =
  /^<div class="payload-richtext">([\s\S]*)<\/div>$/
const HTML_HEADING_OPEN_PATTERN = /<h([23])(\s[^>]*)?>/gi
const HTML_ID_ATTRIBUTE_PATTERN = /\s+id=(?:"[^"]*"|'[^']*')/i
const DIACRITIC_PATTERN = /[\u0300-\u036f]/g
const NON_SLUG_PATTERN = /[^a-z0-9]+/g
const SLUG_EDGE_PATTERN = /^-+|-+$/g

type CmsBlockFields = {
  blockType?: unknown
  products?: CmsProductReferenceDTO[]
}

const getNodeText = (value: unknown): string => {
  if (!(value && typeof value === "object")) {
    return ""
  }

  const record = value as Record<string, unknown>
  const ownText = typeof record.text === "string" ? record.text : ""
  const childText = Array.isArray(record.children)
    ? record.children.map(getNodeText).join("")
    : ""
  return `${ownText}${childText}`
}

const headingSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(DIACRITIC_PATTERN, "")
    .toLowerCase()
    .replace(NON_SLUG_PATTERN, "-")
    .replace(SLUG_EDGE_PATTERN, "") || "section"

export const buildCmsArticleTableOfContents = (
  content: CmsLexicalContentDTO | undefined
): CmsArticleTableOfContentsItem[] => {
  const children = content?.root?.children
  if (!Array.isArray(children)) {
    return []
  }

  const slugCounts = new Map<string, number>()
  return children.flatMap((node) => {
    if (!(node && typeof node === "object")) {
      return []
    }

    const record = node as Record<string, unknown>
    if (record.type !== "heading" || !["h2", "h3"].includes(String(record.tag))) {
      return []
    }

    const title = getNodeText(record).trim()
    if (!title) {
      return []
    }

    const baseId = headingSlug(title)
    const count = (slugCounts.get(baseId) ?? 0) + 1
    slugCounts.set(baseId, count)
    return [
      {
        id: count === 1 ? baseId : `${baseId}-${count}`,
        level: record.tag === "h3" ? 3 : 2,
        title,
      } satisfies CmsArticleTableOfContentsItem,
    ]
  })
}

const addHeadingAnchors = (
  segments: CmsArticleContentSegment[],
  tableOfContents: CmsArticleTableOfContentsItem[]
) => {
  let headingIndex = 0

  return segments.map((segment) => {
    if (segment.type !== "html") {
      return segment
    }

    const html = segment.html.replace(
      HTML_HEADING_OPEN_PATTERN,
      (openingTag, levelValue: string, attributes = "") => {
        const heading = tableOfContents[headingIndex]
        if (!heading || heading.level !== Number(levelValue)) {
          return openingTag
        }
        headingIndex += 1

        const safeAttributes = String(attributes).replace(
          HTML_ID_ATTRIBUTE_PATTERN,
          ""
        )
        return `<h${levelValue}${safeAttributes} id="${heading.id}">`
      }
    )

    return { ...segment, html }
  })
}

const collectSupportedBlocks = (
  value: unknown,
  blocks: CmsBlockFields[] = []
): CmsBlockFields[] => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectSupportedBlocks(entry, blocks)
    }
    return blocks
  }

  if (!(value && typeof value === "object")) {
    return blocks
  }

  const record = value as Record<string, unknown>
  if (
    record.type === "block" &&
    record.fields &&
    typeof record.fields === "object"
  ) {
    const fields = record.fields as CmsBlockFields
    if (fields.blockType === "productCarousel") {
      blocks.push(fields)
    }
  }

  for (const [key, entry] of Object.entries(record)) {
    if (key !== "fields") {
      collectSupportedBlocks(entry, blocks)
    }
  }

  return blocks
}

const appendHtmlSegment = (
  segments: CmsArticleContentSegment[],
  html: string
) => {
  if (html.trim()) {
    segments.push({ type: "html", html })
  }
}

const toProductReference = (
  value: CmsProductReferenceDTO
): CmsProductReferenceDTO | null => {
  const productExternalId = value.productExternalId?.trim()
  const productSlug = value.productSlug?.trim()
  if (!(productExternalId || productSlug)) {
    return null
  }

  return {
    ...(productExternalId ? { productExternalId } : {}),
    ...(productSlug ? { productSlug } : {}),
  }
}

export const buildCmsArticleContentSegments = (
  content: CmsLexicalContentDTO | undefined,
  contentHTML: string | null | undefined
): CmsArticleContentSegment[] => {
  if (!contentHTML) {
    return []
  }

  const tableOfContents = buildCmsArticleTableOfContents(content)

  const html =
    PAYLOAD_RICH_TEXT_WRAPPER_PATTERN.exec(contentHTML)?.[1] ?? contentHTML
  const blocks = collectSupportedBlocks(content)
  const markers = [...html.matchAll(CMS_BLOCK_MARKER_PATTERN)]
  const markerTypes = markers.map((marker) => marker[1])
  const blockTypes = blocks.map((block) => block.blockType)
  if (
    markerTypes.length !== blockTypes.length ||
    markerTypes.some((type, index) => type !== blockTypes[index])
  ) {
    const markerFreeHtml = html.replace(CMS_BLOCK_MARKER_PATTERN, "")
    const fallbackSegments: CmsArticleContentSegment[] = markerFreeHtml.trim()
      ? [{ type: "html", html: markerFreeHtml }]
      : []
    return addHeadingAnchors(fallbackSegments, tableOfContents)
  }

  const segments: CmsArticleContentSegment[] = []
  let blockIndex = 0
  let htmlOffset = 0

  for (const marker of markers) {
    const markerIndex = marker.index
    if (markerIndex === undefined) {
      continue
    }

    appendHtmlSegment(segments, html.slice(htmlOffset, markerIndex))

    const blockType = marker[1]
    const block = blocks[blockIndex]
    if (block && block.blockType === blockType) {
      if (blockType === "productCarousel" && block.products) {
        const products = block.products
          .map(toProductReference)
          .filter((product): product is CmsProductReferenceDTO => !!product)
        if (products.length === 0) {
          blockIndex += 1
          htmlOffset = markerIndex + marker[0].length
          continue
        }
        segments.push({
          type: "productCarousel",
          products,
        })
      }
      blockIndex += 1
    }

    htmlOffset = markerIndex + marker[0].length
  }

  appendHtmlSegment(segments, html.slice(htmlOffset))

  return addHeadingAnchors(segments, tableOfContents)
}

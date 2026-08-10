import { readFileSync } from "node:fs"

import { MedusaError } from "@medusajs/framework/utils"

export interface XmlElement {
  attributes: Record<string, string>
  inner: string
}

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&gt;": ">",
  "&lt;": "<",
  "&nbsp;": " ",
  "&quot;": '"',
}

// Case-insensitivity is spelled out as ASCII case pairs rather than the `i` flag.
// Combined with the required `u` flag, `i` switches to full Unicode case folding, so `s`
// would also match U+017F (LATIN SMALL LETTER LONG S), widening which sources this
// matches as HTTP(S).
const HTTP_XML_SOURCE_PATTERN = /^[hH][tT][tT][pP][sS]?:\/\//u

export const decodeXml = (value: string): string =>
  value
    .replaceAll(/<!\[CDATA\[(?<content>[\s\S]*?)\]\]>/gu, "$1")
    .replaceAll(/&#x(?<hex>[0-9a-fA-F]+);/gu, (match, hex: string) => {
      const parsed = Number.parseInt(hex, 16)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replaceAll(/&#(?<dec>[0-9]+);/gu, (match, num: string) => {
      const parsed = Math.trunc(Number(num))
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replaceAll(
      /&quot;|&apos;|&lt;|&gt;|&amp;|&nbsp;/gu,
      (entity) => ENTITY_MAP[entity] ?? entity,
    )

export const normalizeText = (value?: string): string | undefined => {
  if (value === undefined) {
    return undefined
  }

  const decoded = decodeXml(value).replaceAll("\r\n", "\n").trim()
  return decoded === "" ? undefined : decoded
}

export const normalizeInlineText = (value?: string): string | undefined => {
  const normalized = normalizeText(value)
  if (normalized === undefined) {
    return undefined
  }

  return normalized.replaceAll(/\s+/gu, " ").trim()
}

export const parseAttributes = (raw?: string): Record<string, string> => {
  if (raw === undefined || raw === "") {
    return {}
  }

  const attributes: Record<string, string> = {}
  const regex = /(?<name>[:\w-]+)\s*=\s*"(?<value>[^"]*)"/gu
  for (const match of raw.matchAll(regex)) {
    const key = normalizeInlineText(match[1])
    if (key === undefined || key === "") {
      continue
    }
    attributes[key] = normalizeText(match[2]) ?? ""
  }

  return attributes
}

const escapeRegExp = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&")

export const extractElements = (source: string, tag: string): XmlElement[] => {
  const escapedTag = escapeRegExp(tag)
  const regex = new RegExp(
    `<${escapedTag}(\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`,
    "gu",
  )
  const result: XmlElement[] = []

  for (const match of source.matchAll(regex)) {
    result.push({
      attributes: parseAttributes(match[1]),
      inner: match[2] ?? "",
    })
  }

  return result
}

export const extractFirstElementContent = (
  source: string,
  tag: string,
): string | undefined => {
  const escapedTag = escapeRegExp(tag)
  const regex = new RegExp(
    `<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`,
    "u",
  )
  return source.match(regex)?.[1]
}

export const extractFirstText = (
  source: string,
  tag: string,
): string | undefined => normalizeText(extractFirstElementContent(source, tag))

export const isHttpXmlSource = (source: string): boolean =>
  HTTP_XML_SOURCE_PATTERN.test(source)

export const readXmlSource = async (source: string): Promise<string> => {
  if (!isHttpXmlSource(source)) {
    return readFileSync(source, "utf-8")
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to fetch XML source ${source}: ${response.status} ${response.statusText}`,
    )
  }

  return await response.text()
}

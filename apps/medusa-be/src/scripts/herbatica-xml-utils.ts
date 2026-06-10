import { readFileSync } from "node:fs"

export type XmlElement = {
  attributes: Record<string, string>
  inner: string
}

const ENTITY_MAP: Record<string, string> = {
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&nbsp;": " ",
}

const HTTP_XML_SOURCE_PATTERN = /^https?:\/\//i

export function decodeXml(value: string): string {
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

export function normalizeText(value?: string): string | undefined {
  if (value === undefined) {
    return
  }

  const decoded = decodeXml(value).replace(/\r\n/g, "\n").trim()
  return decoded === "" ? undefined : decoded
}

export function normalizeInlineText(value?: string): string | undefined {
  const normalized = normalizeText(value)
  if (normalized === undefined) {
    return
  }

  return normalized.replace(/\s+/g, " ").trim()
}

export function parseAttributes(raw?: string): Record<string, string> {
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function extractElements(source: string, tag: string): XmlElement[] {
  const escapedTag = escapeRegExp(tag)
  const regex = new RegExp(`<${escapedTag}(\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, "g")
  const result: XmlElement[] = []

  for (const match of source.matchAll(regex)) {
    result.push({
      attributes: parseAttributes(match[1]),
      inner: match[2] ?? "",
    })
  }

  return result
}

export function extractFirstElementContent(
  source: string,
  tag: string
): string | undefined {
  const escapedTag = escapeRegExp(tag)
  const regex = new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`)
  return source.match(regex)?.[1]
}

export function extractFirstText(
  source: string,
  tag: string
): string | undefined {
  return normalizeText(extractFirstElementContent(source, tag))
}

export function isHttpXmlSource(source: string): boolean {
  return HTTP_XML_SOURCE_PATTERN.test(source)
}

export async function readXmlSource(source: string): Promise<string> {
  if (!isHttpXmlSource(source)) {
    return readFileSync(source, "utf8")
  }

  const response = await fetch(source)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch XML source ${source}: ${response.status} ${response.statusText}`
    )
  }

  return response.text()
}

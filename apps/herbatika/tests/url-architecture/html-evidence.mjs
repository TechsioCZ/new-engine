const parseAttributes = (source) => {
  const attributes = {}
  const pattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  for (const match of source.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? ""
  }
  return attributes
}

const tags = (html, name) =>
  [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, "gi"))].map((match) =>
    parseAttributes(match[1])
  )

export const inspectHtml = (html) => {
  const links = tags(html, "link")
  const metas = tags(html, "meta")
  const htmlTag = tags(html, "html")[0] ?? {}
  const canonical = links.find(({ rel = "" }) =>
    rel.toLowerCase().split(REL_SEPARATOR).includes("canonical")
  )?.href
  const alternates = links
    .filter(({ rel = "" }) =>
      rel.toLowerCase().split(REL_SEPARATOR).includes("alternate")
    )
    .filter(({ hreflang }) => hreflang)
    .map(({ href, hreflang }) => ({ href, hreflang }))
  const robots = metas
    .filter(({ name = "" }) => name.toLowerCase() === "robots")
    .map(({ content = "" }) => content.toLowerCase())
    .join(",")
  const ogUrl = metas.find(
    ({ property = "" }) => property.toLowerCase() === "og:url"
  )?.content
  const jsonLd = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => {
      const attributes = parseAttributes(match[1])
      return attributes.type?.toLowerCase() === "application/ld+json"
    })
    .map((match) => match[2].trim())
  const anchors = tags(html, "a")
    .map(({ href }) => href)
    .filter((href) => typeof href === "string" && href.length > 0)

  return Object.freeze({
    alternates,
    anchors,
    canonical,
    htmlLang: htmlTag.lang,
    jsonLd,
    noindex: robots.split(ROBOTS_SEPARATOR).includes("noindex"),
    ogUrl,
  })
}

export const jsonLdContainsUrl = (jsonLdSources, expectedUrl) => {
  const contains = (value) => {
    if (value === expectedUrl) {
      return true
    }
    if (Array.isArray(value)) {
      return value.some(contains)
    }
    return (
      value !== null &&
      typeof value === "object" &&
      Object.entries(value).some(([key, child]) =>
        key === "url" || key === "@id"
          ? contains(child)
          : child !== value && contains(child)
      )
    )
  }

  return jsonLdSources.some((source) => {
    try {
      return contains(JSON.parse(source))
    } catch {
      return false
    }
  })
}

export const xmlLocations = (xml) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim())
const REL_SEPARATOR = /\s+/
const ROBOTS_SEPARATOR = /\s*,\s*/

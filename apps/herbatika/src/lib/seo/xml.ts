const isValidXmlCharacter = (character: string): boolean => {
  const codePoint = character.codePointAt(0) ?? 0
  return (
    codePoint === 0x9 ||
    codePoint === 0xa ||
    codePoint === 0xd ||
    (codePoint >= 0x20 && codePoint <= 0xd7_ff) ||
    (codePoint >= 0xe0_00 && codePoint <= 0xff_fd) ||
    (codePoint >= 0x1_00_00 && codePoint <= 0x10_ff_ff)
  )
}

export const escapeXml = (value: string): string =>
  Array.from(value)
    .filter(isValidXmlCharacter)
    .join("")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

export type SitemapUrl = Readonly<{
  location: string
  lastModified?: string
}>

const lastModifiedElement = (lastModified?: string) =>
  lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : ""

export const serializeSitemapIndex = (
  sitemaps: readonly SitemapUrl[]
): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemaps
    .map(
      ({ lastModified, location }) =>
        `<sitemap><loc>${escapeXml(location)}</loc>${lastModifiedElement(lastModified)}</sitemap>`
    )
    .join("")}</sitemapindex>\n`

export const serializeUrlSet = (urls: readonly SitemapUrl[]): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map(
      ({ lastModified, location }) =>
        `<url><loc>${escapeXml(location)}</loc>${lastModifiedElement(lastModified)}</url>`
    )
    .join("")}</urlset>\n`

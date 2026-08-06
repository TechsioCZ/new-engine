import Head from "next/head"
import type { SeoPageMetadata } from "./metadata"

export type SeoHeadProps = { metadata: SeoPageMetadata }

/** Render the shared serializable SEO model through the Pages Router head. */
export function SeoHead({ metadata }: SeoHeadProps) {
  return (
    <Head>
      {metadata.title === undefined ? null : <title>{metadata.title}</title>}
      {metadata.description === undefined ? null : (
        <meta content={metadata.description} name="description" />
      )}
      <meta content={metadata.robots} name="robots" />
      {metadata.canonical === undefined ? null : (
        <link href={metadata.canonical} rel="canonical" />
      )}
      {metadata.hreflang?.map(({ hrefLang, href }) => (
        <link href={href} hrefLang={hrefLang} key={hrefLang} rel="alternate" />
      ))}
      {metadata.openGraph?.url === undefined ? null : (
        <meta content={metadata.openGraph.url} property="og:url" />
      )}
      {metadata.openGraph?.title === undefined ? null : (
        <meta content={metadata.openGraph.title} property="og:title" />
      )}
      {metadata.openGraph?.description === undefined ? null : (
        <meta
          content={metadata.openGraph.description}
          property="og:description"
        />
      )}
      {metadata.openGraph?.type === undefined ? null : (
        <meta content={metadata.openGraph.type} property="og:type" />
      )}
    </Head>
  )
}

"use client"

import type { StaticImageData } from "next/image"
import NextImage from "next/image"
import { StorefrontLink } from "@/components/storefront-link"
import { buildIndexUrl, buildUrl } from "@/lib/url/builder"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { AboutParagraph } from "./about-page.data"

export type AboutImage = {
  alt: string
  caption?: string
  src: StaticImageData
}

export const aboutParagraphClassName =
  "font-verdana text-md leading-relaxed text-fg-secondary"

const textLinkClassName =
  "font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover"

const isExternalHref = (href: string) => href.startsWith("http")

const resolveAboutLinkHref = (
  link: Exclude<AboutParagraph, string>[number],
  market: ReturnType<typeof useMarketContext>["code"]
) => {
  if (typeof link === "string") {
    return ""
  }
  if ("href" in link && link.href) {
    return link.href
  }
  if (!("kind" in link && link.kind)) {
    return "/"
  }
  return link.slug
    ? buildUrl({ market, kind: link.kind, slug: link.slug })
    : buildIndexUrl({ market, kind: link.kind })
}

export function AboutRichText({ content }: { content: AboutParagraph }) {
  const market = useMarketContext().code
  if (typeof content === "string") {
    return content
  }

  return content.map((part, index) => {
    if (typeof part === "string") {
      return part
    }

    const href = resolveAboutLinkHref(part, market)
    return (
      <StorefrontLink
        className={textLinkClassName}
        href={href}
        key={`${href}-${index}`}
        rel={isExternalHref(href) ? "noreferrer noopener" : undefined}
        target={isExternalHref(href) ? "_blank" : undefined}
      >
        {part.label}
      </StorefrontLink>
    )
  })
}

export function AboutParagraphText({
  className = aboutParagraphClassName,
  paragraph,
}: {
  className?: string
  paragraph: AboutParagraph
}) {
  return (
    <p className={className}>
      <AboutRichText content={paragraph} />
    </p>
  )
}

export function AboutImageFrame({
  image,
  priority = false,
}: {
  image: AboutImage
  priority?: boolean
}) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border-secondary bg-surface">
      <NextImage
        alt={image.alt}
        className="aspect-[4/3] w-full object-cover"
        height={900}
        priority={priority}
        quality={60}
        src={image.src}
        width={1200}
      />
      {image.caption ? (
        <figcaption className="border-border-secondary border-t px-300 py-200 font-verdana text-fg-secondary text-xs leading-relaxed">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string
  text?: string
  title: string
}) {
  return (
    <header className="max-w-5xl space-y-200">
      {eyebrow ? (
        <p className="font-bold font-open-sans text-primary text-xs uppercase leading-normal tracking-normal">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-bold text-3xl text-fg-primary leading-tight">
        {title}
      </h2>
      {text ? <p className={aboutParagraphClassName}>{text}</p> : null}
    </header>
  )
}

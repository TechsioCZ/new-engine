import type { StaticImageData } from "next/image"

export interface AboutTextLink {
  href: string
  label: string
}

type AboutTextPart = AboutTextLink | string
export type AboutParagraph = readonly AboutTextPart[] | string

export const getAboutParagraphKey = (paragraph: AboutParagraph) => {
  if (typeof paragraph === "string") {
    return paragraph
  }

  return paragraph
    .map((part) =>
      typeof part === "string" ? part : `${part.label}:${part.href}`,
    )
    .join("|")
}

interface AboutImage {
  alt: string
  caption?: string
  src: StaticImageData
}

export interface AboutArticleSection {
  image?: AboutImage
  paragraphs: readonly AboutParagraph[]
  title: string
}

export interface AboutMilestone {
  description: AboutParagraph
  year: string
}

export interface AboutPrinciple {
  description: string
  title: string
}

export type AboutSocialLink = AboutTextLink & {
  icon: string
}

export interface AboutTextBlock {
  paragraphs: readonly AboutParagraph[]
}

export const aboutLink = (label: string, href: string): AboutTextLink => ({
  href,
  label,
})

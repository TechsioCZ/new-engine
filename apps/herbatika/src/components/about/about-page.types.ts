import type { StaticImageData } from "next/image"

type AboutTextLink = {
  href: string
  label: string
}

type AboutTextPart = AboutTextLink | string
export type AboutParagraph = readonly AboutTextPart[] | string

type AboutImage = {
  alt: string
  caption?: string
  src: StaticImageData
}

export type AboutArticleSection = {
  image?: AboutImage
  paragraphs: readonly AboutParagraph[]
  title: string
}

export type AboutMilestone = {
  description: AboutParagraph
  year: string
}

export type AboutPrinciple = {
  description: string
  title: string
}

export type AboutSocialLink = AboutTextLink & {
  icon: string
}

export type AboutTextBlock = {
  paragraphs: readonly AboutParagraph[]
}

export const aboutLink = (label: string, href: string): AboutTextLink => ({
  href,
  label,
})

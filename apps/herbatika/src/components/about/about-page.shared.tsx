import type { StaticImageData } from "next/image"
import NextImage from "next/image"

import NextLink from "@/components/app-link"

import type { AboutParagraph } from "./about-page.data"

export interface AboutImage {
  alt: string
  caption?: string
  src: StaticImageData
}

export const aboutParagraphClassName =
  "font-verdana text-md leading-relaxed text-fg-secondary"

const textLinkClassName =
  "font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover"

const isExternalHref = (href: string) => href.startsWith("http")

const renderAboutRichText = (content: AboutParagraph) => {
  if (typeof content === "string") {
    return content
  }

  return content.map((part) => {
    if (typeof part === "string") {
      return part
    }

    return (
      <NextLink
        className={textLinkClassName}
        href={part.href}
        key={`${part.href}-${part.label}`}
        rel={isExternalHref(part.href) ? "noreferrer noopener" : undefined}
        target={isExternalHref(part.href) ? "_blank" : undefined}
      >
        {part.label}
      </NextLink>
    )
  })
}

export const AboutParagraphText = ({
  className = aboutParagraphClassName,
  paragraph,
}: {
  className?: string
  paragraph: AboutParagraph
}) => <p className={className}>{renderAboutRichText(paragraph)}</p>

export const AboutImageFrame = ({
  image,
  priority = false,
}: {
  image: AboutImage
  priority?: boolean
}) => (
  <figure className="overflow-hidden rounded-lg border border-border-secondary bg-surface">
    <NextImage
      alt={image.alt}
      className="aspect-about-image w-full object-cover"
      height={900}
      priority={priority}
      quality={60}
      src={image.src}
      width={1200}
    />
    {image.caption !== undefined && image.caption.length > 0 ? (
      <figcaption className="border-border-secondary border-t px-300 py-200 font-verdana text-fg-secondary text-xs leading-relaxed">
        {image.caption}
      </figcaption>
    ) : null}
  </figure>
)

export const SectionHeader = ({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string
  text?: string
  title: string
}) => (
  <header className="max-w-about-copy space-y-200">
    {eyebrow !== undefined && eyebrow.length > 0 ? (
      <p className="font-bold font-open-sans text-primary text-xs uppercase leading-normal tracking-normal">
        {eyebrow}
      </p>
    ) : null}
    <h2 className="font-bold text-3xl text-fg-primary leading-tight">
      {title}
    </h2>
    {text !== undefined && text.length > 0 ? (
      <p className={aboutParagraphClassName}>{text}</p>
    ) : null}
  </header>
)

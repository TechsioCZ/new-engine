import NextImage from "next/image";
import type { StaticImageData } from "next/image";
import NextLink from "next/link";
import type { AboutParagraph } from "./about-page.data";

export type AboutImage = {
  alt: string;
  caption?: string;
  src: StaticImageData;
};

export const aboutParagraphClassName =
  "font-verdana text-md leading-relaxed text-fg-secondary";

const textLinkClassName =
  "font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-hover";

const isExternalHref = (href: string) => href.startsWith("http");

export function AboutRichText({ content }: { content: AboutParagraph }) {
  if (typeof content === "string") {
    return content;
  }

  return content.map((part, index) => {
    if (typeof part === "string") {
      return part;
    }

    return (
      <NextLink
        className={textLinkClassName}
        href={part.href}
        key={`${part.href}-${index}`}
        rel={isExternalHref(part.href) ? "noreferrer noopener" : undefined}
        target={isExternalHref(part.href) ? "_blank" : undefined}
      >
        {part.label}
      </NextLink>
    );
  });
}

export function AboutParagraphText({
  className = aboutParagraphClassName,
  paragraph,
}: {
  className?: string;
  paragraph: AboutParagraph;
}) {
  return (
    <p className={className}>
      <AboutRichText content={paragraph} />
    </p>
  );
}

export function AboutImageFrame({
  image,
  priority = false,
}: {
  image: AboutImage;
  priority?: boolean;
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
        <figcaption className="border-border-secondary border-t px-300 py-200 font-verdana text-xs leading-relaxed text-fg-secondary">
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow?: string;
  text?: string;
  title: string;
}) {
  return (
    <header className="max-w-5xl space-y-200">
      {eyebrow ? (
        <p className="font-open-sans text-xs leading-normal font-bold tracking-normal text-primary uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl leading-tight font-bold text-fg-primary">
        {title}
      </h2>
      {text ? (
        <p className={aboutParagraphClassName}>
          {text}
        </p>
      ) : null}
    </header>
  );
}

import NextImage from "next/image"
import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"
import type { HomepagePromoContent } from "@/components/homepage/homepage.data.types"
import { sanitizeHomepagePromoHtml } from "./homepage-promo-html"

const HOMEPAGE_PROMO_SECTION_ID = "homepage-promo"

const DEFAULT_IMAGE_SRC =
  "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&w=1100&q=80"

type HomepagePromoSectionProps = {
  promo?: HomepagePromoContent | null
}

export function HomepagePromoSection({ promo }: HomepagePromoSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const tContent = useTranslations("content")
  const contentHtml = sanitizeHomepagePromoHtml(promo?.contentHtml ?? "")
  const imageAlt = promo?.imageAlt || tContent("home.promo.image_alt")
  const imageSrc = promo?.imageSrc || DEFAULT_IMAGE_SRC

  useEffect(() => {
    if (window.location.hash === `#${HOMEPAGE_PROMO_SECTION_ID}`) {
      sectionRef.current?.scrollIntoView({ block: "start" })
    }
  }, [])

  return (
    <section
      className="grid scroll-mt-homepage-promo-scroll-offset gap-400 rounded-2xl border border-border-secondary bg-surface p-400 md:grid-cols-2 md:p-550"
      id={HOMEPAGE_PROMO_SECTION_ID}
      ref={sectionRef}
    >
      <div className="overflow-hidden rounded-2xl border border-border-secondary">
        <NextImage
          alt={imageAlt}
          className="h-full min-h-950 w-full object-cover"
          height={900}
          quality={50}
          src={imageSrc}
          width={1100}
        />
      </div>

      <div className="flex flex-col justify-center gap-300">
        <h2 className="font-bold text-2xl text-fg-primary leading-tight">
          {promo?.heading || tContent("home.promo.heading")}
        </h2>
        {contentHtml ? (
          <div
            className="text-fg-secondary text-sm leading-relaxed [&_a]:font-bold [&_a]:underline [&_code]:font-mono [&_code]:text-xs [&_em]:italic [&_h1]:font-bold [&_h1]:text-fg-primary [&_h1]:text-xl [&_h2]:font-bold [&_h2]:text-fg-primary [&_h2]:text-lg [&_h3]:font-bold [&_h3]:text-fg-primary [&_h3]:text-md [&_h4]:font-bold [&_h4]:text-fg-primary [&_h5]:font-bold [&_h5]:text-fg-primary [&_h6]:font-bold [&_h6]:text-fg-primary [&_hr]:my-300 [&_hr]:border-border-secondary [&_li[aria-checked=true]]:before:bg-primary [&_li[role=checkbox]]:list-none [&_li[role=checkbox]]:before:mr-200 [&_li[role=checkbox]]:before:inline-block [&_li[role=checkbox]]:before:size-300 [&_li[role=checkbox]]:before:rounded-sm [&_li[role=checkbox]]:before:border [&_li[role=checkbox]]:before:border-border-primary [&_li[role=checkbox]]:before:align-middle [&_li[role=checkbox]]:before:content-[''] [&_li]:ml-400 [&_li]:list-disc [&_ol]:list-decimal [&_p+p]:mt-300 [&_strong]:font-bold [&_ul]:mt-250"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Payload rich text is normalized through the promo-specific sanitizer before rendering.
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <>
            <p className="text-fg-secondary text-sm leading-relaxed">
              {tContent("home.promo.paragraph_1")}
            </p>
            <p className="text-fg-secondary text-sm leading-relaxed">
              {tContent("home.promo.paragraph_2")}
            </p>
            <p className="text-fg-secondary text-sm leading-relaxed">
              {tContent("home.promo.paragraph_3")}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

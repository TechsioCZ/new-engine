import { SafeHtml } from "@techsio/ui-kit/atoms/safe-html"
import type { SafeHtmlPolicy } from "@techsio/ui-kit/atoms/safe-html"
import NextImage from "next/image"
import { useEffect, useRef } from "react"

import type { HomepagePromoContent } from "@/components/homepage/homepage-data-types"

import { sanitizeHomepagePromoHtml } from "./homepage-promo-html"

const HOMEPAGE_PROMO_SECTION_ID = "homepage-promo"

const HOMEPAGE_PROMO_POLICY: SafeHtmlPolicy = {
  allowedAttributes: {
    "*": ["title"],
    a: ["href", "rel", "target"],
    img: ["alt", "decoding", "height", "loading", "src", "width"],
    li: ["aria-checked", "role"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedTags: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
  ],
}

const DEFAULT_IMAGE = {
  alt: "Predajňa Herbatika",
  src: "https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?auto=format&fit=crop&w=1100&q=80",
}

interface HomepagePromoSectionProps {
  promo?: HomepagePromoContent | null
}

export const HomepagePromoSection = ({ promo }: HomepagePromoSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null)
  const imageAlt =
    promo?.imageAlt === undefined || promo.imageAlt === ""
      ? DEFAULT_IMAGE.alt
      : promo.imageAlt
  const imageSrc =
    promo?.imageSrc === undefined || promo.imageSrc === ""
      ? DEFAULT_IMAGE.src
      : promo.imageSrc
  const contentHtml = sanitizeHomepagePromoHtml(promo?.contentHtml ?? "")
  const hasContentHtml = contentHtml.length > 0

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
          {promo?.heading ??
            "Prírodná kozmetika, doplnky výživy a tradičná medicína"}
        </h2>
        {hasContentHtml ? (
          <div className="text-fg-secondary text-sm leading-relaxed [&_a]:font-bold [&_a]:underline [&_code]:font-mono [&_code]:text-xs [&_em]:italic [&_h1]:font-bold [&_h1]:text-fg-primary [&_h1]:text-xl [&_h2]:font-bold [&_h2]:text-fg-primary [&_h2]:text-lg [&_h3]:font-bold [&_h3]:text-fg-primary [&_h3]:text-md [&_h4]:font-bold [&_h4]:text-fg-primary [&_h5]:font-bold [&_h5]:text-fg-primary [&_h6]:font-bold [&_h6]:text-fg-primary [&_hr]:my-300 [&_hr]:border-border-secondary [&_li[aria-checked=true]]:before:bg-primary [&_li[role=checkbox]]:list-none [&_li[role=checkbox]]:before:mr-200 [&_li[role=checkbox]]:before:inline-block [&_li[role=checkbox]]:before:size-300 [&_li[role=checkbox]]:before:rounded-sm [&_li[role=checkbox]]:before:border [&_li[role=checkbox]]:before:border-border-primary [&_li[role=checkbox]]:before:align-middle [&_li[role=checkbox]]:before:content-[''] [&_li]:ml-400 [&_li]:list-disc [&_ol]:list-decimal [&_p+p]:mt-300 [&_strong]:font-bold [&_ul]:mt-250">
            <SafeHtml html={contentHtml} policy={HOMEPAGE_PROMO_POLICY} />
          </div>
        ) : (
          <>
            <p className="text-fg-secondary text-sm leading-relaxed">
              Spoznajte blahodarné účinky prírodnej kozmetiky a jej pozitívny
              vplyv nielen na pokožku. Upevnite si vaše zdravie pomocou doplnkov
              stravy a tradičnej medicíny.Toto všetko nájdete v našej pestrej
              ponuke, ktorá je navyše obohatená aj o zdravotné doplnky z
              prírodných materiálov.
            </p>
            <p className="text-fg-secondary text-sm leading-relaxed">
              Špecializujeme sa na výber tých najkvalitnejších produktov, ktoré
              aj my sami používame, vylepšujeme a opakovane testujeme. Máme radi
              kvalitu a potrpíme si na detaily. Sme pripravení, pomôcť vám s
              výberom produktov špeciálne podľa vašich potrieb alebo na váš
              zdravotný problém.
            </p>
            <p className="text-fg-secondary text-sm leading-relaxed">
              Herbatica má už aj svoju značku, pod ktorou vyrábame množstvo
              produktov, ktoré inde nenájdete. Máme radi kvalitu a detaily a na
              tie sa sústredíme v každom našom produkte.
            </p>
          </>
        )}
      </div>
    </section>
  )
}

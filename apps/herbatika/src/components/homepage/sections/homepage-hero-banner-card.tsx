import { buttonVariants } from "@techsio/ui-kit/atoms/button"
import { useTranslations } from "next-intl"
import Image from "next/image"
import type { MouseEventHandler, PointerEventHandler } from "react"

import NextLink from "@/components/app-link"
import type { HeroBannerItem } from "@/components/homepage/homepage.data"

interface HomepageHeroBannerCardProps {
  banner: HeroBannerItem
  onClickCapture: MouseEventHandler<HTMLAnchorElement>
  onPointerDownCapture: PointerEventHandler<HTMLAnchorElement>
}

export const HomepageHeroBannerCard = ({
  banner,
  onClickCapture,
  onPointerDownCapture,
}: HomepageHeroBannerCardProps) => {
  const tContent = useTranslations("content")
  const label = banner.title ?? banner.imageAlt ?? banner.badge
  const labelText = label ?? ""
  const ctaLabel = banner.ctaLabel ?? ""
  const ariaLabel =
    labelText !== "" && ctaLabel !== ""
      ? tContent("home.hero.link_aria", {
          cta: ctaLabel,
          label: labelText,
        })
      : labelText

  return (
    <NextLink
      aria-label={ariaLabel}
      className="group relative h-full overflow-hidden rounded-lg font-open-sans shadow-sm"
      href={banner.href}
      onClickCapture={onClickCapture}
      onPointerDownCapture={onPointerDownCapture}
    >
      <Image
        alt={banner.imageAlt ?? label ?? ""}
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 480px) 50vw, 100vw"
        src={banner.imageSrc}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-fg-primary/85 via-fg-primary/35 to-transparent" />
      {typeof banner.title === "string" && banner.title !== "" && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-600 text-fg-reverse">
          <p className="line-clamp-2 font-bold text-2xl hero-title-leading">
            {banner.title}
          </p>
          {banner.subtitle !== null &&
            banner.subtitle !== undefined &&
            banner.subtitle !== "" && (
              <p className="line-clamp-2 font-semibold text-fg-reverse text-md leading-snug">
                {banner.subtitle}
              </p>
            )}
          {banner.ctaLabel !== null &&
          banner.ctaLabel !== undefined &&
          banner.ctaLabel !== "" ? (
            <span
              className={buttonVariants({
                className: "mt-350 rounded-xl px-450 py-250 text-md",
                size: "md",
              })}
            >
              {banner.ctaLabel}
            </span>
          ) : null}
        </div>
      )}
    </NextLink>
  )
}

import { buttonVariants } from "@techsio/ui-kit/atoms/button"
import { Carousel } from "@techsio/ui-kit/molecules/carousel"
import type { CarouselSlide } from "@techsio/ui-kit/molecules/carousel"
import { useTranslations } from "next-intl"
import Image from "next/image"
import type { MouseEventHandler, PointerEventHandler } from "react"
import { useEffect, useState } from "react"

import NextLink from "@/components/app-link"
import type { HeroBannerItem } from "@/components/homepage/homepage.data"

const HERO_SLIDE_SPACING = "var(--spacing-400)"
const HERO_SLIDES_PER_PAGE = {
  lg: 4.1,
  md: 3.1,
  sm: 2,
  xs: 1,
} as const

interface HeroBannerCardProps {
  banner: HeroBannerItem
  onClickCapture: MouseEventHandler<HTMLAnchorElement>
  onPointerDownCapture: PointerEventHandler<HTMLAnchorElement>
}

const HeroBannerCard = ({
  banner,
  onClickCapture,
  onPointerDownCapture,
}: HeroBannerCardProps) => {
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

const buildHeroSlides = (
  banners: HeroBannerItem[],
  onClickCapture: MouseEventHandler<HTMLAnchorElement>,
  onPointerDownCapture: PointerEventHandler<HTMLAnchorElement>,
): CarouselSlide[] =>
  banners.map((banner) => ({
    content: (
      <HeroBannerCard
        banner={banner}
        onClickCapture={onClickCapture}
        onPointerDownCapture={onPointerDownCapture}
      />
    ),
    id: banner.id,
  }))

interface HomepageHeroCarouselSectionProps {
  banners: HeroBannerItem[]
}

interface HeroCarouselProps {
  banners: HeroBannerItem[]
  restoreKey: number
  slidesClassName?: string
  slidesPerPage?: number
  spacing?: string
}

const usePageRestoreKey = () => {
  const [restoreKey, setRestoreKey] = useState(0)

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setRestoreKey((currentKey) => currentKey + 1)
      }
    }

    window.addEventListener("pageshow", handlePageShow)

    return () => {
      window.removeEventListener("pageshow", handlePageShow)
    }
  }, [])

  return restoreKey
}

const HeroCarousel = ({
  banners,
  restoreKey,
  slidesClassName = "h-homepage-hero-carousel",
  slidesPerPage = 1,
  spacing = HERO_SLIDE_SPACING,
}: HeroCarouselProps) => {
  const [didDrag, setDidDrag] = useState(false)
  const handleSlidePointerDownCapture: PointerEventHandler<
    HTMLAnchorElement
  > = () => {
    setDidDrag(false)
  }
  const handleSlideClickCapture: MouseEventHandler<HTMLAnchorElement> = (
    event,
  ) => {
    if (event.detail === 0) {
      setDidDrag(false)
      return
    }

    if (!didDrag) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    setDidDrag(false)
  }
  const slides = buildHeroSlides(
    banners,
    handleSlideClickCapture,
    handleSlidePointerDownCapture,
  )
  const hasOverflow = slides.length > slidesPerPage

  return (
    <Carousel.Root
      aspectRatio="none"
      className="w-full"
      key={restoreKey}
      loop={hasOverflow}
      onDragStatusChange={(details: { type: string }) => {
        if (details.type === "dragging") {
          setDidDrag(true)
        }
      }}
      size="full"
      slideCount={slides.length}
      slidesPerMove={1}
      slidesPerPage={slidesPerPage}
      spacing={spacing}
    >
      <Carousel.Slides className={slidesClassName} slides={slides} />
      {hasOverflow ? (
        <>
          <Carousel.Previous className="-translate-y-1/2 absolute top-1/2 left-200 aspect-square rounded-full shadow-carousel-trigger active:text-carousel-trigger-fg-active" />
          <Carousel.Next className="-translate-y-1/2 absolute top-1/2 right-200 aspect-square rounded-full shadow-carousel-trigger active:text-carousel-trigger-fg-active" />
        </>
      ) : null}
    </Carousel.Root>
  )
}

export const HomepageHeroCarouselSection = ({
  banners,
}: HomepageHeroCarouselSectionProps) => {
  const restoreKey = usePageRestoreKey()

  return (
    <section>
      <div className="xs:hidden">
        <HeroCarousel
          banners={banners}
          restoreKey={restoreKey}
          slidesPerPage={HERO_SLIDES_PER_PAGE.xs}
        />
      </div>
      <div className="xs:block hidden md:hidden">
        <HeroCarousel
          banners={banners}
          restoreKey={restoreKey}
          slidesPerPage={HERO_SLIDES_PER_PAGE.sm}
        />
      </div>
      <div className="hidden md:block lg:hidden">
        <HeroCarousel
          banners={banners}
          restoreKey={restoreKey}
          slidesPerPage={HERO_SLIDES_PER_PAGE.md}
        />
      </div>
      <div className="hidden lg:block">
        <HeroCarousel
          banners={banners}
          restoreKey={restoreKey}
          slidesPerPage={HERO_SLIDES_PER_PAGE.lg}
        />
      </div>
    </section>
  )
}

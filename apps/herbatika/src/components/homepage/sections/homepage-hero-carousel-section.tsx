import { Carousel } from "@techsio/ui-kit/molecules/carousel"
import type { CarouselSlide } from "@techsio/ui-kit/molecules/carousel"
import type { MouseEventHandler, PointerEventHandler } from "react"
import { useEffect, useState } from "react"

import type { HeroBannerItem } from "@/components/homepage/homepage.data"

import { HomepageHeroBannerCard } from "./homepage-hero-banner-card"

const HERO_SLIDE_SPACING = "var(--spacing-400)"
const HERO_SLIDES_PER_PAGE = {
  lg: 4.1,
  md: 3.1,
  sm: 2,
  xs: 1,
} as const

const buildHeroSlides = (
  banners: HeroBannerItem[],
  onClickCapture: MouseEventHandler<HTMLAnchorElement>,
  onPointerDownCapture: PointerEventHandler<HTMLAnchorElement>,
): CarouselSlide[] =>
  banners.map((banner) => ({
    content: (
      <HomepageHeroBannerCard
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

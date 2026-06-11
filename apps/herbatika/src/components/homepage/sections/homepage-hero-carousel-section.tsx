import { Button } from "@techsio/ui-kit/atoms/button"
import {
  Carousel,
  type CarouselSlide,
} from "@techsio/ui-kit/molecules/carousel"
import Image from "next/image"
import NextLink from "next/link"
import { useMemo } from "react"
import type { HeroBannerItem } from "@/components/homepage/homepage.data"

const HERO_CTA_LABEL = "Zistiť viac"
const HERO_SLIDE_SPACING = "var(--spacing-400)"
const HERO_SLIDES_PER_PAGE = {
  xs: 1,
  sm: 2,
  md: 3.1,
  lg: 4.1,
} as const

function HeroBannerCard({ banner }: { banner: HeroBannerItem }) {
  return (
    <NextLink
      aria-label={`${banner.title} - ${HERO_CTA_LABEL}`}
      className="group relative h-full overflow-hidden rounded-lg font-open-sans shadow-sm"
      href={banner.href}
    >
      <Image
        alt={banner.id}
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        fill
        src={banner.imageSrc}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-fg-primary/85 via-fg-primary/35 to-transparent" />
      {banner.title && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-600 text-fg-reverse">
          <p className="line-clamp-2 font-bold text-2xl leading-[26px]">
            {banner.title}
          </p>
          {banner.subtitle && (
            <p className="line-clamp-2 font-semibold text-fg-reverse text-md leading-snug">
              {banner.subtitle}
            </p>
          )}
          <Button className="mt-350 rounded-xl px-450 py-250 text-md" size="md">
            {HERO_CTA_LABEL}
          </Button>
        </div>
      )}
    </NextLink>
  )
}

const buildHeroSlides = (banners: HeroBannerItem[]): CarouselSlide[] =>
  banners.map((banner) => ({
    id: banner.id,
    content: <HeroBannerCard banner={banner} />,
  }))

type HomepageHeroCarouselSectionProps = {
  banners: HeroBannerItem[]
}

type HeroCarouselProps = {
  slides: CarouselSlide[]
  slidesClassName?: string
  slidesPerPage?: number
  spacing?: string
}

function HeroCarousel({
  slides,
  slidesClassName = "h-homepage-hero-carousel",
  slidesPerPage = 1,
  spacing = HERO_SLIDE_SPACING,
}: HeroCarouselProps) {
  const hasOverflow = slides.length > slidesPerPage

  return (
    <Carousel.Root
      aspectRatio="none"
      className="w-full"
      loop={hasOverflow}
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

export function HomepageHeroCarouselSection({
  banners,
}: HomepageHeroCarouselSectionProps) {
  const slides = useMemo(() => buildHeroSlides(banners), [banners])

  return (
    <section>
      <div className="xs:hidden">
        <HeroCarousel slides={slides} slidesPerPage={HERO_SLIDES_PER_PAGE.xs} />
      </div>
      <div className="xs:block hidden md:hidden">
        <HeroCarousel slides={slides} slidesPerPage={HERO_SLIDES_PER_PAGE.sm} />
      </div>
      <div className="hidden md:block lg:hidden">
        <HeroCarousel slides={slides} slidesPerPage={HERO_SLIDES_PER_PAGE.md} />
      </div>
      <div className="hidden lg:block">
        <HeroCarousel slides={slides} slidesPerPage={HERO_SLIDES_PER_PAGE.lg} />
      </div>
    </section>
  )
}

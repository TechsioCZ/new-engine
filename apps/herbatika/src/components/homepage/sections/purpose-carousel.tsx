"use client"

import {
  Carousel,
  type CarouselSlide,
} from "@techsio/ui-kit/molecules/carousel"
import NextImage from "next/image"
import { useTranslations } from "next-intl"
import type { ComponentProps } from "react"
import type { HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS } from "@/components/header/herbatika-header.submenu-data"
import { useHerbatikaHeaderSubmenu } from "@/components/header/use-herbatika-header-submenu"
import { StorefrontLink } from "@/components/storefront-link"
import { TextActionLink } from "@/components/text-action-link"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"

type ImageSource = ComponentProps<typeof NextImage>["src"]
type PurposeCarouselRootHandle =
  (typeof HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS)[number]["rootHandle"]

type PurposeCarouselItem = {
  id: string
  label: string
  src: ImageSource
}

type PurposeCarouselProps = {
  categoryPublicSlugsById: PublicEntitySlugMap
  items?: PurposeCarouselItem[]
  rootHandle?: PurposeCarouselRootHandle
  title?: string
}

type PurposeCarouselSlidesProps = {
  slides: CarouselSlide[]
  slidesPerPage: number
}

const DEFAULT_ROOT_HANDLE: PurposeCarouselRootHandle = "trapi-ma"

const buildResolvedPurposeCarouselItems = (
  rootHandle: PurposeCarouselRootHandle,
  groupsByRootHandle: ReturnType<
    typeof useHerbatikaHeaderSubmenu
  >["groupsByRootHandle"]
): PurposeCarouselItem[] => {
  const group = groupsByRootHandle.get(rootHandle)
  if (!group) {
    return []
  }

  return group.featuredItems.flatMap((item) => {
    if (!item.src) {
      return []
    }

    return [
      {
        id: item.id,
        label: item.label,
        src: item.src,
      },
    ]
  })
}

const buildImageSlides = (
  items: PurposeCarouselItem[],
  categoryPublicSlugsById: PublicEntitySlugMap,
  market: ReturnType<typeof useMarketContext>["code"]
): CarouselSlide[] =>
  items.flatMap((item) => {
    const href = buildProjectedEntityPath(
      "category",
      { publicSlug: categoryPublicSlugsById[item.id] },
      market
    )
    if (!href) {
      return []
    }

    return [
      {
        id: item.id,
        content: (
          <StorefrontLink
            className="grid h-full min-h-800 w-full grid-rows-[auto_1fr] items-start justify-center gap-150 rounded-md border border-border-secondary bg-surface px-200 py-200 text-center text-fg-primary"
            href={href}
          >
            <div className="flex h-850 w-full items-center justify-center">
              <NextImage
                alt={item.label}
                className="aspect-square h-category-image object-contain"
                height={86}
                src={item.src}
                width={86}
              />
            </div>
            <span className="line-clamp-2 max-w-full font-bold font-verdana text-fg-primary text-support leading-snug">
              {item.label}
            </span>
          </StorefrontLink>
        ),
      },
    ]
  })

function PurposeCarouselSlides({
  slides,
  slidesPerPage,
}: PurposeCarouselSlidesProps) {
  const hasOverflow = slides.length > slidesPerPage

  return (
    <Carousel.Root
      aspectRatio="none"
      className="w-full p-200"
      loop={hasOverflow}
      size="full"
      slideCount={slides.length}
      slidesPerMove={1}
      slidesPerPage={slidesPerPage}
      spacing="var(--spacing-300)"
    >
      <Carousel.Slides slides={slides} />
      {hasOverflow ? (
        <>
          <Carousel.Previous
            className="-translate-y-1/2 absolute top-1/2 left-100 aspect-square rounded-full text-lg shadow-carousel-trigger active:text-carousel-trigger-fg-active"
            icon="token-icon-chevron-left"
          />
          <Carousel.Next
            className="-translate-y-1/2 absolute top-1/2 right-100 aspect-square rounded-full text-lg shadow-carousel-trigger active:text-carousel-trigger-fg-active"
            icon="token-icon-chevron-right"
          />
        </>
      ) : null}
    </Carousel.Root>
  )
}

export function PurposeCarousel({
  categoryPublicSlugsById,
  items,
  rootHandle = DEFAULT_ROOT_HANDLE,
  title,
}: PurposeCarouselProps) {
  const tContent = useTranslations("content")
  const market = useMarketContext().code
  const { categoriesQuery, groupsByRootHandle } = useHerbatikaHeaderSubmenu(
    categoryPublicSlugsById
  )
  const resolvedItems =
    items ?? buildResolvedPurposeCarouselItems(rootHandle, groupsByRootHandle)
  const resolvedTitle = title ?? tContent("home.purpose.title")
  const slides = buildImageSlides(
    resolvedItems,
    categoryPublicSlugsById,
    market
  )
  const rootSourceId = categoriesQuery.categories.find(
    (category) => category.handle === rootHandle
  )?.id
  const viewAllHref = buildProjectedEntityPath(
    "category",
    {
      publicSlug: rootSourceId
        ? categoryPublicSlugsById[rootSourceId]
        : undefined,
    },
    market
  )

  if (slides.length === 0) {
    return null
  }

  return (
    <section className="space-y-350" id="test-nakupujte-carousel">
      <div className="flex items-center justify-between gap-300">
        <h2 className="font-bold text-3xl text-fg-primary leading-none">
          {resolvedTitle}
        </h2>
        {viewAllHref ? <TextActionLink href={viewAllHref} /> : null}
      </div>

      <div className="space-y-200">
        <div className="md:hidden">
          <PurposeCarouselSlides slides={slides} slidesPerPage={3.2} />
        </div>
        <div className="hidden md:block xl:hidden">
          <PurposeCarouselSlides slides={slides} slidesPerPage={5.2} />
        </div>
        <div className="hidden xl:block">
          <PurposeCarouselSlides slides={slides} slidesPerPage={7.2} />
        </div>
      </div>
    </section>
  )
}

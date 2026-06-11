"use client"

import { Link } from "@techsio/ui-kit/atoms/link"
import {
  Carousel,
  type CarouselSlide,
} from "@techsio/ui-kit/molecules/carousel"
import NextImage from "next/image"
import NextLink from "next/link"
import type { ComponentProps } from "react"
import { useMemo } from "react"
import type { HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS } from "@/components/header/herbatika-header.submenu-data"
import { useHerbatikaHeaderSubmenu } from "@/components/header/use-herbatika-header-submenu"
import { TextActionLink } from "@/components/text-action-link"

type ImageSource = ComponentProps<typeof NextImage>["src"]
type PurposeCarouselRootHandle =
  (typeof HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS)[number]["rootHandle"]

type PurposeCarouselItem = {
  href: string
  id: string
  label: string
  src: ImageSource
}

type PurposeCarouselProps = {
  items?: PurposeCarouselItem[]
  rootHandle?: PurposeCarouselRootHandle
  title?: string
  viewAllHref?: string
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
        href: `/c/${item.handle}`,
        id: item.id,
        label: item.label,
        src: item.src,
      },
    ]
  })
}

const buildImageSlides = (items: PurposeCarouselItem[]): CarouselSlide[] =>
  items.map((item) => ({
    id: item.id,
    content: (
      <Link
        as={NextLink}
        className="grid h-full min-h-800 w-full grid-rows-[auto_1fr] items-start justify-center gap-150 rounded-md border border-border-secondary bg-surface px-200 py-200 text-center text-fg-primary"
        href={item.href}
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
      </Link>
    ),
  }))

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
  items,
  rootHandle = DEFAULT_ROOT_HANDLE,
  title = "Čo vás trápi? Nakupujte podľa účelu",
  viewAllHref,
}: PurposeCarouselProps) {
  const { groupsByRootHandle } = useHerbatikaHeaderSubmenu()
  const resolvedItems = useMemo(
    () =>
      items ??
      buildResolvedPurposeCarouselItems(rootHandle, groupsByRootHandle),
    [groupsByRootHandle, items, rootHandle]
  )
  const slides = useMemo(() => buildImageSlides(resolvedItems), [resolvedItems])

  if (resolvedItems.length === 0) {
    return null
  }

  return (
    <section className="space-y-350" id="test-nakupujte-carousel">
      <div className="flex items-center justify-between gap-300">
        <h2 className="font-bold text-3xl text-fg-primary leading-none">
          {title}
        </h2>
        <TextActionLink href={viewAllHref ?? `/c/${rootHandle}`} />
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

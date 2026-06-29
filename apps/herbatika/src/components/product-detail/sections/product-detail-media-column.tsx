"use client"

import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Link } from "@techsio/ui-kit/atoms/link"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Gallery, type GalleryItem } from "@techsio/ui-kit/organisms/gallery"
import NextImage from "next/image"
import NextLink from "next/link"
import type { ProductMediaFact } from "@/components/product-detail/product-detail.types"
import { ProductDetailGalleryLightbox } from "@/components/product-detail/sections/product-detail-gallery-lightbox"
import { useProductDetailGalleryState } from "@/components/product-detail/sections/use-product-detail-gallery-state"
import { SupportingText } from "@/components/text/supporting-text"
import { useMediaQuery } from "@/hooks/use-media-query"

type ProductDetailMediaColumnProps = {
  discountPercent: number | null
  galleryItems: GalleryItem[]
  mediaFacts: ProductMediaFact[]
}

export function ProductDetailMediaColumn({
  discountPercent,
  galleryItems,
  mediaFacts,
}: ProductDetailMediaColumnProps) {
  const isDesktopGallery = useMediaQuery("md")
  const carouselOrientation = isDesktopGallery ? "vertical" : "horizontal"
  const {
    cancelPendingOpen,
    galleryItemsWithFallback,
    isLightboxOpen,
    safeSelectedImageIndex,
    setIsLightboxOpen,
    setSelectedImageIndex,
  } = useProductDetailGalleryState({ galleryItems })

  return (
    <div className="min-w-0 space-y-300">
      <Gallery
        carouselProps={{
          aspectRatio: "square",
          loop: galleryItemsWithFallback.length > 1,
          objectFit: "contain",
          orientation: carouselOrientation,
          size: "full",
          width: "100%",
          onDragStatusChange: (details) => {
            if (details.type === "dragging") {
              cancelPendingOpen()
            }
          },
        }}
        className="min-w-0 md:grid-cols-[auto_minmax(0,1fr)]"
        hideThumbnailsWhenSingle={false}
        items={galleryItemsWithFallback}
        onValueChange={({ value }) => setSelectedImageIndex(value)}
        orientation="vertical"
        thumbnailSize={88}
        value={safeSelectedImageIndex}
      >
        <Gallery.Thumbnails
          className="md:col-start-1 md:row-start-1"
          listClassName="gap-100"
        />
        <Gallery.Main className="relative w-full flex-col overflow-hidden rounded-base bg-surface md:col-start-2 md:row-start-1">
          {typeof discountPercent === "number" && discountPercent > 0 ? (
            <Badge
              className="absolute top-300 right-300 z-1 flex aspect-square w-850 rounded-full text-sm"
              variant="discount"
            >
              {`-${discountPercent}%`}
            </Badge>
          ) : null}

          <Gallery.Carousel className="min-w-0 px-gallery-carousel">
            <Gallery.Slides className="mx-auto h-full max-h-[408px] w-full max-w-full md:max-w-[408px]" />
          </Gallery.Carousel>

          {mediaFacts.length > 0 ? (
            <div className="flex items-center justify-center divide-x divide-border-secondary border-border-secondary border-t bg-surface p-550">
              {mediaFacts.slice(0, 2).map((fact) => (
                <div
                  className="flex items-center gap-200 px-350 py-250"
                  key={fact.id}
                >
                  <span className="flex items-center justify-center rounded-xs bg-highlight p-200">
                    <Icon className="text-primary" icon={fact.icon} size="lg" />
                  </span>
                  <SupportingText className="text-fg-secondary text-md leading-snug">
                    <span className="font-semibold text-primary">{`${fact.value} `}</span>
                    <span>{fact.label}</span>
                  </SupportingText>
                </div>
              ))}
            </div>
          ) : null}
        </Gallery.Main>
      </Gallery>

      <ProductDetailGalleryLightbox
        items={galleryItemsWithFallback}
        onOpenChange={setIsLightboxOpen}
        onValueChange={setSelectedImageIndex}
        open={isLightboxOpen}
        value={safeSelectedImageIndex}
      />

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-250 rounded-base border border-primary/20 bg-surface p-400 md:flex-nowrap lg:max-xl:grid lg:max-xl:grid-cols-2 xl:flex-wrap">
        <div className="flex min-w-0 items-center gap-150 lg:max-xl:col-span-2">
          <NextImage
            alt="Poradca Herbatika"
            className="size-11 shrink-0 rounded-full object-cover"
            height={46}
            quality={50}
            src="/photos/image.png"
            width={46}
          />
          <div className="min-w-0 space-y-0">
            <p className="font-bold text-fg-strong text-lg leading-tight">
              Potrebujete poradiť?
            </p>
            <SupportingText className="text-fg-secondary text-xs leading-tight">
              Kontaktujte nás, radi vám pomôžeme
            </SupportingText>
          </div>
        </div>

        <div className="flex items-center gap-200">
          <Icon
            className="text-primary"
            icon="token-icon-phone-talk"
            size="xl"
          />
          <Link
            className="whitespace-nowrap font-medium text-fg-strong text-sm leading-tight hover:text-fg-primary"
            href="tel:+421232112345"
          >
            +421 2/321 123 45
          </Link>
        </div>
        <LinkButton
          as={NextLink}
          className="min-h-chat-button shrink-0 px-350 py-150"
          href="/"
          size="sm"
          theme="outlined"
          variant="primary"
        >
          Spustiť chat
        </LinkButton>
      </div>
    </div>
  )
}

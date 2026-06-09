"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Gallery, type GalleryItem } from "@techsio/ui-kit/organisms/gallery";
import NextImage from "next/image";
import NextLink from "next/link";
import { useMemo } from "react";
import { FallbackImage } from "@/components/fallback-image";
import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants";
import type { ProductMediaFact } from "@/components/product-detail/product-detail.types";
import { SupportingText } from "@/components/text/supporting-text";
import { useMediaQuery } from "@/hooks/use-media-query";

type ProductDetailMediaColumnProps = {
  discountPercent: number | null;
  galleryItems: GalleryItem[];
  mediaFacts: ProductMediaFact[];
};

export function ProductDetailMediaColumn({
  discountPercent,
  galleryItems,
  mediaFacts,
}: ProductDetailMediaColumnProps) {
  const isDesktopGallery = useMediaQuery("md");
  const carouselOrientation = isDesktopGallery ? "vertical" : "horizontal";
  const galleryItemsWithFallback = useMemo<GalleryItem[]>(
    () =>
      galleryItems.map((item) => {
        const imageSrc = item.src || FALLBACK_IMAGE_SRC;
        const imageAlt = item.alt || "Produkt";

        return {
          ...item,
          alt: imageAlt,
          src: imageSrc,
          content: item.content ?? (
            <span className="flex h-full w-full items-center justify-center">
              <FallbackImage
                alt={imageAlt}
                className="h-full w-full object-contain"
                height={408}
                loading="eager"
                quality={75}
                sizes="(max-width: 767px) 60vw, (max-width: 1023px) 408px, 32vw"
                src={imageSrc}
                width={408}
              />
            </span>
          ),
          thumbnailContent: item.thumbnailContent ?? (
            <span className="flex h-full w-full items-center justify-center">
              <FallbackImage
                alt={item.thumbnailAlt || imageAlt}
                className="h-full w-full object-contain"
                height={88}
                quality={60}
                sizes="88px"
                src={item.thumbnailSrc || imageSrc}
                width={88}
              />
            </span>
          ),
        };
      }),
    [galleryItems],
  );

  return (
    <div className="min-w-0 space-y-300">
      <Gallery
        items={galleryItemsWithFallback}
        orientation="vertical"
        thumbnailSize={88}
        hideThumbnailsWhenSingle={false}
        className="min-w-0 md:grid-cols-[auto_minmax(0,1fr)]"
        carouselProps={{
          aspectRatio: "square",
          loop: true,
          objectFit: "contain",
          orientation: carouselOrientation,
          size: "full",
          width: "100%",
        }}
      >
        <Gallery.Thumbnails
          className="md:col-start-1 md:row-start-1"
          listClassName="gap-100"
        />
        <Gallery.Main className="relative w-full flex-col overflow-hidden rounded-base bg-surface md:col-start-2 md:row-start-1">
          {typeof discountPercent === "number" && discountPercent > 0 ? (
            <Badge
              className="absolute top-300 right-300 z-1 flex w-850 aspect-square rounded-full text-sm"
              variant="discount"
            >
              {`-${discountPercent}%`}
            </Badge>
          ) : null}

          <Gallery.Carousel className="min-w-0 px-gallery-carousel">
            <Gallery.Slides className="mx-auto h-full w-full max-w-full max-h-[408px] md:max-w-[408px]" />
          </Gallery.Carousel>

          {mediaFacts.length > 0 ? (
            <div className="flex items-center justify-center divide-x divide-border-secondary border-t border-border-secondary bg-surface p-550">
              {mediaFacts.slice(0, 2).map((fact) => (
                <div
                  className="flex items-center gap-200 px-350 py-250"
                  key={fact.id}
                >
                  <span className="flex items-center justify-center rounded-xs bg-highlight p-200">
                    <Icon className="text-primary" icon={fact.icon} size="lg" />
                  </span>
                  <SupportingText className="text-md leading-snug text-fg-secondary">
                    <span className="font-semibold text-primary">{`${fact.value} `}</span>
                    <span>{fact.label}</span>
                  </SupportingText>
                </div>
              ))}
            </div>
          ) : null}
        </Gallery.Main>
      </Gallery>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-250 rounded-base border border-primary/20 bg-surface p-400 md:flex-nowrap xl:flex-wrap lg:max-xl:grid lg:max-xl:grid-cols-2">
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
            <p className="text-lg font-bold leading-tight text-fg-strong">
              Potrebujete poradiť?
            </p>
            <SupportingText className="text-xs leading-tight text-fg-secondary">
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
            as={NextLink}
            className="whitespace-nowrap text-sm leading-tight font-medium text-fg-strong hover:text-fg-primary"
            href="tel:+421232112345"
          >
            +421 2/321 123 45
          </Link>
        </div>
        <LinkButton
          as={NextLink}
          className="shrink-0 py-150 px-350 min-h-chat-button"
          href="/kontakt"
          size="sm"
          theme="outlined"
          variant="primary"
        >
          Spustiť chat
        </LinkButton>
      </div>
    </div>
  );
}

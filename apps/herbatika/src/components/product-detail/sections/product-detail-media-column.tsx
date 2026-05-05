"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Gallery, type GalleryItem } from "@techsio/ui-kit/organisms/gallery";
import NextLink from "next/link";
import NextImage from "next/image";
import type { ProductMediaFact } from "@/components/product-detail/product-detail.types";
import { SupportingText } from "@/components/text/supporting-text";

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
  return (
    <div className="space-y-300">
      <Gallery
        items={galleryItems}
        orientation="vertical"
        thumbnailSize={88}
        hideThumbnailsWhenSingle={false}
        className="md:grid-cols-[auto_minmax(0,1fr)]"
        carouselProps={{
          aspectRatio: "square",
          loop: true,
          objectFit: "contain",
          orientation: "vertical",
          size: "full",
          width: "100%",
        }}
      >
        <Gallery.Thumbnails
          className="md:col-start-1 md:row-start-1"
          listClassName="gap-100"
        />
        <Gallery.Main className="relative flex-col overflow-hidden rounded-base bg-surface md:col-start-2 md:row-start-1">
          {typeof discountPercent === "number" && discountPercent > 0 ? (
            <Badge
              className="absolute top-300 right-300 z-1 flex w-850 aspect-square rounded-full text-sm"
              variant="discount"
            >
              {`-${discountPercent}%`}
            </Badge>
          ) : null}

          <Gallery.Carousel className="px-gallery-carousel">
            <Gallery.Slides className="h-full mx-auto max-w-[408px] max-h-[408px]"/>
          </Gallery.Carousel>

          {mediaFacts.length > 0 ? (
            <div className="flex items-center justify-center divide-x divide-border-secondary border-t border-border-secondary bg-surface p-550">
              {mediaFacts.slice(0, 2).map((fact) => (
                <div className="flex items-center gap-200 px-350 py-250" key={fact.id}>
                  <span className="flex h-600 w-600 items-center justify-center rounded-xs bg-highlight">
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

      <div className="flex flex-wrap items-center justify-between gap-250 rounded-lg border border-primary/20 bg-surface p-400 md:flex-nowrap">
        <div className="flex items-center gap-150">
          <NextImage
            alt="Poradca Herbatika"
            className="size-8 shrink-0 rounded-full object-cover"
            height={32}
            quality={50}
            src="/photos/image.png"
            width={32}
          />
          <div className="space-y-0">
            <p className="whitespace-nowrap text-md font-bold leading-tight text-fg-strong">
              Potrebujete poradiť?
            </p>
            <SupportingText className="whitespace-nowrap text-2xs leading-tight text-fg-secondary">
              Kontaktujte nás, radi vám pomôžeme
            </SupportingText>
          </div>
        </div>

        <div className="flex items-center gap-200">
          <Icon className="text-primary" icon="token-icon-phone" size="2xl" />
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
          className="shrink-0"
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

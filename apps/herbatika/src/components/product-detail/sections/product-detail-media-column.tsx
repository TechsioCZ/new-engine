"use client";

import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Gallery, type GalleryItem } from "@techsio/ui-kit/organisms/gallery";
import NextLink from "next/link";
import type { ProductOfferState } from "@/components/product-detail/product-detail.types";

type ProductDetailMediaColumnProps = {
  galleryItems: GalleryItem[];
  offerState: ProductOfferState;
};

export function ProductDetailMediaColumn({
  galleryItems,
  offerState,
}: ProductDetailMediaColumnProps) {
  return (
    <div className="space-y-300">
      <Gallery
        items={galleryItems}
        orientation="vertical"
        thumbnailSize={72}
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
        <Gallery.Main className="overflow-hidden rounded-md md:col-start-2 md:row-start-1">
          <Gallery.Carousel>
            <Gallery.Slides />
          </Gallery.Carousel>
        </Gallery.Main>
      </Gallery>

      <div className="grid gap-200 sm:grid-cols-3">
        <div className="flex items-center gap-150 rounded-lg border border-border-secondary bg-surface-secondary px-250 py-200">
          <Icon className="text-primary" icon="token-icon-check" />
          <ExtraText className="font-semibold text-fg-primary">
            {typeof offerState.stockAmount === "number"
              ? `${offerState.stockAmount} ks skladom`
              : offerState.availabilityLabel}
          </ExtraText>
        </div>
        <div className="flex items-center gap-150 rounded-lg border border-border-secondary bg-surface-secondary px-250 py-200">
          <Icon className="text-primary" icon="token-icon-check" />
          <ExtraText className="font-semibold text-fg-primary">
            {offerState.unitLabel ? `Balenie: ${offerState.unitLabel}` : "Rýchle doručenie"}
          </ExtraText>
        </div>
        <div className="flex items-center gap-150 rounded-lg border border-border-secondary bg-surface-secondary px-250 py-200">
          <Icon className="text-primary" icon="token-icon-check" />
          <ExtraText className="font-semibold text-fg-primary">Overený produkt</ExtraText>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-250 rounded-lg border border-primary/20 bg-surface p-400 md:flex-nowrap">
        <div className="flex items-center gap-150">
          <Image
            alt="Poradca Herbatika"
            className="size-8 shrink-0 rounded-full object-cover"
            src="/photos/image.png"
          />
          <div className="space-y-0">
            <p className="whitespace-nowrap text-md font-bold leading-tight text-fg-strong">
              Potrebujete poradiť?
            </p>
            <ExtraText className="whitespace-nowrap text-2xs leading-tight text-fg-secondary">
              Kontaktujte nás, radi vám pomôžeme
            </ExtraText>
          </div>
        </div>

        <div className="flex items-center gap-200">
          <Icon className="text-2xl text-primary" icon="icon-[mdi--phone-outline]" />
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

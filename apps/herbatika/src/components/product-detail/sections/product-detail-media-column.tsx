"use client";

import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import type { GalleryItem } from "@techsio/ui-kit/organisms/gallery";
import { GalleryTemplate } from "@techsio/ui-kit/templates/gallery";
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
      <GalleryTemplate
        aspectRatio="square"
        fitParent
        items={galleryItems}
        mainClassName="overflow-hidden rounded-xl border border-border-secondary bg-overlay"
        orientation="vertical"
        thumbnailSize={72}
        thumbnailsListClassName="gap-100"
      />

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

      <div className="flex flex-wrap items-center justify-between gap-300 rounded-lg border border-border-secondary bg-surface p-300">
        <div className="space-y-100">
          <p className="text-sm font-semibold text-fg-primary">Potrebujete poradiť?</p>
          <ExtraText className="text-fg-secondary">
            Kontaktujte nás, radi vám pomôžeme.
          </ExtraText>
          <Link
            as={NextLink}
            className="text-sm font-semibold text-primary"
            href="tel:+421232112345"
          >
            +421 2/321 123 45
          </Link>
        </div>
        <LinkButton
          as={NextLink}
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

"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useState } from "react";
import {
  Carousel,
  type CarouselSlide,
} from "@techsio/ui-kit/molecules/carousel";
import { HerbatikaProductCard } from "@/components/herbatika-product-card";
import { SupportingText } from "@/components/text/supporting-text";
import { useAddProductToCart } from "@/lib/storefront/use-add-product-to-cart";

type InlineProductsCarouselProps = {
  products: HttpTypes.StoreProduct[];
};

type InlineProductsSlidesProps = {
  slides: CarouselSlide[];
  slidesPerPage: number;
};

function InlineProductsSlides({
  slides,
  slidesPerPage,
}: InlineProductsSlidesProps) {
  const hasOverflow = slides.length > slidesPerPage;

  return (
    <Carousel.Root
      aspectRatio="none"
      className="w-full p-150"
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
            className="-translate-y-1/2 absolute top-1/2 left-100 rounded-full aspect-square text-lg shadow-md"
            icon="icon-[mdi--chevron-left]"
          />
          <Carousel.Next
            className="-translate-y-1/2 absolute top-1/2 right-100 rounded-full aspect-square text-lg shadow-md"
            icon="icon-[mdi--chevron-right]"
          />
        </>
      ) : null}
    </Carousel.Root>
  );
}

export function InlineProductsCarousel({
  products,
}: InlineProductsCarouselProps) {
  const region = useRegionContext();
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const addToCart = useAddProductToCart({
    regionId: region?.region_id,
    countryCode: region?.country_code,
  });

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    setAddToCartError(null);

    try {
      await addToCart.addProductToCart({
        product,
        quantity: 1,
      });
    } catch (error) {
      setAddToCartError(
        error instanceof Error ? error.message : "Pridanie do košíka zlyhalo.",
      );
    }
  };

  const slides: CarouselSlide[] = products.map((product, index) => ({
    id: product.id ?? product.handle ?? `blog-inline-product-${index}`,
    content: (
      <HerbatikaProductCard
        isAdding={Boolean(product.id) && addToCart.isProductAdding(product.id)}
        onAddToCart={handleAddToCart}
        product={product}
      />
    ),
  }));

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className="space-y-250">
      <div className="md:hidden">
        <InlineProductsSlides slides={slides} slidesPerPage={1} />
      </div>
      <div className="hidden md:block xl:hidden">
        <InlineProductsSlides slides={slides} slidesPerPage={2} />
      </div>
      <div className="hidden xl:block">
        <InlineProductsSlides slides={slides} slidesPerPage={4} />
      </div>

      {addToCartError ? (
        <SupportingText className="text-sm text-danger">
          {addToCartError}
        </SupportingText>
      ) : null}
    </section>
  );
}

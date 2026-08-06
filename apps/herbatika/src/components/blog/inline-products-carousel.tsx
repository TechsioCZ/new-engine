"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { Carousel } from "@techsio/ui-kit/molecules/carousel"
import type { CarouselSlide } from "@techsio/ui-kit/molecules/carousel"

import { HerbatikaProductCard } from "@/components/herbatika-product-card"
import { useAddProductToCartAction } from "@/lib/storefront/use-add-product-to-cart-action"

interface InlineProductsCarouselProps {
  products: HttpTypes.StoreProduct[]
  keyPrefix?: string
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void
  slidesSm?: number
  slidesMd?: number
  slidesLg?: number
}

interface InlineProductsSlidesProps {
  slides: CarouselSlide[]
  slidesPerPage: number
}

const InlineProductsSlides = ({
  slides,
  slidesPerPage,
}: InlineProductsSlidesProps) => {
  const hasOverflow = slides.length > slidesPerPage

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
          <Carousel.Previous className="-translate-y-1/2 absolute top-1/2 left-100 aspect-square rounded-full text-lg shadow-carousel-trigger active:text-carousel-trigger-fg-active" />
          <Carousel.Next className="-translate-y-1/2 absolute top-1/2 right-100 aspect-square rounded-full text-lg shadow-carousel-trigger active:text-carousel-trigger-fg-active" />
        </>
      ) : null}
    </Carousel.Root>
  )
}

export const InlineProductsCarousel = ({
  products,
  keyPrefix = "inline-product",
  onProductHoverStart,
  onProductHoverEnd,
  slidesSm = 1,
  slidesMd = 2,
  slidesLg = 4,
}: InlineProductsCarouselProps) => {
  const region = useRegionContext()
  const addToCart = useAddProductToCartAction({
    ...(region?.region_id === undefined ? {} : { regionId: region?.region_id }),
    ...(region?.country_code === undefined
      ? {}
      : { countryCode: region?.country_code }),
  })

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    await addToCart.addProductToCart({
      product,
      quantity: 1,
    })
  }

  const slides: CarouselSlide[] = products.map((product, index) => ({
    content: (
      <HerbatikaProductCard
        isAdding={Boolean(product.id) && addToCart.isProductAdding(product.id)}
        onAddToCart={handleAddToCart}
        {...(onProductHoverEnd === undefined ? {} : { onProductHoverEnd })}
        {...(onProductHoverStart === undefined ? {} : { onProductHoverStart })}
        product={product}
      />
    ),
    id: `${keyPrefix}-${product.id ?? product.handle ?? index}`,
  }))

  if (slides.length === 0) {
    return null
  }

  return (
    <section className="space-y-250">
      <div className="md:hidden">
        <InlineProductsSlides slides={slides} slidesPerPage={slidesSm} />
      </div>
      <div className="hidden md:block xl:hidden">
        <InlineProductsSlides slides={slides} slidesPerPage={slidesMd} />
      </div>
      <div className="hidden xl:block">
        <InlineProductsSlides slides={slides} slidesPerPage={slidesLg} />
      </div>
    </section>
  )
}

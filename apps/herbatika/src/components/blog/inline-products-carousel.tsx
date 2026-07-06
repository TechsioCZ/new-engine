"use client"

import type { HttpTypes } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import {
  Carousel,
  type CarouselSlide,
} from "@techsio/ui-kit/molecules/carousel"
import { HerbatikaProductCard } from "@/components/herbatika-product-card"
import { useAppToast } from "@/hooks/use-app-toast"
import {
  ADD_PRODUCT_TO_CART_SUCCESS_MESSAGE,
  resolveAddProductToCartErrorMessage,
  useAddProductToCart,
} from "@/lib/storefront/use-add-product-to-cart"

type InlineProductsCarouselProps = {
  products: HttpTypes.StoreProduct[]
  keyPrefix?: string
  onProductHoverStart?: (product: HttpTypes.StoreProduct) => void
  onProductHoverEnd?: (product: HttpTypes.StoreProduct) => void
  slidesSm?: number
  slidesMd?: number
  slidesLg?: number
}

type InlineProductsSlidesProps = {
  slides: CarouselSlide[]
  slidesPerPage: number
}

function InlineProductsSlides({
  slides,
  slidesPerPage,
}: InlineProductsSlidesProps) {
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

export function InlineProductsCarousel({
  products,
  keyPrefix = "inline-product",
  onProductHoverStart,
  onProductHoverEnd,
  slidesSm = 1,
  slidesMd = 2,
  slidesLg = 4,
}: InlineProductsCarouselProps) {
  const region = useRegionContext()
  const addToCart = useAddProductToCart({
    regionId: region?.region_id,
    countryCode: region?.country_code,
  })
  const toast = useAppToast()

  const handleAddToCart = async (product: HttpTypes.StoreProduct) => {
    try {
      await addToCart.addProductToCart({
        product,
        quantity: 1,
      })
      toast.success({ title: ADD_PRODUCT_TO_CART_SUCCESS_MESSAGE })
    } catch (error) {
      toast.error({ title: resolveAddProductToCartErrorMessage(error) })
    }
  }

  const slides: CarouselSlide[] = products.map((product, index) => ({
    id: `${keyPrefix}-${product.id ?? product.handle ?? index}`,
    content: (
      <HerbatikaProductCard
        isAdding={Boolean(product.id) && addToCart.isProductAdding(product.id)}
        onAddToCart={handleAddToCart}
        onProductHoverEnd={onProductHoverEnd}
        onProductHoverStart={onProductHoverStart}
        product={product}
      />
    ),
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

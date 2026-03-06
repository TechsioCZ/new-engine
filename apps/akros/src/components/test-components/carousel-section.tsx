import { Carousel } from "@ui/molecules/carousel"
import { carouselSlides } from "./data"

export function CarouselSection() {
  return (
    <div className="w-3xl">
      <Carousel.Root
        aspectRatio="wide"
        loop
        objectFit="cover"
        size="full"
        slideCount={carouselSlides.length}
      >
        <Carousel.Slides slides={carouselSlides} />
        <Carousel.Previous className="absolute top-1/2 left-100 z-10 -translate-y-1/2 text-2xl" />
        <Carousel.Next className="absolute top-1/2 right-100 z-10 -translate-y-1/2 text-2xl" />
        <Carousel.Indicators className="absolute bottom-100 left-0 z-10" />
      </Carousel.Root>
      </div>
  )
}

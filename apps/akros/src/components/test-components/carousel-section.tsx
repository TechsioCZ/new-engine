import { Carousel } from "@ui/molecules/carousel"
import { carouselSlides } from "./data"
import { TestComponentsSection } from "./section"

export function CarouselSection() {
  return (
    <TestComponentsSection
      title="Carousel"
      description="Hero carousel s obrázky `carousel-1` až `carousel-3`, varianta `size=full`, `aspectRatio=wide`."
    >
      <Carousel.Root
        aspectRatio="wide"
        loop
        objectFit="cover"
        size="full"
        slideCount={carouselSlides.length}
      >
        <Carousel.Slides slides={carouselSlides} />
        <Carousel.Control>
          <Carousel.Previous />
          <Carousel.Indicators />
          <Carousel.Next />
        </Carousel.Control>
      </Carousel.Root>
    </TestComponentsSection>
  )
}

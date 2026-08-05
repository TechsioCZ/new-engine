"use client"
import { Carousel } from "@techsio/ui-kit/molecules/carousel"
import type { CarouselSlide } from "@techsio/ui-kit/molecules/carousel"
import NextImage from "next/image"

interface HeroCarouselProps {
  slides: CarouselSlide[]
}
export function HeroCarousel({ slides }: HeroCarouselProps) {
  return (
    <Carousel.Root
      aspectRatio="none"
      autoplay
      className="h-full w-full"
      slideCount={slides.length}
    >
      <Carousel.Slides imageAs={NextImage} slides={slides} />
      <Carousel.Control>
        <Carousel.Indicators />
      </Carousel.Control>
      <Carousel.Previous className="-translate-y-1/2 absolute top-1/2 left-0" />
      <Carousel.Next className="-translate-y-1/2 absolute top-1/2 right-0" />
    </Carousel.Root>
  )
}

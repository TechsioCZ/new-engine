import Image from "next/image";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Link } from "@techsio/ui-kit/atoms/link";
import {
  Carousel,
  type CarouselSlide,
} from "@techsio/ui-kit/molecules/carousel";
import NextLink from "next/link";
import { useMemo } from "react";
import { HERO_PAGE_SIZE, type HeroBannerItem } from "@/components/homepage/homepage.data";

const buildHeroSlides = (banners: HeroBannerItem[]): CarouselSlide[] => {
  const slides: CarouselSlide[] = [];

  for (let offset = 0; offset < banners.length; offset += HERO_PAGE_SIZE) {
    const page = banners.slice(offset, offset + HERO_PAGE_SIZE);
    const pageIndex = Math.floor(offset / HERO_PAGE_SIZE) + 1;

    slides.push({
      id: `hero-page-${pageIndex}`,
      content: (
        <div className="grid h-full w-full grid-cols-2 gap-300 lg:grid-cols-4">
          {page.map((banner) => (
            <NextLink
              className="group relative h-full overflow-hidden rounded-2xl border border-border-secondary"
              href={banner.href}
              key={banner.id}
            >
              <Image
                alt={banner.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                src={banner.imageSrc}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-fg-primary/70 via-fg-primary/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-300 text-fg-reverse">
                <Badge
                  className="mb-100 rounded-full px-200 py-50 text-2xs font-semibold uppercase"
                  variant="secondary"
                >
                  {banner.badge}
                </Badge>
                <p className="line-clamp-2 text-sm leading-tight font-bold">
                  {banner.title}
                </p>
                <p className="line-clamp-2 text-xs text-fg-reverse/85">
                  {banner.subtitle}
                </p>
              </div>
            </NextLink>
          ))}
        </div>
      ),
    });
  }

  return slides;
};

type HomepageHeroCarouselSectionProps = {
  banners: HeroBannerItem[];
};

export function HomepageHeroCarouselSection({
  banners,
}: HomepageHeroCarouselSectionProps) {
  const slides = useMemo(() => buildHeroSlides(banners), [banners]);

  return (
    <section className="p-300">
      <Carousel.Root
        aspectRatio="none"
        className="w-full"
        loop
        slideCount={slides.length}
        size="full"
      >
        <Carousel.Slides className="h-120" slides={slides} />
        <Carousel.Previous className="-translate-y-1/2 absolute top-1/2 left-200 rounded-full border border-surface/80 aspect-square font-bold" />
        <Carousel.Next className="-translate-y-1/2 absolute top-1/2 right-200 rounded-full border border-surface/80 aspect-square font-bold" />
      </Carousel.Root>
    </section>
  );
}

import Image from "next/image";
import {
  Carousel,
  type CarouselSlide,
} from "@techsio/ui-kit/molecules/carousel";
import NextLink from "next/link";
import { useMemo } from "react";
import {
  HERO_PAGE_SIZE,
  type HeroBannerItem,
} from "@/components/homepage/homepage.data";
import { Button } from "@techsio/ui-kit/atoms/button";

const HERO_CTA_LABEL = "Zistiť viac";
const HERO_DESKTOP_SLIDES_PER_PAGE = 4.1;
const HERO_DESKTOP_SLIDE_SPACING = "var(--spacing-400)";

function HeroBannerCard({ banner }: { banner: HeroBannerItem }) {
  return (
    <NextLink
      aria-label={`${banner.title} - ${HERO_CTA_LABEL}`}
      className="group relative h-full overflow-hidden rounded-lg bg-fg-primary shadow-sm font-open-sans"
      href={banner.href}
    >
      <Image
        alt={banner.id}
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        fill
        src={banner.imageSrc}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-fg-primary/85 via-fg-primary/35 to-transparent" />
     { banner.title && <div className="absolute inset-x-0 bottom-0 flex flex-col items-start p-600 text-fg-reverse">
        <p className="line-clamp-2 text-2xl leading-[26px] font-bold">
          {banner.title}
        </p>
        {banner.subtitle && (
          <p className="line-clamp-2 text-md leading-snug font-semibold text-fg-reverse">
            {banner.subtitle}
          </p>
        )}
        <Button size="md" className="mt-350 rounded-xl py-250 px-450 text-md">
          {HERO_CTA_LABEL}
        </Button>
      </div>}
    </NextLink>
  );
}

const buildHeroSlides = (banners: HeroBannerItem[]): CarouselSlide[] => {
  const slides: CarouselSlide[] = [];

  for (let offset = 0; offset < banners.length; offset += HERO_PAGE_SIZE) {
    const page = banners.slice(offset, offset + HERO_PAGE_SIZE);
    const pageIndex = Math.floor(offset / HERO_PAGE_SIZE) + 1;

    slides.push({
      id: `hero-page-${pageIndex}`,
      content: (
        <div className="grid h-full w-full grid-cols-2 gap-400 lg:grid-cols-4">
          {page.map((banner) => (
            <HeroBannerCard banner={banner} key={banner.id} />
          ))}
        </div>
      ),
    });
  }

  return slides;
};

const buildHeroDesktopSlides = (
  banners: HeroBannerItem[],
): CarouselSlide[] =>
  banners.map((banner) => ({
    id: banner.id,
    content: <HeroBannerCard banner={banner} />,
  }));

type HomepageHeroCarouselSectionProps = {
  banners: HeroBannerItem[];
};

type HeroCarouselProps = {
  slides: CarouselSlide[];
  slidesPerPage?: number;
  spacing?: string;
};

function HeroCarousel({
  slides,
  slidesPerPage = 1,
  spacing = "0px",
}: HeroCarouselProps) {
  const hasOverflow = slides.length > slidesPerPage;

  return (
    <Carousel.Root
      aspectRatio="none"
      className="w-full"
      loop={hasOverflow}
      size="full"
      slideCount={slides.length}
      slidesPerMove={1}
      slidesPerPage={slidesPerPage}
      spacing={spacing}
    >
      <Carousel.Slides className="h-homepage-hero-carousel" slides={slides} />
      {hasOverflow ? (
        <>
          <Carousel.Previous className="-translate-y-1/2 absolute top-1/2 left-200 rounded-full aspect-square shadow-carousel-trigger active:text-carousel-trigger-fg-active" />
          <Carousel.Next className="-translate-y-1/2 absolute top-1/2 right-200 rounded-full aspect-square shadow-carousel-trigger active:text-carousel-trigger-fg-active" />
        </>
      ) : null}
    </Carousel.Root>
  );
}

export function HomepageHeroCarouselSection({
  banners,
}: HomepageHeroCarouselSectionProps) {
  const slides = useMemo(() => buildHeroSlides(banners), [banners]);
  const desktopSlides = useMemo(
    () => buildHeroDesktopSlides(banners),
    [banners],
  );

  return (
    <section>
      <div className="xl:hidden">
        <HeroCarousel slides={slides} />
      </div>
      <div className="hidden xl:block">
        <HeroCarousel
          slides={desktopSlides}
          slidesPerPage={HERO_DESKTOP_SLIDES_PER_PAGE}
          spacing={HERO_DESKTOP_SLIDE_SPACING}
        />
      </div>
    </section>
  );
}

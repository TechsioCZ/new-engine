import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import {
  Carousel,
  type CarouselSlide,
} from "@techsio/ui-kit/molecules/carousel";
import NextLink from "next/link";
import { useMemo } from "react";
import type { PurposeCategoryItem } from "@/components/homepage/homepage.data";

type HomepagePurposeCategoriesSectionProps = {
  categories: PurposeCategoryItem[];
};

type PurposeCategoriesCarouselProps = {
  slides: CarouselSlide[];
  slidesPerPage: number;
};

const buildPurposeSlides = (
  categories: PurposeCategoryItem[],
): CarouselSlide[] => {
  return categories.map((category) => ({
    id: category.id,
    content: (
      <Link
        as={NextLink}
        className="home-purpose-card group flex w-full flex-col items-center justify-center gap-200 rounded-md border border-border-secondary bg-surface px-250 py-250 text-center transition-colors hover:border-primary/30 hover:bg-highlight"
        href={category.href}
      >
        <span className="flex h-700 w-700 items-center justify-center rounded-full bg-highlight text-primary transition-colors group-hover:bg-primary/10">
          <Icon className="text-3xl" icon={category.icon} />
        </span>
        <span className="text-sm leading-snug font-semibold text-fg-primary">
          {category.label}
        </span>
      </Link>
    ),
  }));
};

function PurposeCategoriesCarousel({
  slides,
  slidesPerPage,
}: PurposeCategoriesCarouselProps) {
  const hasOverflow = slides.length > slidesPerPage;
  const slidesClassName = hasOverflow
    ? "home-purpose-slides px-500 pb-450 lg:px-550"
    : "home-purpose-slides";

  return (
    <Carousel.Root
      aspectRatio="none"
      className="w-full p-200"
      loop={hasOverflow}
      size="full"
      slideCount={slides.length}
      slidesPerMove={1}
      slidesPerPage={slidesPerPage}
      spacing="var(--spacing-250)"
    >
      <Carousel.Slides className={slidesClassName} slides={slides} />
      {hasOverflow ? (
        <>
          <Carousel.Previous
            className="-translate-y-1/2 absolute top-1/2 left-100 z-10 rounded-full border border-border-secondary bg-surface/90 p-150 text-lg text-primary hover:bg-surface"
            icon="icon-[mdi--chevron-left]"
          />
          <Carousel.Next
            className="-translate-y-1/2 absolute top-1/2 right-100 z-10 rounded-full border border-border-secondary bg-surface/90 p-150 text-lg text-primary hover:bg-surface"
            icon="icon-[mdi--chevron-right]"
          />

        </>
      ) : null}
    </Carousel.Root>
  );
}

export function HomepagePurposeCategoriesSection({
  categories,
}: HomepagePurposeCategoriesSectionProps) {
  if (categories.length === 0) {
    return null;
  }

  const slides = useMemo(() => buildPurposeSlides(categories), [categories]);

  return (
    <section className="space-y-350" id="purpose-categories">
      <div className="flex items-center justify-between gap-300">
        <h2 className="text-3xl leading-snug font-bold text-fg-primary lg:text-4xl">
          Čo vás trápi? Nakupujte podľa účelu
        </h2>
        <Link
          as={NextLink}
          className="shrink-0 text-sm leading-snug text-fg-primary underline underline-offset-2 hover:text-primary"
          href="/c/trapi-ma"
        >
          Zobraziť všetky
        </Link>
      </div>

      <div className="space-y-200">
        <div className="md:hidden">
          <PurposeCategoriesCarousel slides={slides} slidesPerPage={2} />
        </div>
        <div className="hidden md:block xl:hidden">
          <PurposeCategoriesCarousel slides={slides} slidesPerPage={3} />
        </div>
        <div className="hidden xl:block">
          <PurposeCategoriesCarousel slides={slides} slidesPerPage={5} />
        </div>
      </div>
    </section>
  );
}

import type { ComponentProps } from "react";
import NextImage from "next/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import {
  Carousel,
  type CarouselSlide,
} from "@techsio/ui-kit/molecules/carousel";
import NextLink from "next/link";
import { useMemo } from "react";
import { categoryImageItems } from "@/assets/category-images";

type ImageSource = ComponentProps<typeof NextImage>["src"];

type PurposeCarouselItem = {
  id: string;
  label: string;
  src: ImageSource;
};

type PurposeCarouselProps = {
  title?: string;
  viewAllHref?: string;
  items?: PurposeCarouselItem[];
};

type PurposeCarouselSlidesProps = {
  slides: CarouselSlide[];
  slidesPerPage: number;
};

const DEFAULT_ITEMS: PurposeCarouselItem[] = Object.entries(
  categoryImageItems,
).map(([id, item]) => ({
  id,
  label: item.label,
  src: item.src,
}));

const buildImageSlides = (
  items: PurposeCarouselItem[],
): CarouselSlide[] => {
  return items.map((item) => ({
    id: item.id,
    content: (
      <div className="flex h-full min-h-800 w-full flex-col items-center justify-center gap-150 rounded-md border border-border-secondary bg-surface px-200 py-200 text-center">
        <div className="flex h-850 w-full items-center justify-center">
          <NextImage
            alt={item.label}
            className="h-category-image aspect-square object-contain"
            height={86}
            src={item.src}
            width={86}
          />
        </div>
        <span className="line-clamp-2 max-w-full text-sm leading-snug font-semibold text-fg-primary">
          {item.label}
        </span>
      </div>
    ),
  }));
};

function PurposeCarouselSlides({
  slides,
  slidesPerPage,
}: PurposeCarouselSlidesProps) {
  const hasOverflow = slides.length > slidesPerPage;

  return (
    <Carousel.Root
      aspectRatio="none"
      className="w-full p-200"
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

export function PurposeCarousel({
  title = "Čo vás trápi? Nakupujte podľa účelu",
  viewAllHref = "/c/trapi-ma",
  items = DEFAULT_ITEMS,
}: PurposeCarouselProps) {
  if (items.length === 0) {
    return null;
  }

  const slides = useMemo(() => buildImageSlides(items), [items]);

  return (
    <section className="space-y-350" id="test-nakupujte-carousel">
      <div className="flex items-center justify-between gap-300">
        <h2 className="text-3xl leading-snug font-bold text-fg-primary lg:text-4xl">
          {title}
        </h2>
        <Link
          as={NextLink}
          className="shrink-0 text-sm leading-snug text-fg-primary underline underline-offset-2 hover:text-primary"
          href={viewAllHref}
        >
          Zobraziť všetky
        </Link>
      </div>

      <div className="space-y-200">
        <div className="md:hidden">
          <PurposeCarouselSlides slides={slides} slidesPerPage={3} />
        </div>
        <div className="hidden md:block xl:hidden">
          <PurposeCarouselSlides slides={slides} slidesPerPage={5} />
        </div>
        <div className="hidden xl:block">
          <PurposeCarouselSlides slides={slides} slidesPerPage={7} />
        </div>
      </div>
    </section>
  );
}

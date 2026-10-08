/**
 * Carousel — @techsio/ui-kit molecule.
 *
 * @component Carousel
 * @componentVersion v1.2.2
 * @skill carousel-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the carousel-usage skill's component_version and a changelog entry. Bump all three together.
 */
import * as carousel from "@zag-js/carousel"
import { normalizeProps, useMachine } from "@zag-js/react"
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  createContext,
  type ElementType,
  type ReactNode,
  useContext,
  useId,
} from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { ActionIcon } from "../atoms/action-icon"
import type { IconType } from "../atoms/icon"
import { Image } from "../atoms/image"
import { usePrefersReducedMotion } from "../internal/reduced-motion"

type CarouselImageComponent<T extends ElementType = typeof Image> =
  T extends typeof Image
    ? typeof Image
    : T extends ElementType
      ? "src" extends keyof ComponentPropsWithoutRef<T>
        ? "alt" extends keyof ComponentPropsWithoutRef<T>
          ? T
          : never
        : never
      : never

const carouselVariants = tv({
  slots: {
    wrapper: ["relative w-fit"],
    root: ["relative overflow-hidden", "rounded-carousel"],
    control: [
      "flex gap-carousel-control p-carousel-control",
      "bg-carousel-control-bg",
      "rounded-carousel",
    ],
    slideGroup: [
      "overflow-hidden",
      "scrollbar-hide",
      "data-dragging:cursor-grabbing",
      "data-[orientation=vertical]:h-full",
    ],
    slide: [
      "relative shrink-0",
      "flex items-center justify-center",
      "overflow-hidden",
      "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-full",
    ],
    prevTrigger: "",
    nextTrigger: "",
    indicatorGroup: [
      "flex w-full items-center justify-center gap-carousel-indicator",
    ],
    /*
     * The indicator button is the 24 px hit area (WCAG 2.2 target size); the
     * visible 8 px dot is a child, so the dot can stay small without shrinking
     * the target.
     */
    indicator: [
      "group inline-flex shrink-0 cursor-pointer items-center justify-center",
      "aspect-carousel-indicator w-carousel-indicator",
      "rounded-carousel-indicator border border-carousel-indicator-border-base",
      "data-current:border-carousel-indicator-border-active",
      "text-carousel-trigger-fg-base",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-carousel-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
    indicatorDot: [
      "size-carousel-indicator-dot rounded-carousel-indicator",
      "bg-carousel-indicator-bg-base",
      "group-data-current:bg-carousel-indicator-bg-active",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    autoplayTrigger: [
      "absolute top-carousel-trigger-top right-carousel-trigger-right z-50",
      // Sits over the slide image, so it needs the opaque control surface.
      "bg-carousel-control-bg",
    ],
    spacer: ["flex-1"],
  },
  variants: {
    objectFit: {
      cover: {
        slide: "*:h-full *:w-full *:object-cover",
      },
      contain: {
        slide: "*:h-full *:w-full *:object-contain",
      },
      fill: {
        slide: "*:h-full *:w-full *:object-fill",
      },
      none: {
        slide: "",
      },
    },
    controlPosition: {
      side: {
        control: "flex-col items-center justify-between",
      },
      top: {
        control: "-translate-x-1/2 absolute top-0 left-1/2",
      },
      bottom: {
        control: "-translate-x-1/2 absolute bottom-0 left-1/2",
      },
      unset: {},
    },
    aspectRatio: {
      square: {
        slideGroup: "data-[orientation=vertical]:aspect-square",
        slide: "data-[orientation=horizontal]:aspect-square",
      },
      landscape: {
        slideGroup: "data-[orientation=vertical]:aspect-video",
        slide: "data-[orientation=horizontal]:aspect-video",
      },
      portrait: {
        slideGroup: "data-[orientation=vertical]:aspect-portrait",
        slide: "data-[orientation=horizontal]:aspect-portrait",
      },
      wide: {
        slideGroup: "data-[orientation=vertical]:aspect-wide",
        slide: "data-[orientation=horizontal]:aspect-wide",
      },
      none: {
        slideGroup: "",
        slide: "",
      },
    },
    size: {
      sm: {
        root: [
          "data-[orientation=horizontal]:max-w-carousel-root-sm",
          "data-[orientation=vertical]:max-h-carousel-root-sm",
        ],
        slide: [
          "data-[orientation=horizontal]:max-w-carousel-root-sm",
          "data-[orientation=vertical]:max-h-carousel-root-sm",
        ],
      },
      md: {
        root: [
          "data-[orientation=horizontal]:max-w-carousel-root-md",
          "data-[orientation=vertical]:max-h-carousel-root-md",
        ],
        slide: [
          "data-[orientation=horizontal]:max-w-carousel-root-md",
          "data-[orientation=vertical]:max-h-carousel-root-md",
        ],
      },
      lg: {
        root: [
          "data-[orientation=horizontal]:max-w-carousel-root-lg",
          "data-[orientation=vertical]:max-h-carousel-root-lg",
        ],
        slide: [
          "data-[orientation=horizontal]:max-w-carousel-root-lg",
          "data-[orientation=vertical]:max-h-carousel-root-lg",
        ],
      },
      full: {
        root: [
          "data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full",
        ],
      },
    },
  },
  defaultVariants: {
    aspectRatio: "square",
    objectFit: "cover",
    size: "md",
    controlPosition: "bottom",
  },
})

interface CarouselContextValue {
  api: ReturnType<typeof carousel.connect>
  size?: "sm" | "md" | "lg" | "full"
  objectFit?: "cover" | "contain" | "fill" | "none"
  aspectRatio?: "square" | "landscape" | "portrait" | "wide" | "none"
}

const CarouselContext = createContext<CarouselContextValue | null>(null)

/** Prev/next/autoplay follow the carousel size on the ActionIcon scale. */
function toTriggerSize(size: CarouselContextValue["size"]): "sm" | "md" | "lg" {
  if (size === "sm") {
    return "sm"
  }
  if (size === "lg" || size === "full") {
    return "lg"
  }
  return "md"
}

const useCarouselContext = () => {
  const context = useContext(CarouselContext)
  if (!context) {
    throw new Error("Carousel components must be used within Carousel.Root")
  }
  return context
}

export type CarouselSlide = {
  id: string
  content?: ReactNode
  src?: string
  alt?: string
  imageProps?: Record<string, unknown>
}

type CarouselDimension = CSSProperties["width"]

export interface CarouselRootProps<T extends ElementType = typeof Image>
  extends Omit<VariantProps<typeof carouselVariants>, "controlPosition">,
    Omit<carousel.Props, "id" | "size"> {
  id?: string
  className?: string
  children: ReactNode
  imageAs?: CarouselImageComponent<T>
  width?: CarouselDimension
  height?: CarouselDimension
  /**
   * Accessible name of the carousel region. Give each carousel on a page its
   * own name, e.g. "Product photos" — otherwise every carousel is an
   * identical, unnamed region (axe landmark-unique).
   */
  "aria-label"?: string
}

interface CarouselSlidesProps {
  slides: CarouselSlide[]
  size?: "sm" | "md" | "lg" | "full"
  imageAs?: ElementType
  className?: string
}

interface CarouselSlideProps {
  index: number
  children: ReactNode
  size?: "sm" | "md" | "lg" | "full"
  className?: string
}

interface CarouselPreviousProps {
  className?: string
  icon?: IconType
}

interface CarouselNextProps {
  className?: string
  icon?: IconType
}

interface CarouselIndicatorsProps {
  className?: string
}

interface CarouselIndicatorProps {
  index: number
  className?: string
  children?: ReactNode
}

interface CarouselAutoplayProps {
  className?: string
}

interface CarouselControlProps {
  children: ReactNode
  className?: string
  controlPosition?: "top" | "bottom" | "side" | "unset"
}

export function Carousel<T extends ElementType = typeof Image>({
  id,
  /* Tailwind variants */
  size,
  objectFit,
  aspectRatio,
  /* Zag.js carousel config */
  orientation = "horizontal",
  slideCount = 1,
  loop = true,
  autoplay = false,
  allowMouseDrag = true,
  slidesPerPage = 1,
  slidesPerMove = 1,
  spacing = "0px",
  padding = "0px",
  dir = "ltr",
  snapType = "mandatory",
  /* Others */
  className,
  children,
  width,
  height,
  onPageChange,
  "aria-label": ariaLabel,
  ...props
}: CarouselRootProps<T>) {
  const fallbackId = useId()
  // Autoplay is JS-driven, so motion-reduce: classes cannot stop it. Users who
  // prefer reduced motion get a still carousel; the play control still works.
  const prefersReducedMotion = usePrefersReducedMotion()
  const service = useMachine(carousel.machine, {
    id: id ?? fallbackId,
    slideCount,
    autoplay: prefersReducedMotion ? false : autoplay,
    orientation,
    allowMouseDrag,
    loop,
    slidesPerPage,
    slidesPerMove,
    spacing,
    padding,
    dir,
    snapType,
    onPageChange,
    ...props,
  })

  const api = carousel.connect(service, normalizeProps)
  const { wrapper, root } = carouselVariants({ size, objectFit, aspectRatio })
  const rootProps = api.getRootProps()
  const resolvedRootStyle = {
    ...(rootProps.style as CSSProperties),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  }
  const resolvedWrapperStyle = {
    ...(size === "full" ? { width: "100%" } : {}),
    ...(width !== undefined ? { width } : {}),
  }

  return (
    <CarouselContext.Provider value={{ api, size, objectFit, aspectRatio }}>
      <div className={wrapper()} style={resolvedWrapperStyle}>
        <div
          {...rootProps}
          aria-label={ariaLabel}
          className={root({ className })}
          style={resolvedRootStyle}
        >
          {children}
        </div>
      </div>
    </CarouselContext.Provider>
  )
}

Carousel.Slides = function CarouselSlides({
  slides,
  size: overrideSize,
  imageAs,
  className,
}: CarouselSlidesProps) {
  const {
    api,
    size: contextSize,
    objectFit,
    aspectRatio,
  } = useCarouselContext()
  const size = overrideSize ?? contextSize
  const { slideGroup } = carouselVariants({
    size,
    objectFit,
    aspectRatio,
  })
  const hasCustomImageComponent = imageAs && imageAs !== Image
  const CustomImageComponent = hasCustomImageComponent
    ? (imageAs as ElementType)
    : Image

  return (
    <div className={slideGroup({ className })} {...api.getItemGroupProps()}>
      {slides.map((slide, index) => (
        <Carousel.Slide index={index} key={slide.id}>
          {slide.content ||
            (hasCustomImageComponent ? (
              <CustomImageComponent
                alt={slide.alt || ""}
                src={slide.src || ""}
                {...slide.imageProps}
              />
            ) : (
              <Image
                alt={slide.alt || ""}
                src={slide.src || ""}
                {...slide.imageProps}
              />
            ))}
        </Carousel.Slide>
      ))}
    </div>
  )
}

Carousel.Slide = function CarouselSlide({
  index,
  children,
  size: overrideSize,
  className,
}: CarouselSlideProps) {
  const {
    api,
    size: contextSize,
    objectFit,
    aspectRatio,
  } = useCarouselContext()
  const size = overrideSize ?? contextSize
  const { slide: slideSlot } = carouselVariants({
    size,
    objectFit,
    aspectRatio,
  })
  const itemProps = api.getItemProps({ index })
  // Zag hides off-screen slides with aria-hidden only; links or buttons inside
  // them stay in the tab order (axe aria-hidden-focus). `inert` removes the
  // whole hidden slide from focus and the accessibility tree.
  const hidden =
    itemProps["aria-hidden"] === true || itemProps["aria-hidden"] === "true"

  return (
    <div
      {...itemProps}
      className={slideSlot({ className })}
      inert={hidden || undefined}
    >
      {children}
    </div>
  )
}

Carousel.Previous = function CarouselPrevious({
  className,
  icon = "token-icon-carousel-prev" as IconType,
}: CarouselPreviousProps) {
  const { api, size } = useCarouselContext()
  const { prevTrigger } = carouselVariants()
  const triggerProps = api.getPrevTriggerProps()

  return (
    <ActionIcon
      className={prevTrigger({ className })}
      size={toTriggerSize(size)}
      {...triggerProps}
      aria-label={triggerProps["aria-label"] ?? "Previous slide"}
      icon={icon}
    />
  )
}

Carousel.Next = function CarouselNext({
  className,
  icon = "token-icon-carousel-next" as IconType,
}: CarouselNextProps) {
  const { api, size } = useCarouselContext()
  const { nextTrigger } = carouselVariants()
  const triggerProps = api.getNextTriggerProps()

  return (
    <ActionIcon
      className={nextTrigger({ className })}
      size={toTriggerSize(size)}
      {...triggerProps}
      aria-label={triggerProps["aria-label"] ?? "Next slide"}
      icon={icon}
    />
  )
}

Carousel.Indicators = function CarouselIndicators({
  className,
  children,
}: CarouselIndicatorsProps & { children?: ReactNode }) {
  const { api } = useCarouselContext()
  const { indicatorGroup } = carouselVariants()

  // If children are provided, render them (custom indicators)
  if (children) {
    return (
      <div
        className={indicatorGroup({ className })}
        {...api.getIndicatorGroupProps()}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={indicatorGroup({ className })}
      {...api.getIndicatorGroupProps()}
    >
      {api.pageSnapPoints.map((_, index) => (
        <Carousel.Indicator index={index} key={`indicator-${index}`} />
      ))}
    </div>
  )
}

Carousel.Indicator = function CarouselIndicator({
  index,
  className,
  children,
}: CarouselIndicatorProps) {
  const { api } = useCarouselContext()
  const { indicator, indicatorDot } = carouselVariants()

  return (
    <button
      className={indicator({ className })}
      type="button"
      {...api.getIndicatorProps({ index })}
    >
      {children ?? <span aria-hidden="true" className={indicatorDot()} />}
    </button>
  )
}

Carousel.Autoplay = function CarouselAutoplay({
  className,
}: CarouselAutoplayProps) {
  const { api, size } = useCarouselContext()
  const { autoplayTrigger: autoplayTriggerSlot } = carouselVariants()
  const triggerProps = api.getAutoplayTriggerProps()

  return (
    <ActionIcon
      className={autoplayTriggerSlot({ className })}
      icon={
        api.isPlaying ? "token-icon-carousel-pause" : "token-icon-carousel-play"
      }
      size={toTriggerSize(size)}
      {...triggerProps}
      aria-label={
        triggerProps["aria-label"] ??
        (api.isPlaying ? "Stop slide rotation" : "Start slide rotation")
      }
    />
  )
}

Carousel.Control = function CarouselControl({
  children,
  className,
  controlPosition,
}: CarouselControlProps) {
  const { api } = useCarouselContext()
  const { control } = carouselVariants({ controlPosition })

  return (
    <div className={control({ className })} {...api.getControlProps()}>
      {children}
    </div>
  )
}

Carousel.Root = Carousel

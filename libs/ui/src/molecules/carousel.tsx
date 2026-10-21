/**
 * Carousel — @techsio/ui-kit molecule.
 *
 * @component Carousel
 * @componentVersion v1.3.1
 * @skill carousel-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the carousel-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type Props as CarouselMachineProps,
  connect,
  machine,
} from "@zag-js/carousel"
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
import type { VariantProps } from "tailwind-variants"
import { ActionIcon } from "../atoms/action-icon"
import type { IconType } from "../atoms/icon"
import { Image } from "../atoms/image"
import { usePrefersReducedMotion } from "../internal/reduced-motion"
import { tv } from "../utils"

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
    wrapper: ["relative w-full"],
    root: ["carousel-side-layout relative w-full", "rounded-carousel"],
    control: [
      "flex items-center gap-carousel-control p-carousel-control",
      "data-[orientation=vertical]:flex-col",
      "border border-carousel-control-border shadow-carousel-control",
      "bg-carousel-control-bg",
      "rounded-carousel",
    ],
    slideGroup: [
      "overflow-hidden rounded-carousel",
      "scrollbar-none",
      "data-dragging:cursor-grabbing",
      "min-h-0 min-w-0",
    ],
    slide: [
      "relative shrink-0",
      "flex items-center justify-center",
      "overflow-hidden",
      "min-h-0 min-w-0",
      "data-[orientation=vertical]:size-full",
    ],
    /*
     * Prev / next are ActionIcons, but keep the carousel trigger colour tokens
     * on top so apps that restyle them (e.g. white circles over banners) still
     * can. The defaults match ActionIcon's neutral tone.
     */
    prevTrigger: [
      "border border-carousel-trigger-border bg-carousel-navigation-bg text-carousel-trigger-fg-base shadow-carousel-navigation",
      "data-disabled:cursor-not-allowed data-disabled:text-carousel-trigger-fg-disabled",
      "data-disabled:hover:bg-carousel-navigation-bg data-disabled:hover:text-carousel-trigger-fg-disabled",
      "hover:bg-carousel-navigation-bg-hover hover:text-carousel-trigger-fg-hover",
    ],
    nextTrigger: [
      "border border-carousel-trigger-border bg-carousel-navigation-bg text-carousel-trigger-fg-base shadow-carousel-navigation",
      "data-disabled:cursor-not-allowed data-disabled:text-carousel-trigger-fg-disabled",
      "data-disabled:hover:bg-carousel-navigation-bg data-disabled:hover:text-carousel-trigger-fg-disabled",
      "hover:bg-carousel-navigation-bg-hover hover:text-carousel-trigger-fg-hover",
    ],
    indicatorGroup: [
      "flex items-center justify-center gap-carousel-indicator",
      "data-[orientation=vertical]:flex-col",
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
      "focus-visible:carousel-focus-ring",
    ],
    indicatorDot: [
      "size-carousel-indicator-dot rounded-carousel-indicator",
      "bg-carousel-indicator-bg-base",
      "group-data-current:scale-125 group-data-current:bg-carousel-indicator-bg-active",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    autoplayTrigger: [
      "absolute top-carousel-trigger-top right-carousel-trigger-right",
      "border border-carousel-trigger-border bg-carousel-navigation-bg text-carousel-trigger-fg-base shadow-carousel-navigation",
      "hover:bg-carousel-navigation-bg-hover hover:text-carousel-trigger-fg-hover",
    ],
  },
  variants: {
    objectFit: {
      cover: {
        slide: "*:size-full *:object-cover",
      },
      contain: {
        slide: "*:size-full *:object-contain",
      },
      fill: {
        slide: "*:size-full *:object-fill",
      },
      none: {
        slide: "",
      },
    },
    controlPosition: {
      side: {
        control:
          "absolute top-1/2 right-carousel-control-inset -translate-y-1/2 flex-col",
      },
      top: {
        control:
          "absolute top-carousel-control-inset left-1/2 -translate-x-1/2",
      },
      bottom: {
        control:
          "absolute bottom-carousel-control-inset left-1/2 -translate-x-1/2",
      },
      unset: {},
    },
    controls: {
      standard: {},
      minimal: {
        control: [
          "pointer-events-none absolute inset-0 justify-between rounded-none border-0 bg-transparent shadow-none",
          "*:pointer-events-auto",
        ],
      },
    },
    aspectRatio: {
      square: { slideGroup: "aspect-square" },
      landscape: { slideGroup: "aspect-video" },
      portrait: { slideGroup: "aspect-portrait" },
      wide: { slideGroup: "aspect-wide" },
      none: { slideGroup: "data-[orientation=vertical]:h-full" },
    },
    size: {
      sm: { wrapper: "max-w-carousel-root-sm" },
      md: { wrapper: "max-w-carousel-root-md" },
      lg: { wrapper: "max-w-carousel-root-lg" },
      full: {},
    },
  },
  defaultVariants: {
    aspectRatio: "square",
    objectFit: "cover",
    size: "md",
    controlPosition: "bottom",
    controls: "standard",
  },
})

type CarouselContextValue = {
  api: ReturnType<typeof connect>
  orientation: "horizontal" | "vertical"
  dir: "ltr" | "rtl"
  imageAs?: ElementType
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

export type CarouselRootProps<T extends ElementType = typeof Image> = Omit<
  VariantProps<typeof carouselVariants>,
  "controlPosition" | "controls"
> &
  Omit<CarouselMachineProps, "id" | "size"> & {
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

type CarouselSlidesProps = {
  slides: CarouselSlide[]
  size?: "sm" | "md" | "lg" | "full"
  imageAs?: ElementType
  className?: string
}

type CarouselSlideProps = {
  index: number
  children: ReactNode
  size?: "sm" | "md" | "lg" | "full"
  className?: string
}

type CarouselPreviousProps = {
  className?: string
  icon?: IconType
}

type CarouselNextProps = {
  className?: string
  icon?: IconType
}

type CarouselIndicatorsProps = {
  className?: string
}

type CarouselIndicatorProps = {
  index: number
  className?: string
  children?: ReactNode
}

type CarouselAutoplayProps = {
  className?: string
}

type CarouselControlProps = {
  children: ReactNode
  className?: string
  controlPosition?: "top" | "bottom" | "side" | "unset"
  /** Minimal controls span the viewport; render only Previous and Next inside. */
  controls?: "standard" | "minimal"
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
  imageAs,
  onPageChange,
  "aria-label": ariaLabel,
  ...props
}: CarouselRootProps<T>) {
  const fallbackId = useId()
  // Autoplay is JS-driven, so motion-reduce: classes cannot stop it. Users who
  // prefer reduced motion get a still carousel; the play control still works.
  const prefersReducedMotion = usePrefersReducedMotion()
  const service = useMachine(machine, {
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

  const api = connect(service, normalizeProps)
  const { wrapper, root } = carouselVariants({ size, objectFit, aspectRatio })
  const rootProps = api.getRootProps()
  const resolvedRootStyle = {
    ...(rootProps.style as CSSProperties),
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
  }
  const resolvedWrapperStyle = {
    ...(size === "full" ? { width: "100%" } : {}),
    ...(width === undefined ? {} : { width }),
  }

  return (
    <CarouselContext.Provider
      value={{ api, size, objectFit, aspectRatio, orientation, dir, imageAs }}
    >
      <div className={wrapper()} style={resolvedWrapperStyle}>
        {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Pause rotation on region hover/focus without making the region itself a control. */}
        <section
          {...rootProps}
          aria-label={ariaLabel}
          className={root({ className })}
          onFocusCapture={(event) => {
            // Do not pause before the rotation toggle handles its own click.
            if (
              (event.target as HTMLElement).closest(
                '[data-part="autoplay-trigger"]'
              )
            ) {
              return
            }
            api.pause()
          }}
          onMouseEnter={() => api.pause()}
          style={resolvedRootStyle}
        >
          {children}
        </section>
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
    imageAs: contextImageAs,
  } = useCarouselContext()
  const size = overrideSize ?? contextSize
  const { slideGroup } = carouselVariants({
    size,
    objectFit,
    aspectRatio,
  })
  const resolvedImageAs = imageAs ?? contextImageAs
  const hasCustomImageComponent = resolvedImageAs && resolvedImageAs !== Image
  const CustomImageComponent = hasCustomImageComponent
    ? (resolvedImageAs as ElementType)
    : Image

  return (
    <div className={slideGroup({ className })} {...api.getItemGroupProps()}>
      {slides.map((slide, index) => (
        <Carousel.Slide index={index} key={slide.id}>
          {slide.content ??
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

Carousel.Slide = function CarouselSlideRoot({
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
  icon,
}: CarouselPreviousProps) {
  const { api, size, orientation, dir } = useCarouselContext()
  const { prevTrigger } = carouselVariants()
  const triggerProps = api.getPrevTriggerProps()
  const disabled = !api.canScrollPrev || api.pageSnapPoints.length <= 1
  let resolvedIcon = icon
  if (!resolvedIcon || resolvedIcon === "token-icon-carousel-prev") {
    resolvedIcon =
      dir === "rtl" ? "token-icon-carousel-next" : "token-icon-carousel-prev"
    if (orientation === "vertical") {
      resolvedIcon = "token-icon-carousel-prev-vertical"
    }
  }

  return (
    <ActionIcon
      className={prevTrigger({ className })}
      size={toTriggerSize(size)}
      {...triggerProps}
      aria-disabled={disabled}
      aria-label={triggerProps["aria-label"] ?? "Previous slide"}
      data-disabled={disabled ? "" : undefined}
      disabled={disabled}
      icon={resolvedIcon}
      onClick={disabled ? undefined : triggerProps.onClick}
    />
  )
}

Carousel.Next = function CarouselNext({ className, icon }: CarouselNextProps) {
  const { api, size, orientation, dir } = useCarouselContext()
  const { nextTrigger } = carouselVariants()
  const triggerProps = api.getNextTriggerProps()
  const disabled = !api.canScrollNext || api.pageSnapPoints.length <= 1
  let resolvedIcon = icon
  if (!resolvedIcon || resolvedIcon === "token-icon-carousel-next") {
    resolvedIcon =
      dir === "rtl" ? "token-icon-carousel-prev" : "token-icon-carousel-next"
    if (orientation === "vertical") {
      resolvedIcon = "token-icon-carousel-next-vertical"
    }
  }

  return (
    <ActionIcon
      className={nextTrigger({ className })}
      size={toTriggerSize(size)}
      {...triggerProps}
      aria-disabled={disabled}
      aria-label={triggerProps["aria-label"] ?? "Next slide"}
      data-disabled={disabled ? "" : undefined}
      disabled={disabled}
      icon={resolvedIcon}
      onClick={disabled ? undefined : triggerProps.onClick}
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
      {api.pageSnapPoints.map((snapPoint, index) => (
        <Carousel.Indicator index={index} key={snapPoint} />
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
      aria-current={index === api.page ? "true" : undefined}
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
  controls,
}: CarouselControlProps) {
  const { api, orientation } = useCarouselContext()
  // Standard vertical controls occupy their own grid column: the rail must not
  // be constrained by a short image's aspect ratio or cover its content.
  const sideLayout =
    orientation === "vertical" &&
    controls !== "minimal" &&
    controlPosition !== "unset"
  const { control } = carouselVariants({
    controlPosition:
      controls === "minimal" || sideLayout ? "unset" : controlPosition,
    controls,
  })

  return (
    <div
      className={control({ className })}
      {...api.getControlProps()}
      data-carousel-layout={sideLayout ? "side" : undefined}
      data-carousel-leading={
        sideLayout && controlPosition === "top" ? "" : undefined
      }
    >
      {children}
    </div>
  )
}

// Keep native TypeScript declarations from hiding siblings behind a Root export alias.
Carousel.Root = Carousel satisfies typeof Carousel
